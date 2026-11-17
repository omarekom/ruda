<script setup lang="ts">
import { createBlock, type BlockType } from '@ruda/core';
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useTemplateRef } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Game } from '../game/game';
import { HOTBAR_SLOTS, selectSlot, slotKey, type HotbarState } from '../game/hotbar';
import { inspect, type Inspection } from '../game/inspect';
import { TICKS_PER_SECOND } from '../game/tickLoop';
import { DEFAULT_CELL_SIZE } from '../renderer/camera';
import { drawMinimap, minimapToWorld } from '../renderer/minimap';
import type { Skin } from '../renderer/skins/skin';
import { setTheme, theme } from '../theme';
import type { Theme } from '../preferences';
import BlockIcon from './BlockIcon.vue';

export type SaveStatus = 'saving' | 'saved' | 'unsaved' | 'failed';

const INSPECT_INTERVAL_MS = 100;
const MINIMAP_INTERVAL_MS = 200;
const STATS_INTERVAL_MS = 1000;
const SPEEDS = [1, 2, 4] as const;
const ZOOM_STEP = 1.25;

const PALETTE: readonly (readonly [group: string, types: readonly BlockType[]])[] = [
  ['power', ['redstone_block', 'lever', 'button']],
  ['wiring', ['wire', 'crossing']],
  ['logic', ['torch', 'delayer']],
  ['output', ['lamp']],
  ['mechanics', ['piston']],
  ['building', ['stone']],
];
const DIRECTION_NAMES = ['north', 'east', 'south', 'west'] as const;
const THEMES: readonly { readonly value: Theme; readonly label: string }[] = [
  { value: 'auto', label: 'auto' },
  { value: 'light', label: '☀' },
  { value: 'dark', label: '☾' },
];

const props = defineProps<{
  game: Game;
  hotbar: HotbarState;
  skin: Skin;
  worldName: string;
  saveStatus: SaveStatus;
  paused: boolean;
  speed: number;
}>();
const emit = defineEmits<{
  save: [];
  export: [];
  worlds: [];
  start: [];
  toGame: [];
  pause: [paused: boolean];
  step: [];
  speed: [speed: number];
}>();
const { t } = useI18n();

const openMenu = ref<'world' | 'view'>();
const cell = shallowRef<readonly [number, number]>();
const inspection = shallowRef<Inspection>();
const tick = ref(0);
const zoom = ref(100);
const counts = shallowRef<readonly (readonly [BlockType, number])[]>([]);
const total = ref(0);
const minimap = useTemplateRef<HTMLCanvasElement>('minimap');
const timers: ReturnType<typeof setInterval>[] = [];

const nextSpeed = computed(
  () => SPEEDS[(SPEEDS.findIndex((speed) => speed === props.speed) + 1) % SPEEDS.length],
);

function refreshInspector(): void {
  const { game } = props;
  cell.value = game.hoveredCell();
  const block = cell.value && game.blocks.get(...cell.value);
  inspection.value = cell.value && block && inspect(...cell.value, block, game.power);
  tick.value = game.tickCount;
  zoom.value = Math.round((game.camera.cellSize / DEFAULT_CELL_SIZE) * 100);
}

