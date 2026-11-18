<script setup lang="ts">
import type { BlockType } from '@ruda/core';
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useTemplateRef } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Game } from '../game/game';
import { inspect, type Inspection } from '../game/inspect';
import { MAX_SPEED } from '../game/tickLoop';
import { APP_VERSION } from '../version';
import { DEFAULT_CELL_SIZE } from '../renderer/camera';
import { drawMinimap, minimapToWorld } from '../renderer/minimap';
import type { Skin } from '../renderer/skins/skin';

const INFO_INTERVAL_MS = 100;
const RATE_INTERVAL_MS = 500;
const MINIMAP_INTERVAL_MS = 200;
const CONTENTS_INTERVAL_MS = 1000;
const PRESETS = [
  { speed: 1, label: '▶' },
  { speed: 3, label: '▶▶' },
  { speed: 10, label: '▶▶▶' },
] as const;
const DIRECTION_NAMES = ['north', 'east', 'south', 'west'] as const;

type Panel = 'info' | 'contents' | 'map';
const PANELS: readonly { readonly panel: Panel; readonly key: string; readonly code: string }[] = [
  { panel: 'info', key: 'I', code: 'KeyI' },
  { panel: 'contents', key: 'C', code: 'KeyC' },
  { panel: 'map', key: 'M', code: 'KeyM' },
];

const props = defineProps<{
  game: Game;
  skin: Skin;
  paused: boolean;
  /** Ticks per second as a multiple of the normal rate; MAX_SPEED for as fast as possible. */
  speed: number;
  /** Whether the panel keys work; off while a menu or dialog is open. */
  active: boolean;
}>();
const emit = defineEmits<{ pause: [paused: boolean]; speed: [speed: number]; step: [] }>();
const { t } = useI18n();

const shown = ref<Record<Panel, boolean>>({ info: true, contents: false, map: false });
const tick = ref(0);
const rate = ref(0);
const cell = shallowRef<readonly [number, number]>();
const inspection = shallowRef<Inspection>();
const camera = ref({ x: 0, y: 0, zoom: 100 });
const counts = shallowRef<readonly (readonly [BlockType, number])[]>([]);
const total = ref(0);
const customSpeed = ref('');
const minimap = useTemplateRef<HTMLCanvasElement>('minimap');
const timers: ReturnType<typeof setInterval>[] = [];
let rateSample = { tick: 0, at: 0 };

const speedText = computed(() =>
  props.speed === MAX_SPEED ? t('debug.time.max') : `${props.speed}×`,
);

function refreshInfo(): void {
  const { game } = props;
  tick.value = game.tickCount;
  cell.value = game.hoveredCell();
  const block = cell.value && game.blocks.get(...cell.value);
  inspection.value = cell.value && block && inspect(...cell.value, block, game.power);
  const [x, y] = game.camera.center;
  camera.value = { x, y, zoom: Math.round((game.camera.cellSize / DEFAULT_CELL_SIZE) * 100) };
}

/** Ticks actually run per second, which falls short of the speed when the browser can't keep up. */
function refreshRate(): void {
  const now = performance.now();
  const { tickCount } = props.game;
  rate.value = ((tickCount - rateSample.tick) * 1000) / Math.max(1, now - rateSample.at);
  rateSample = { tick: tickCount, at: now };
}

function refreshContents(): void {
  if (!shown.value.contents) return;
  const byType = new Map<BlockType, number>();
  props.game.blocks.forEach((_x, _y, block) => {
    byType.set(block.type, (byType.get(block.type) ?? 0) + 1);
  });
  counts.value = [...byType].sort(([, a], [, b]) => b - a);
  total.value = props.game.blocks.blockCount;
}

function refreshMinimap(): void {
  if (minimap.value) drawMinimap(minimap.value, props.game.blocks, props.game.camera, props.skin);
}

function onMinimapClick(event: MouseEvent): void {
  if (!minimap.value) return;
  props.game.camera.centerOn(
    ...minimapToWorld(minimap.value, props.game.camera, event.offsetX, event.offsetY),
  );
}

function toggle(panel: Panel): void {
  shown.value[panel] = !shown.value[panel];
  if (panel === 'contents') refreshContents();
}

function run(speed: number): void {
  emit('speed', speed);
  emit('pause', false);
}

