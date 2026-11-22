<script setup lang="ts">
import { HISTORY_LIMIT, serializeWorld, Simulation } from '@ruda/core';
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
import { Game, type LabelPlacement } from '../game/game';
import { createHotbarState } from '../game/hotbar';
import type { OpenWorld } from '../game/openWorld';
import type { Notice } from '../game/notice';
import { useKeyHelp, type KeyRow } from '../input/keyHelp';
import { NEW_WORLD_CELL_SIZE } from '../renderer/camera';
import type { WorldStore } from '../storage/worldStore';
import { worldSkin } from '../theme';
import ConfirmDialog from './ConfirmDialog.vue';
import DebugHud from './DebugHud.vue';
import GameHud from './GameHud.vue';
import LabelEditor from './LabelEditor.vue';

const AUTOSAVE_INTERVAL_MS = 30_000;
const GAME_KEYS: readonly KeyRow[] = [
  ['move', 'WASD', 'arrows'],
  ['use', 'space'],
  ['break', 'delete'],
  ['zoom', '+', '−'],
  ['turn', 'R'],
  ['label', 'T'],
  ['slot', '1–9', '0'],
  ['menu', 'Esc'],
  ['save', 'Ctrl+S'],
  ['debug', '/'],
  ['help', '?'],
];
const DEBUG_KEYS: readonly KeyRow[] = [
  ['pause', 'P'],
  ['step', '.'],
  ['panels', 'I', 'C', 'M'],
  ['undo', 'Z'],
  ['redo', 'Shift+Z'],
];
const MENU_KEYS: readonly KeyRow[] = [
  ['buttons', 'arrows'],
  ['choose', 'Enter'],
  ['resume', 'Esc'],
  ['help', '?'],
];
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
const notice = ref<Notice>();
/** Where to go once the player has decided about unsaved changes. */
const leavingTo = ref<'worlds' | 'start'>();
const menuOpen = ref(false);
const debugOn = ref(false);
/** Debug mode's own control over time; without it the game runs at normal speed. */
const debugPaused = ref(false);
const debugSpeed = ref(1);
const game = shallowRef<Game>();
/** The label being written or edited, while its editor is open. */
const editingLabel = shallowRef<{
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly placement: LabelPlacement;
}>();
let autosaveTimer: ReturnType<typeof setInterval> | undefined;

const paused = computed(() => menuOpen.value || (debugOn.value && debugPaused.value));
const speed = computed(() => (debugOn.value ? debugSpeed.value : 1));
const inputEnabled = computed(
  () => !menuOpen.value && leavingTo.value === undefined && editingLabel.value === undefined,
);

useKeyHelp(() => {
  if (menuOpen.value) return MENU_KEYS;
  return debugOn.value ? [...GAME_KEYS, ...DEBUG_KEYS] : GAME_KEYS;
});

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
  return serializeWorld(simulation.blocks, props.world.name, props.world.created);
}

function showNotice(key: string, options: Pick<Notice, 'values' | 'warning'> = {}): void {
  notice.value = { key, ...options, at: Date.now() };
}

/**
 * Flashes what undo or redo did, so a key pressed by mistake does not go unnoticed. When
 * there is nothing left, the warning says why: no edits at all, or only older ones dropped.
 */
function undoOrRedo(action: 'undo' | 'redo'): void {
  const current = game.value;
  if (!current) return;
  if (action === 'undo' ? current.undo() : current.redo()) {
    showNotice(action === 'undo' ? 'game.history.undone' : 'game.history.redone');
  } else if (action === 'redo') {
    showNotice('game.history.redoNothing', { warning: true });
  } else if (current.undoLimitReached) {
    showNotice('game.history.undoLimit', { values: { count: HISTORY_LIMIT }, warning: true });
  } else {
    showNotice('game.history.undoNothing', { warning: true });
  }
}

function startLabelEdit(x: number, y: number, text: string): void {
  const current = game.value;
  if (!current) return;
  if (!current.labelsShown) {
    showNotice('game.label.zoomIn', { warning: true });
    return;
  }
  current.setEditingLabel([x, y]);
  editingLabel.value = { x, y, text, placement: current.labelPlacement(x, y) };
}

/** An empty text removes the label; undefined means the edit was cancelled. */
function finishLabelEdit(text: string | undefined): void {
  const target = editingLabel.value;
  editingLabel.value = undefined;
  game.value?.setEditingLabel(undefined);
  if (target && text !== undefined) game.value?.setLabel(target.x, target.y, text);
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
    // Reported to the player through the notice.
  } finally {
    saving.value = false;
  }
  if (ok) showNotice('game.saved');
  else showNotice('game.saveFailed', { warning: true });
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

/**
 * Undo and redo keys, only in debug mode: Z or Ctrl+Z undoes, Shift+Z or Ctrl+Shift+Z
 * redoes. Read from the typed letter, so they follow the keyboard layout.
 */
function historyAction(event: KeyboardEvent): 'undo' | 'redo' | undefined {
  if (event.altKey || event.key.toLowerCase() !== 'z') return undefined;
  return event.shiftKey ? 'redo' : 'undo';
}

function onKeyDown(event: KeyboardEvent): void {
  const typing = event.target instanceof HTMLInputElement;
  const action = debugOn.value && inputEnabled.value && !typing ? historyAction(event) : undefined;
  if ((event.ctrlKey || event.metaKey) && event.code === 'KeyS') {
    event.preventDefault();
    void save();
  } else if (action) {
    event.preventDefault();
    undoOrRedo(action);
  } else if (event.key === '/' && inputEnabled.value && !typing) {
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
  game.value = new Game(canvas.value, hotbar, simulation, worldSkin.value, {
    edit: onEdit,
    editLabel: startLabelEdit,
  });
  if (simulation.blocks.blockCount === 0) game.value.camera.setCellSize(NEW_WORLD_CELL_SIZE);
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
      @exit="toggleDebug"
    />
    <LabelEditor
      v-if="editingLabel"
      :text="editingLabel.text"
      :placement="editingLabel.placement"
      @done="finishLabelEdit"
    />
    <GameHud
      :hotbar="hotbar"
      :notice="notice"
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
