<script setup lang="ts">
import { serializeWorld, Simulation } from '@ruda/core';
import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  shallowRef,
  useTemplateRef,
  watch,
} from 'vue';
import { useI18n } from 'vue-i18n';
import { Game } from '../game/game';
import { createHotbarState } from '../game/hotbar';
import type { OpenWorld } from '../game/openWorld';
import type { SaveResult } from '../game/saving';
import type { WorldStore } from '../storage/worldStore';
import { worldSkin } from '../theme';
import ConfirmDialog from './ConfirmDialog.vue';
import DebugHud from './DebugHud.vue';
import GameHud from './GameHud.vue';

const AUTOSAVE_INTERVAL_MS = 30_000;
/** How far beside the hotbar the bottom edge still does not scroll. */
const HOTBAR_EDGE_MARGIN_PX = 64;

const props = defineProps<{ store: WorldStore; world: OpenWorld }>();
const emit = defineEmits<{ close: []; startScreen: [] }>();
const { t } = useI18n();

const simulation = new Simulation(props.world.world);
const hotbar = reactive(createHotbarState());
const canvas = useTemplateRef<HTMLCanvasElement>('canvas');
/** Edits not yet in the world's real save. */
const dirty = ref(props.world.restored);
/** Edits not yet in the recovery copy. */
let recoveryStale = false;
const saving = ref(false);
const lastSave = ref<SaveResult>();
/** Where to go once the player has decided about unsaved changes. */
const leavingTo = ref<'worlds' | 'start'>();
const menuOpen = ref(false);
const debugOn = ref(false);
/** Debug mode's own control over time; without it the game runs at normal speed. */
const debugPaused = ref(false);
const debugSpeed = ref(1);
const game = shallowRef<Game>();
let autosaveTimer: ReturnType<typeof setInterval> | undefined;

const paused = computed(() => menuOpen.value || (debugOn.value && debugPaused.value));
const speed = computed(() => (debugOn.value ? debugSpeed.value : 1));
const inputEnabled = computed(() => !menuOpen.value && leavingTo.value === undefined);

watch(worldSkin, (next) => game.value?.setSkin(next));
watch(paused, (next) => {
  if (game.value) game.value.paused = next;
});
watch(speed, (next) => {
  if (game.value) game.value.speed = next;
});
watch(inputEnabled, (next) => game.value?.setInputEnabled(next));

/** Kept here too, since the hotbar can report before the game exists. */
let bottomEdgeGap: readonly [number, number] | undefined;

function onHotbarSpan([left, right]: readonly [number, number]): void {
  bottomEdgeGap = [left - HOTBAR_EDGE_MARGIN_PX, right + HOTBAR_EDGE_MARGIN_PX];
  if (game.value) game.value.bottomEdgeGap = bottomEdgeGap;
}

/** Turning debug mode off returns time to normal. */
function toggleDebug(): void {
  debugOn.value = !debugOn.value;
  debugPaused.value = false;
  debugSpeed.value = 1;
}

function serialize(): string {
  return serializeWorld(simulation.blocks, props.world.name);
}

function onEdit(): void {
  dirty.value = true;
  recoveryStale = true;
}

async function save(): Promise<boolean> {
  if (saving.value) return false;
  saving.value = true;
  let ok = false;
  try {
    await props.store.save(props.world.id, props.world.name, serialize());
    dirty.value = false;
    recoveryStale = false;
    ok = true;
  } catch {
    // Reported to the player through lastSave.
  } finally {
    saving.value = false;
  }
  lastSave.value = { ok, at: Date.now() };
  return ok;
}

async function autosave(): Promise<void> {
  if (!recoveryStale) return;
  recoveryStale = false;
  try {
    await props.store.saveRecovery(props.world.id, serialize());
  } catch {
    recoveryStale = true;
  }
}

function leave(target: 'worlds' | 'start'): void {
  if (dirty.value) leavingTo.value = target;
  else finishLeaving(target);
}

function finishLeaving(target: 'worlds' | 'start'): void {
  if (target === 'worlds') emit('close');
  else emit('startScreen');
}

async function onLeaveChoice(choice: 'save' | 'discard' | 'cancel'): Promise<void> {
  const target = leavingTo.value;
  leavingTo.value = undefined;
  if (choice === 'cancel' || !target) return;
  if (choice === 'save' && !(await save())) return;
  if (choice === 'discard') await props.store.discardRecovery(props.world.id);
  finishLeaving(target);
}

function onKeyDown(event: KeyboardEvent): void {
  if ((event.ctrlKey || event.metaKey) && event.code === 'KeyS') {
    event.preventDefault();
    void save();
  } else if (
    event.key === '/' &&
    inputEnabled.value &&
    !(event.target instanceof HTMLInputElement)
  ) {
    event.preventDefault();
    toggleDebug();
  }
}

function onBeforeUnload(event: BeforeUnloadEvent): void {
  if (dirty.value) event.preventDefault();
}

function onVisibilityChange(): void {
  if (document.hidden) void autosave();
}

onMounted(() => {
  if (!canvas.value) return;
  game.value = new Game(canvas.value, hotbar, simulation, onEdit, worldSkin.value);
  game.value.paused = paused.value;
  game.value.speed = speed.value;
  game.value.bottomEdgeGap = bottomEdgeGap;
  game.value.start();
  autosaveTimer = setInterval(() => void autosave(), AUTOSAVE_INTERVAL_MS);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('beforeunload', onBeforeUnload);
  document.addEventListener('visibilitychange', onVisibilityChange);
});

onBeforeUnmount(() => {
  game.value?.stop();
  clearInterval(autosaveTimer);
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('beforeunload', onBeforeUnload);
  document.removeEventListener('visibilitychange', onVisibilityChange);
});
</script>

<template>
  <div class="world-screen">
    <canvas ref="canvas" class="world" />
    <DebugHud
      v-if="debugOn && game"
      :game="game"
      :skin="worldSkin"
      :paused="debugPaused"
      :speed="debugSpeed"
      :active="inputEnabled"
      @pause="(next) => (debugPaused = next)"
      @speed="(next) => (debugSpeed = next)"
      @step="game.step()"
    />
    <GameHud
      :hotbar="hotbar"
      :last-save="lastSave"
      :blocked="leavingTo !== undefined"
      :debug-on="debugOn"
      @menu="(open) => (menuOpen = open)"
      @save="save"
      @worlds="leave('worlds')"
      @debug="toggleDebug"
      @start="leave('start')"
      @hotbar-span="onHotbarSpan"
    />
    <ConfirmDialog
      v-if="leavingTo"
      blocky
      :message="t('editor.leavePrompt', { name: world.name })"
      :actions="[
        { value: 'cancel', label: t('dialog.cancel') },
        { value: 'discard', label: t('editor.discard') },
        { value: 'save', label: t('dialog.save'), primary: true },
      ]"
      cancel="cancel"
      @choose="onLeaveChoice"
    />
  </div>
</template>

<style scoped>
.world-screen {
  position: relative;
  height: 100%;
}

.world {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  cursor: crosshair;
  touch-action: none;
}
</style>