function applyCustomSpeed(): void {
  const speed = Number(customSpeed.value.replace(',', '.'));
  if (Number.isFinite(speed) && speed > 0) run(speed);
  customSpeed.value = '';
}

function stateText(state: NonNullable<Inspection['state']>): string {
  const key = `debug.state.${state.key}`;
  const ticks = state.values?.ticks;
  return ticks === undefined ? t(key) : t(key, { ticks }, ticks);
}

const blockText = computed(() => {
  const found = inspection.value;
  if (!found) return '–';
  const parts = [t(`blocks.${found.type}`)];
  if (found.facing !== undefined)
    parts.push(t(`debug.directions.${DIRECTION_NAMES[found.facing]}`));
  if (found.state) parts.push(stateText(found.state));
  return parts.join(' · ');
});

function onKeyDown(event: KeyboardEvent): void {
  if (!props.active || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target instanceof HTMLInputElement) return;
  const entry = PANELS.find(({ code }) => code === event.code);
  if (entry) toggle(entry.panel);
}

onMounted(() => {
  rateSample = { tick: props.game.tickCount, at: performance.now() };
  refreshInfo();
  timers.push(
    setInterval(refreshInfo, INFO_INTERVAL_MS),
    setInterval(refreshRate, RATE_INTERVAL_MS),
    setInterval(refreshMinimap, MINIMAP_INTERVAL_MS),
    setInterval(refreshContents, CONTENTS_INTERVAL_MS),
  );
  window.addEventListener('keydown', onKeyDown);
});

onBeforeUnmount(() => {
  timers.forEach(clearInterval);
  window.removeEventListener('keydown', onKeyDown);
});
</script>

<template>
  <div class="debug">
    <dl v-if="shown.info" class="info">
      <dt class="title">{{ t('debug.title') }}</dt>
      <dd class="title muted">{{ t('debug.closeHint') }}</dd>
      <dt>{{ t('debug.version') }}</dt>
      <dd>
        {{ t('app.title') }} <b>{{ APP_VERSION }}</b>
      </dd>
      <dt>{{ t('debug.tick') }}</dt>
      <dd>
        <b>{{ tick }}</b>
        <span v-if="paused" class="muted"> {{ t('debug.paused') }}</span>
      </dd>
      <dt>{{ t('debug.speed') }}</dt>
      <dd>
        {{ speedText }} <span class="muted">· {{ rate.toFixed(1) }} t/s</span>
      </dd>
      <dt>{{ t('debug.cursor') }}</dt>
      <dd>
        <template v-if="cell"
          >x <b>{{ cell[0] }}</b> y <b>{{ cell[1] }}</b></template
        >
        <template v-else>–</template>
      </dd>
      <dt>{{ t('debug.block') }}</dt>
      <dd>{{ blockText }}</dd>
      <dt>{{ t('debug.camera') }}</dt>
      <dd>
        x {{ camera.x.toFixed(1) }} y {{ camera.y.toFixed(1) }}
        <span class="muted">· {{ camera.zoom }} %</span>
      </dd>
    </dl>

    <div class="time blocky-panel" role="group" :aria-label="t('debug.time.label')">
      <button
        type="button"
        :class="{ on: paused }"
        :data-tip="t('debug.time.pause')"
        :aria-label="t('debug.time.pause')"
        @click="emit('pause', !paused)"
      >
        ⏸
      </button>
      <button
        v-for="preset in PRESETS"
        :key="preset.speed"
        type="button"
        :class="{ on: !paused && speed === preset.speed }"
        :data-tip="t('debug.time.speed', { speed: preset.speed })"
        :aria-label="t('debug.time.speed', { speed: preset.speed })"
        @click="run(preset.speed)"
      >
        {{ preset.label }}
      </button>
      <button
        type="button"
        class="wide"
        :class="{ on: !paused && speed === MAX_SPEED }"
        :data-tip="t('debug.time.maxHint')"
        @click="run(MAX_SPEED)"
      >
        {{ t('debug.time.max') }}
      </button>
      <form class="custom" @submit.prevent="applyCustomSpeed">
        <input
          v-model="customSpeed"
          inputmode="decimal"
          :placeholder="String(speed === MAX_SPEED ? '' : speed)"
          :aria-label="t('debug.time.custom')"
        />
        <span>×</span>
      </form>
      <button
        type="button"
        :disabled="!paused"
        :data-tip="t('debug.time.step')"
        :aria-label="t('debug.time.step')"
        @click="emit('step')"
      >
        ⏭
      </button>
    </div>

    <div class="bottom">
      <section v-if="shown.map" class="panel blocky-panel">
        <h2>{{ t('debug.map.title') }}</h2>
        <canvas
          ref="minimap"
          class="minimap"
          :data-tip="t('debug.map.hint')"
          @click="onMinimapClick"
        />
      </section>
      <section v-if="shown.contents" class="panel blocky-panel">
        <h2>{{ t('debug.contents.title') }}</h2>
        <dl class="counts">
          <template v-for="[type, count] in counts" :key="type">
            <dt>{{ t(`blocks.${type}`) }}</dt>
            <dd>{{ count }}</dd>
          </template>
          <dt class="total">{{ t('debug.contents.total') }}</dt>
          <dd class="total">{{ total }}</dd>
        </dl>
      </section>
      <nav class="switches" :aria-label="t('debug.panels')">
        <button
          v-for="{ panel, key } in PANELS"
          :key="panel"
          type="button"
          :class="{ on: shown[panel] }"
          :aria-pressed="shown[panel]"
          @click="toggle(panel)"
        >
          <kbd>{{ key }}</kbd>{{ t(`debug.panelNames.${panel}`) }}
        </button>
      </nav>
    </div>
  </div>
