<script setup lang="ts">
import { serializeWorld, Simulation } from '@ruda/core';
import { onBeforeUnmount, onMounted, reactive, ref, useTemplateRef } from 'vue';
import { useI18n } from 'vue-i18n';
import type { OpenWorld } from '../game/openWorld';
import { Game } from '../game/game';
import { createHotbarState, selectSlot } from '../game/hotbar';
import { downloadRudaFile } from '../storage/files';
import type { WorldStore } from '../storage/worldStore';
import ConfirmDialog from './ConfirmDialog.vue';
import HotbarPanel from './HotbarPanel.vue';

const AUTOSAVE_INTERVAL_MS = 30_000;

const props = defineProps<{ store: WorldStore; world: OpenWorld }>();
const emit = defineEmits<{ close: [] }>();
const { t } = useI18n();

const simulation = new Simulation(props.world.world);
const hotbar = reactive(createHotbarState());
const canvas = useTemplateRef<HTMLCanvasElement>('canvas');
/** Edits not yet in the world's real save. */
const dirty = ref(props.world.restored);
/** Edits not yet in the recovery copy. */
let recoveryStale = false;
const saving = ref(false);
const saveFailed = ref(false);
const leaving = ref(false);
let game: Game | undefined;
let autosaveTimer: ReturnType<typeof setInterval> | undefined;

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
  try {
    await props.store.save(props.world.id, props.world.name, serialize());
    dirty.value = false;
    recoveryStale = false;
    saveFailed.value = false;
    return true;
  } catch {
    saveFailed.value = true;
    return false;
  } finally {
    saving.value = false;
  }
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

function requestClose(): void {
  if (dirty.value) leaving.value = true;
  else emit('close');
}

async function onLeaveChoice(choice: 'save' | 'discard' | 'cancel'): Promise<void> {
  leaving.value = false;
  if (choice === 'cancel') return;
  if (choice === 'save' && !(await save())) return;
  if (choice === 'discard') await props.store.discardRecovery(props.world.id);
  emit('close');
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
  game = new Game(canvas.value, hotbar, simulation, onEdit);
  game.start();
  autosaveTimer = setInterval(() => void autosave(), AUTOSAVE_INTERVAL_MS);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('beforeunload', onBeforeUnload);
  document.addEventListener('visibilitychange', onVisibilityChange);
});

onBeforeUnmount(() => {
  game?.stop();
  clearInterval(autosaveTimer);
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('beforeunload', onBeforeUnload);
  document.removeEventListener('visibilitychange', onVisibilityChange);
});
</script>

<template>
  <div class="editor">
    <canvas ref="canvas" class="world" />
    <header class="bar">
      <button type="button" @click="requestClose">← {{ t('editor.back') }}</button>
      <span class="name">{{ world.name }}</span>
      <span class="status" :class="{ error: saveFailed }" role="status">
        {{
          saveFailed
            ? t('editor.saveFailed')
            : saving
              ? t('editor.saving')
              : dirty
                ? t('editor.unsaved')
                : t('editor.saved')
        }}
      </span>
      <button type="button" class="primary" :disabled="saving" @click="save">
        {{ t('editor.save') }}
      </button>
      <button type="button" @click="downloadRudaFile(world.name, serialize())">
        {{ t('editor.export') }}
      </button>
    </header>
    <p class="help">{{ t('help.controls') }}</p>
    <HotbarPanel :state="hotbar" @select="(index) => selectSlot(hotbar, index)" />
    <ConfirmDialog
      v-if="leaving"
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
.editor {
  position: relative;
  height: 100%;
}

.world {
  display: block;
  width: 100%;
  height: 100%;
  cursor: crosshair;
  touch-action: none;
}

.bar {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.55);
}

.name {
  max-width: 240px;
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status {
  min-width: 110px;
  font-size: 12px;
  opacity: 0.7;
}

.status.error {
  color: #ff8a80;
  opacity: 1;
}

.help {
  position: absolute;
  top: 52px;
  left: 12px;
  margin: 0;
  font-size: 12px;
  opacity: 0.6;
  pointer-events: none;
}
</style>