function refreshStats(): void {
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

function zoomBy(factor: number): void {
  const { camera } = props.game;
  const [width, height] = camera.viewSize;
  camera.zoomAt(width / 2, height / 2, factor);
}

function choose(action: () => void): void {
  openMenu.value = undefined;
  action();
}

function stateText(state: NonNullable<Inspection['state']>): string {
  const key = `expert.inspector.state.${state.key}`;
  const ticks = state.values?.ticks;
  return ticks === undefined ? t(key) : t(key, { ticks }, ticks);
}

function closeMenu(): void {
  openMenu.value = undefined;
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape') closeMenu();
}

onMounted(() => {
  refreshInspector();
  refreshStats();
  refreshMinimap();
  timers.push(
    setInterval(refreshInspector, INSPECT_INTERVAL_MS),
    setInterval(refreshMinimap, MINIMAP_INTERVAL_MS),
    setInterval(refreshStats, STATS_INTERVAL_MS),
  );
  window.addEventListener('click', closeMenu);
  window.addEventListener('keydown', onKeyDown);
});

onBeforeUnmount(() => {
  timers.forEach(clearInterval);
  window.removeEventListener('click', closeMenu);
  window.removeEventListener('keydown', onKeyDown);
});
</script>

<template>
  <header class="top">
    <span class="logo">{{ t('app.title') }}</span>
    <nav class="menus" @click.stop>
      <div class="menu">
        <button
          type="button"
          class="sketch-button plain"
          :class="{ active: openMenu === 'world' }"
          @click="openMenu = openMenu === 'world' ? undefined : 'world'"
        >
          {{ t('expert.menu.world') }}
        </button>
        <div v-if="openMenu === 'world'" class="dropdown sketch-box">
          <button type="button" @click="choose(() => emit('save'))">
            {{ t('expert.menu.save') }} <kbd>Ctrl S</kbd>
          </button>
          <button type="button" @click="choose(() => emit('export'))">
            {{ t('expert.menu.export') }}
          </button>
          <hr />
          <button type="button" @click="choose(() => emit('worlds'))">
            {{ t('expert.menu.worlds') }}
          </button>
          <button type="button" @click="choose(() => emit('start'))">
            {{ t('expert.menu.startScreen') }}
          </button>
        </div>
      </div>
      <div class="menu">
        <button
          type="button"
          class="sketch-button plain"
          :class="{ active: openMenu === 'view' }"
          @click="openMenu = openMenu === 'view' ? undefined : 'view'"
        >
          {{ t('expert.menu.view') }}
        </button>
        <div v-if="openMenu === 'view'" class="dropdown sketch-box">
          <button type="button" @click="choose(() => zoomBy(ZOOM_STEP))">
            {{ t('expert.menu.zoomIn') }}
          </button>
          <button type="button" @click="choose(() => zoomBy(1 / ZOOM_STEP))">
            {{ t('expert.menu.zoomOut') }}
          </button>
          <button type="button" @click="choose(() => game.camera.centerOn(0.5, 0.5))">
            {{ t('expert.menu.origin') }}
          </button>
        </div>
      </div>
    </nav>
    <span class="name">{{ worldName }}</span>
    <span class="spacer" />
    <span class="status" :class="saveStatus" role="status">
      {{ t(`expert.status.${saveStatus}`) }}
    </span>
    <button type="button" class="sketch-button" @click="emit('save')">
      {{ t('expert.menu.save') }}
    </button>
    <div class="themes sketch-box-alt" role="radiogroup" :aria-label="t('expert.theme.label')">
      <button
        v-for="option in THEMES"
        :key="option.value"
        type="button"
        role="radio"
        class="sketch-button plain"
        :class="{ active: theme === option.value }"
        :aria-checked="theme === option.value"
        :title="t(`expert.theme.${option.value}`)"
        @click="setTheme(option.value)"
      >
        {{ option.label }}
      </button>
    </div>
    <button type="button" class="sketch-button" @click="emit('toGame')">
      ▶ {{ t('modes.game') }}
    </button>
  </header>

  <aside class="palette" :aria-label="t('expert.palette.label')">
    <template v-for="[group, types] in PALETTE" :key="group">
      <h3>{{ t(`expert.palette.groups.${group}`) }}</h3>
      <button
        v-for="type in types"
        :key="type"
        type="button"
        class="tool"
        :class="{ 'sketch-marked': HOTBAR_SLOTS[hotbar.selected] === type }"
        @click="selectSlot(hotbar, HOTBAR_SLOTS.indexOf(type))"
      >
        <BlockIcon :block="createBlock(type, hotbar.facing)" :skin="skin" :size="28" />
        <span>{{ t(`blocks.${type}`) }}</span>
        <kbd>{{ slotKey(HOTBAR_SLOTS.indexOf(type)) }}</kbd>
      </button>
    </template>
  </aside>

  <aside class="panels">
    <h3>{{ t('expert.inspector.title') }}</h3>
    <div class="card sketch-box">
      <dl v-if="inspection && cell" class="facts">
        <dt>{{ t('expert.inspector.block') }}</dt>
        <dd>{{ t(`blocks.${inspection.type}`) }}</dd>
        <dt>{{ t('expert.inspector.at') }}</dt>
        <dd>{{ cell[0] }}, {{ cell[1] }}</dd>
        <template v-if="inspection.facing !== undefined">
          <dt>{{ t('expert.inspector.facing') }}</dt>
          <dd>{{ t(`expert.inspector.directions.${DIRECTION_NAMES[inspection.facing]}`) }}</dd>
        </template>
        <template v-if="inspection.state">
          <dt>{{ t('expert.inspector.stateLabel') }}</dt>
          <dd>{{ stateText(inspection.state) }}</dd>
        </template>
      </dl>
      <p v-else class="muted">
        {{
          cell
            ? t('expert.inspector.empty', { x: cell[0], y: cell[1] })
            : t('expert.inspector.nothing')
        }}
      </p>
    </div>

    <h3>{{ t('expert.time.title') }}</h3>
    <div class="card sketch-box-alt time">
      <button
        type="button"
        class="sketch-button"
        :class="{ active: !paused }"
        :aria-pressed="!paused"
        @click="emit('pause', false)"
      >
        ▶ {{ t('expert.time.run') }}
      </button>
      <button
        type="button"
        class="sketch-button"
        :class="{ active: paused }"
        :aria-pressed="paused"
        @click="emit('pause', true)"
      >
        ❚❚ {{ t('expert.time.pause') }}
      </button>
      <button type="button" class="sketch-button" :disabled="!paused" @click="emit('step')">
        {{ t('expert.time.step') }}
      </button>
      <button
        type="button"
        class="sketch-button"
        :title="t('expert.time.speed')"
        @click="emit('speed', nextSpeed)"
      >
        {{ speed }}×
      </button>
    </div>

    <h3>{{ t('expert.map.title') }}</h3>
    <div class="card sketch-box map">
      <canvas ref="minimap" :title="t('expert.map.hint')" @click="onMinimapClick" />
    </div>

    <h3>{{ t('expert.stats.title') }}</h3>
    <div class="card sketch-box-alt">
      <dl class="facts">
        <dt>{{ t('expert.stats.blocks') }}</dt>
        <dd>{{ total }}</dd>
        <template v-for="[type, count] in counts" :key="type">
          <dt>{{ t(`blocks.${type}`) }}</dt>
          <dd>{{ count }}</dd>
        </template>
      </dl>
    </div>
  </aside>

  <footer class="bottom">
    <span>
      {{
        cell ? t('expert.statusBar.cell', { x: cell[0], y: cell[1] }) : t('expert.statusBar.noCell')
      }}
    </span>
    <span>{{ t('expert.statusBar.zoom', { percent: zoom }) }}</span>
    <span>{{ t('expert.statusBar.tick', { tick }) }}</span>
    <span>
      {{
        paused
          ? t('expert.statusBar.paused')
          : t('expert.statusBar.rate', { rate: TICKS_PER_SECOND * speed })
      }}
    </span>
  </footer>
</template>

<style scoped>
.top {
  grid-area: header;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border-bottom: 2px solid var(--ink);
  background: var(--panel);
}

.logo {
  margin-right: 8px;
  color: var(--accent);
  font: 32px var(--font-hand-title);
  transform: rotate(-3deg);
}

.menus {
  display: flex;
}

.menu {
  position: relative;
}

.dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 10;
  display: grid;
  min-width: 220px;
  padding: 6px;
  background: var(--panel);
  box-shadow: 4px 5px 0 rgba(0, 0, 0, 0.12);
}

