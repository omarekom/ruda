<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { selectedType, selectSlot, type HotbarState } from '../game/hotbar';
import type { SaveResult } from '../game/saving';
import { isArrowKey, moveFocus } from '../input/focusNavigation';
import GameControls from './GameControls.vue';
import GameHotbar from './GameHotbar.vue';
import PixelIcon from './PixelIcon.vue';
import ThemeToggle from './ThemeToggle.vue';

const NAME_SHOWN_MS = 1400;
const TOAST_SHOWN_MS = 1400;

const props = defineProps<{
  hotbar: HotbarState;
  lastSave: SaveResult | undefined;
  /** Whether another dialog has the keyboard; Escape then belongs to it. */
  blocked: boolean;
  debugOn: boolean;
}>();
const emit = defineEmits<{
  menu: [open: boolean];
  save: [];
  worlds: [];
  debug: [];
  start: [];
  /** Where the hotbar spans horizontally (left, right in pixels), whenever it changes. */
  hotbarSpan: [span: readonly [number, number]];
}>();
const { t } = useI18n();

type Overlay = 'menu' | 'controls';
const overlay = ref<Overlay>();
const showName = ref(false);
const toast = ref<string>();
let nameTimer: ReturnType<typeof setTimeout> | undefined;
let toastTimer: ReturnType<typeof setTimeout> | undefined;
const menu = useTemplateRef<HTMLElement>('menu');
const hotbarPanel = useTemplateRef<InstanceType<typeof GameHotbar>>('hotbarPanel');
let hotbarObserver: ResizeObserver | undefined;

function reportHotbarSpan(): void {
  const element = hotbarPanel.value?.$el;
  if (!(element instanceof HTMLElement)) return;
  const { left, right } = element.getBoundingClientRect();
  const origin = element.offsetParent?.getBoundingClientRect().left ?? 0;
  emit('hotbarSpan', [left - origin, right - origin]);
}

function menuButtons(): HTMLElement[] {
  return [...(menu.value?.querySelectorAll<HTMLElement>('button') ?? [])];
}

// The menu takes the keyboard as soon as it opens.
watch(overlay, async (next) => {
  if (next !== 'menu') return;
  await nextTick();
  menuButtons()[0]?.focus();
});

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
  if (props.blocked) return;
  if (event.key === 'Escape') {
    open(overlay.value === undefined ? 'menu' : undefined);
  } else if (overlay.value === 'menu' && isArrowKey(event.key)) {
    event.preventDefault();
    moveFocus(menuButtons(), event.key);
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
  hotbarObserver = new ResizeObserver(reportHotbarSpan);
  if (hotbarPanel.value?.$el instanceof HTMLElement) hotbarObserver.observe(hotbarPanel.value.$el);
  window.addEventListener('resize', reportHotbarSpan);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('resize', reportHotbarSpan);
  hotbarObserver?.disconnect();
  clearTimeout(nameTimer);
  clearTimeout(toastTimer);
});

function toggleDebug(): void {
  open(undefined);
  emit('debug');
}

function save(): void {
  open(undefined);
  emit('save');
}
</script>

<template>
  <div class="hud">
    <div class="corner">
      <ThemeToggle />
      <button
        type="button"
        class="blocky-button icon-button"
        :data-tip="t('game.menu.open')"
        :aria-label="t('game.menu.open')"
        @click="open('menu')"
      >
        <PixelIcon name="menu" />
      </button>
    </div>

    <p class="toast" :class="{ shown: toast }" role="status">{{ toast }}</p>
    <p class="block-name" :class="{ shown: showName }">
      {{ t(`blocks.${selectedType(hotbar)}`) }}
    </p>
    <GameHotbar
      ref="hotbarPanel"
      class="hotbar"
      :state="hotbar"
      @select="(index) => selectSlot(hotbar, index)"
    />

    <div v-if="overlay === 'menu'" class="shade">
      <div ref="menu" class="menu" role="dialog" :aria-label="t('game.menu.title')">
        <h1>{{ t('game.menu.title') }}</h1>
        <button type="button" class="blocky-button" @click="open(undefined)">
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
          <button type="button" class="blocky-button" @click="toggleDebug">
            {{ t(debugOn ? 'game.menu.debugOff' : 'game.menu.debugOn') }}
          </button>
        </div>
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