</template>

<style scoped>
.debug {
  position: absolute;
  inset: 0;
  color: #e6e6e6;
  font: 13px/1.5 var(--font-mono);
  pointer-events: none;
}

.debug > *,
.bottom > * {
  pointer-events: auto;
}

.bottom {
  pointer-events: none;
}

.muted {
  color: #8fa3c0;
}

b {
  color: #ffd34d;
}

.info {
  position: absolute;
  top: 14px;
  left: 14px;
  display: grid;
  grid-template-columns: auto auto;
  gap: 0 18px;
  margin: 0;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.62);
  white-space: nowrap;
}

.info dd {
  margin: 0;
}

.info .title {
  margin-bottom: 4px;
  color: #ffd34d;
  font-weight: 700;
}

.info dd.title {
  font-weight: 400;
}

.time {
  position: absolute;
  top: 14px;
  left: 50%;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  transform: translateX(-50%);
}

.time button,
.switches button {
  border: 2px solid #000;
  border-radius: 0;
  background: #3a3d44;
  color: #ddd;
  font: 14px var(--font-mono);
}

.time button {
  width: 42px;
  height: 34px;
  padding: 0;
}

.time button.wide {
  width: auto;
  padding: 0 8px;
}

.time button:hover:not(:disabled),
.switches button:hover {
  background: #4a4e57;
}

.time button.on,
.time button.on:hover {
  background: #ffd34d;
  color: #000;
}

.time button[data-tip]::after {
  right: auto;
  left: 50%;
  transform: translateX(-50%);
}

.custom {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0 4px;
}

.custom input {
  box-sizing: border-box;
  width: 56px;
  height: 34px;
  padding: 0 6px;
  border: 2px solid #000;
  border-radius: 0;
  background: #0c0d10;
  font: 14px var(--font-mono);
  text-align: right;
}

.bottom {
  position: absolute;
  bottom: 14px;
  left: 14px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.panel {
  width: 240px;
  padding: 8px 12px;
}

.panel h2 {
  margin: 0 0 6px;
  color: #bbb;
  font: 14px var(--font-pixel);
}

.minimap {
  display: block;
  width: 100%;
  height: 150px;
  border: 2px solid #000;
  background: rgba(0, 0, 0, 0.4);
  cursor: pointer;
}

.minimap[data-tip]::after {
  top: auto;
  bottom: calc(100% + 8px);
}

.counts {
  display: grid;
  grid-template-columns: 1fr auto;
  margin: 0;
}

.counts dd {
  margin: 0;
  color: #ffd34d;
  text-align: right;
}

.counts .total {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid #555;
}

.switches {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.switches button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  background: rgba(0, 0, 0, 0.62);
  font-size: 13px;
}

.switches button.on {
  border-color: #a9b1ee;
  background: #2b3360;
  color: #fff;
}

kbd {
  padding: 0 4px;
  border: 2px solid #000;
  background: #c6c6c6;
  box-shadow: inset -2px -2px 0 #8b8b8b;
  color: #222;
  font: 12px var(--font-mono);
}
</style>
