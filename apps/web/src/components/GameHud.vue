<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { selectedType, selectSlot, type HotbarState } from '../game/hotbar';
import type { SaveResult } from '../game/saving';
import { gameLook, nextGameLook } from '../gameLook';
import GameControls from './GameControls.vue';
import GameHotbar from './GameHotbar.vue';

const NAME_SHOWN_MS = 1400;
const TOAST_SHOWN_MS = 1400;

const props = defineProps<{
  hotbar: HotbarState;
  lastSave: SaveResult | undefined;
  /** Whether another dialog has the keyboard; Escape then belongs to it. */
  blocked: boolean;
}>();
const emit = defineEmits<{
  menu: [open: boolean];
  save: [];
  worlds: [];
  expert: [];
  start: [];
}>();
const { t } = useI18n();

type Overlay = 'menu' | 'controls';
const overlay = ref<Overlay>();
const showName = ref(false);
const toast = ref<string>();
let nameTimer: ReturnType<typeof setTimeout> | undefined;
let toastTimer: ReturnType<typeof setTimeout> | undefined;

function open(next: Overlay | undefined): void {
  overlay.value = next;
  emit('menu', next !== undefined);
}

// The name of the held block pops up briefly whenever the selection changes.
watch(
  () => props.hotbar.selected,
  () => {
    showName.value = true;
    clearTimeout(nameTimer);
    nameTimer = setTimeout(() => (showName.value = false), NAME_SHOWN_MS);
  },
);

watch(
  () => props.lastSave,
  (result) => {
    if (!result) return;
    toast.value = t(result.ok ? 'game.saved' : 'game.saveFailed');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast.value = undefined), TOAST_SHOWN_MS);
  },
);

function onKeyDown(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || props.blocked) return;
  open(overlay.value === undefined ? 'menu' : undefined);
}

onMounted(() => window.addEventListener('keydown', onKeyDown));
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown);
  clearTimeout(nameTimer);
  clearTimeout(toastTimer);
});

function save(): void {
  open(undefined);
  emit('save');
}
</script>

<template>
  <div class="hud">
    <div class="corner">
      <button type="button" class="blocky-button" @click="emit('expert')">
        {{ t('modes.expert') }}
      </button>
      <button
        type="button"
        class="blocky-button"
        :title="t('game.menu.open')"
        :aria-label="t('game.menu.open')"
        @click="open('menu')"
      >
        ≡
      </button>
    </div>

    <p class="toast" :class="{ shown: toast }" role="status">{{ toast }}</p>
    <p class="block-name" :class="{ shown: showName }">
      {{ t(`blocks.${selectedType(hotbar)}`) }}
    </p>
    <GameHotbar class="hotbar" :state="hotbar" @select="(index) => selectSlot(hotbar, index)" />

    <div v-if="overlay === 'menu'" class="shade">
      <div class="menu" role="dialog" :aria-label="t('game.menu.title')">
        <h1>{{ t('game.menu.title') }}</h1>
        <button type="button" class="blocky-button" autofocus @click="open(undefined)">
          {{ t('game.menu.resume') }}
        </button>
        <div class="row">
          <button type="button" class="blocky-button" @click="save">
            {{ t('game.menu.save') }}
          </button>
          <button type="button" class="blocky-button" @click="emit('worlds')">
            {{ t('game.menu.worlds') }}
          </button>
        </div>
        <div class="row">
          <button type="button" class="blocky-button" @click="open('controls')">
            {{ t('game.menu.controls') }}
          </button>
          <button type="button" class="blocky-button" @click="emit('expert')">
            {{ t('modes.expert') }}
          </button>
        </div>
        <button type="button" class="blocky-button" @click="nextGameLook">
          {{ t('game.menu.look', { name: t(`game.looks.${gameLook}`) }) }}
        </button>
        <button type="button" class="blocky-button" @click="emit('start')">
          {{ t('game.menu.startScreen') }}
        </button>
      </div>
    </div>

    <GameControls v-if="overlay === 'controls'" @done="open('menu')" />
  </div>
</template>

<style scoped>
.hud {
  position: absolute;
  inset: 0;
  pointer-events: none;
  font-family: var(--font-retro);
}

.hud > * {
  pointer-events: auto;
}

.corner {
  position: absolute;
  top: 14px;
  right: 14px;
  display: flex;
  gap: 8px;
}

.corner .blocky-button {
  padding: 4px 14px;
  font-size: 26px;
}

.hotbar {
  position: absolute;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
}

.block-name,
.toast {
  position: absolute;
  left: 50%;
  margin: 0;
  transform: translateX(-50%);
  opacity: 0;
  transition: opacity 0.4s;
  pointer-events: none;
}

.block-name {
  bottom: 86px;
  color: #fff;
  font: 30px var(--font-pixel);
  text-shadow: 3px 3px #000;
}

.toast {
  top: 70px;
  color: #8f8;
  font-size: 30px;
  text-shadow: 2px 2px #000;
}

.shown {
  opacity: 1;
}

.shade {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.6);
}

.menu {
  display: grid;
  gap: 10px;
  width: min(480px, 90vw);
  text-align: center;
}

.menu h1 {
  margin: 0 0 12px;
  color: #fff;
  font: 40px var(--font-pixel);
  text-shadow: 3px 3px #000;
}

.menu .blocky-button {
  padding: 8px;
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
</style>
