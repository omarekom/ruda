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
import type { Mode } from '../game/mode';
import type { OpenWorld } from '../game/openWorld';
import type { SaveResult } from '../game/saving';
import { sketchDarkSkin, sketchLightSkin } from '../renderer/skins/sketch';
import type { Skin } from '../renderer/skins/skin';
import { downloadRudaFile } from '../storage/files';
import type { WorldStore } from '../storage/worldStore';
import { gameSkin } from '../gameLook';
import { isDark } from '../theme';
import ConfirmDialog from './ConfirmDialog.vue';
import ExpertHud, { type SaveStatus } from './ExpertHud.vue';
import GameHud from './GameHud.vue';

const AUTOSAVE_INTERVAL_MS = 30_000;
/** Half of the flip between modes: the old one turns away, then the new one turns in. */
const FLIP_HALF_MS = 230;

const props = defineProps<{ store: WorldStore; world: OpenWorld; mode: Mode }>();
const emit = defineEmits<{ close: []; switchMode: [mode: Mode]; startScreen: [] }>();
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
const gameMenuOpen = ref(false);
/** Expert mode's own run/pause switch and speed; game mode always runs at normal speed. */
const expertPaused = ref(false);
const expertSpeed = ref(1);
/** The mode on screen; it lags behind the `mode` prop during the flip animation. */
const shownMode = ref<Mode>(props.mode);
const flip = ref<'out' | 'in'>();
const game = shallowRef<Game>();
let autosaveTimer: ReturnType<typeof setInterval> | undefined;
let flipTimer: ReturnType<typeof setTimeout> | undefined;

const skin = computed<Skin>(() => {
  if (shownMode.value === 'game') return gameSkin.value;
  return isDark.value ? sketchDarkSkin : sketchLightSkin;
});
const paused = computed(() =>
  shownMode.value === 'game' ? gameMenuOpen.value : expertPaused.value,
);
const speed = computed(() => (shownMode.value === 'expert' ? expertSpeed.value : 1));
const saveStatus = computed<SaveStatus>(() => {
  if (saving.value) return 'saving';
  if (!dirty.value) return 'saved';
  return lastSave.value?.ok === false ? 'failed' : 'unsaved';
});
const inputEnabled = computed(() => !paused.value && leavingTo.value === undefined);

watch(skin, (next) => game.value?.setSkin(next));
watch(paused, (next) => {
  if (game.value) game.value.paused = next;
});
watch(speed, (next) => {
  if (game.value) game.value.speed = next;
});
watch(inputEnabled, (next) => game.value?.setInputEnabled(next));

watch(
  () => props.mode,
  (next) => {
    clearTimeout(flipTimer);
    flip.value = 'out';
    flipTimer = setTimeout(() => {
      shownMode.value = next;
      gameMenuOpen.value = false;
      flip.value = 'in';
      flipTimer = setTimeout(() => (flip.value = undefined), FLIP_HALF_MS + 70);
    }, FLIP_HALF_MS);
  },
);

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
  game.value = new Game(canvas.value, hotbar, simulation, onEdit, skin.value);
  game.value.paused = paused.value;
  game.value.speed = speed.value;
  game.value.start();
  autosaveTimer = setInterval(() => void autosave(), AUTOSAVE_INTERVAL_MS);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('beforeunload', onBeforeUnload);
  document.addEventListener('visibilitychange', onVisibilityChange);
});

onBeforeUnmount(() => {
  game.value?.stop();
  clearInterval(autosaveTimer);
  clearTimeout(flipTimer);
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('beforeunload', onBeforeUnload);
  document.removeEventListener('visibilitychange', onVisibilityChange);
});
</script>

<template>
  <div
    class="world-screen"
    :class="[shownMode, flip && `flip-${flip}`, { sketchy: shownMode === 'expert', dark: isDark }]"
  >
    <div class="viewport">
      <canvas ref="canvas" class="world" />
    </div>
    <GameHud
      v-if="shownMode === 'game'"
      :hotbar="hotbar"
      :last-save="lastSave"
      :blocked="leavingTo !== undefined"
      @menu="(open) => (gameMenuOpen = open)"
      @save="save"
      @worlds="leave('worlds')"
      @expert="emit('switchMode', 'expert')"
      @start="leave('start')"
    />
    <ExpertHud
      v-else-if="game"
      :game="game"
      :hotbar="hotbar"
      :skin="skin"
      :world-name="world.name"
      :save-status="saveStatus"
      :paused="expertPaused"
      :speed="expertSpeed"
      @save="save"
      @export="downloadRudaFile(world.name, serialize())"
      @worlds="leave('worlds')"
      @start="leave('start')"
      @to-game="emit('switchMode', 'game')"
      @pause="(next) => (expertPaused = next)"
      @step="game.step()"
      @speed="(next) => (expertSpeed = next)"
    />
    <ConfirmDialog
      v-if="leavingTo"
      :blocky="shownMode === 'game'"
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
  display: grid;
  grid-template: 'view' 1fr / 1fr;
  height: 100%;
  backface-visibility: hidden;
}

.world-screen.expert {
  grid-template:
    'header header header' 56px
    'left view right' 1fr
    'status status status' 32px
    / 220px 1fr 280px;
}

.viewport {
  position: relative;
  grid-area: view;
  min-width: 0;
  min-height: 0;
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

.flip-out {
  animation: flip-out 0.23s ease-in forwards;
}

.flip-in {
  animation: flip-in 0.3s ease-out;
}

@keyframes flip-out {
  to {
    transform: perspective(1600px) rotateY(90deg);
    filter: brightness(0.6);
  }
}

@keyframes flip-in {
  from {
    transform: perspective(1600px) rotateY(-90deg);
    filter: brightness(0.6);
  }
}

@media (prefers-reduced-motion: reduce) {
  .flip-out,
  .flip-in {
    animation: none;
  }
}
</style>