.dropdown button {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 2px 10px;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--ink);
  text-align: left;
}

.dropdown button:hover {
  background: var(--highlight);
}

.dropdown hr {
  width: 100%;
  margin: 4px 0;
  border: none;
  border-top: 1px dashed var(--mute);
}

kbd {
  color: var(--mute);
  font: 14px var(--font-hand);
}

.name {
  overflow: hidden;
  max-width: 260px;
  padding: 2px 4px;
  border-bottom: 2px dashed var(--mute);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.spacer {
  flex: 1;
}

.status {
  color: var(--mute);
}

.status.failed {
  color: var(--accent);
}

.themes {
  display: flex;
  padding: 2px;
}

.themes .sketch-button {
  padding: 0 9px;
}

.palette,
.panels {
  overflow-y: auto;
  padding: 10px 12px;
  background: var(--panel);
}

.palette {
  grid-area: left;
  border-right: 2px solid var(--ink);
}

.panels {
  grid-area: right;
  border-left: 2px solid var(--ink);
}

h3 {
  margin: 12px 2px 2px;
  color: var(--mute);
  font: 23px var(--font-hand-title);
}

h3:first-child {
  margin-top: 0;
}

.tool {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 2px 6px;
  border: none;
  border-radius: 0;
  background-color: transparent;
  color: var(--ink);
  text-align: left;
}

.tool:hover {
  background: linear-gradient(transparent 22%, var(--highlight) 22% 88%, transparent 88%);
}

.tool kbd {
  margin-left: auto;
}

.card {
  margin: 6px 0 10px;
  padding: 8px 12px;
  background: var(--panel);
}

.facts {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0 12px;
  margin: 0;
}

.facts dt {
  color: var(--mute);
}

.facts dd {
  margin: 0;
}

.muted {
  margin: 0;
  color: var(--mute);
}

.time {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.map {
  height: 150px;
  padding: 0;
  overflow: hidden;
}

.map canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.bottom {
  grid-area: status;
  display: flex;
  align-items: center;
  gap: 22px;
  padding: 0 14px;
  border-top: 2px solid var(--ink);
  background: var(--panel);
  color: var(--mute);
}
</style>
