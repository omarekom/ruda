<script setup lang="ts">
import { repairWorld } from '@ruda/core';
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  useTemplateRef,
} from 'vue';
import { useI18n } from 'vue-i18n';
import { nightSlabFloor } from '../renderer/skins/blockTextures';
import { worldSkin } from '../theme';
import { fileErrorKey } from '../storage/fileErrors';
import { isArrowKey, moveFocus } from '../input/focusNavigation';
import { useKeyHelp, type KeyRow } from '../input/keyHelp';
import { formatRelativeTime } from '../relativeTime';
import { downloadRudaFile, RUDA_FILE_ACCEPT } from '../storage/files';
import { createEmptyWorld, createWorld, renameWorld } from '../storage/worldActions';
import { lastPlayedAt, type StoredWorld, type WorldStore } from '../storage/worldStore';
import ConfirmDialog from './ConfirmDialog.vue';
import PixelIcon from './PixelIcon.vue';
import WorldThumbnail from './WorldThumbnail.vue';

/** The worlds as a grid of cards: click to play, click the name to rename. */
const props = defineProps<{ store: WorldStore }>();
const emit = defineEmits<{ open: [id: string]; back: [] }>();
const { t, locale } = useI18n();

const KEYS: readonly KeyRow[] = [
  ['cards', 'arrows', 'Tab'],
  ['firstWorld', 'space'],
  ['playWorld', 'Enter'],
  ['rename', 'F2'],
  ['delete', 'Delete'],
  ['export', 'E'],
  ['import', 'I'],
  ['search', '/'],
  ['back', 'Esc'],
  ['help', '?'],
];
useKeyHelp(() => KEYS);

const worlds = shallowRef<StoredWorld[]>([]);
const search = ref('');
const renaming = ref<{ id: string; name: string }>();
const deleting = shallowRef<StoredWorld>();
/** An imported world that had to be repaired, shown to the user before it opens. */
const repaired = ref<{ id: string; problems: number }>();
const error = ref<string>();
const grid = useTemplateRef<HTMLElement>('grid');
const searchInput = useTemplateRef<HTMLInputElement>('searchInput');
const fileInput = useTemplateRef<HTMLInputElement>('fileInput');
const nameInput = useTemplateRef<HTMLInputElement[]>('nameInput');
const backdrop = `url(${nightSlabFloor().toDataURL()})`;

function lastPlayed(world: StoredWorld): string {
  const when = formatRelativeTime(
    lastPlayedAt(world),
    Date.now(),
    locale.value,
    t('game.worlds.justNow'),
  );
  return t('game.worlds.lastPlayed', { when });
}

const shownWorlds = computed(() => {
  const query = search.value.trim().toLocaleLowerCase();
  return query
    ? worlds.value.filter((world) => world.name.toLocaleLowerCase().includes(query))
    : worlds.value;
});

async function refresh(): Promise<void> {
  const summaries = await props.store.list();
  const loaded = await Promise.all(summaries.map((summary) => props.store.load(summary.id)));
  worlds.value = loaded.filter((world): world is StoredWorld => world !== undefined);
}

async function create(): Promise<void> {
  const created = await createEmptyWorld(props.store, t('worlds.defaultName'));
  emit('open', created.id);
}

async function importFile(): Promise<void> {
  const file = fileInput.value?.files?.[0];
  if (!fileInput.value || !file) return;
  fileInput.value.value = '';
  try {
    const loaded = repairWorld(await file.text());
    const name = loaded.name.trim() || t('worlds.defaultName');
    const created = await createWorld(props.store, name, loaded.world);
    if (loaded.problems.length === 0) emit('open', created.id);
    else repaired.value = { id: created.id, problems: loaded.problems.length };
  } catch (failure) {
    error.value = fileErrorKey(failure);
  }
}

async function startRename(world: StoredWorld): Promise<void> {
  renaming.value = { id: world.id, name: world.name };
  await nextTick();
  nameInput.value?.[0]?.select();
}

async function commitRename(): Promise<void> {
  const target = renaming.value;
  renaming.value = undefined;
  if (!target) return;
  const name = target.name.trim();
  if (name) {
    try {
      await renameWorld(props.store, target.id, name);
      error.value = undefined;
    } catch (failure) {
      error.value = fileErrorKey(failure);
    }
    await refresh();
  }
  await focusCard(target.id);
}

/** Gives the keyboard back to a world's card, e.g. after renaming it. */
async function focusCard(id: string): Promise<void> {
  await nextTick();
  grid.value?.querySelector<HTMLElement>(`.card[data-id="${CSS.escape(id)}"]`)?.focus();
}

function cancelRename(): void {
  const target = renaming.value;
  renaming.value = undefined;
  if (target) void focusCard(target.id);
}

function onRepairedChoice(): void {
  const target = repaired.value;
  repaired.value = undefined;
  if (target) emit('open', target.id);
}

async function onDeleteChoice(choice: 'delete' | 'cancel'): Promise<void> {
  const target = deleting.value;
  deleting.value = undefined;
  if (choice !== 'delete' || !target) return;
  await props.store.delete(target.id);
  await refresh();
}

function cards(): HTMLElement[] {
  return [...(grid.value?.querySelectorAll<HTMLElement>('.card') ?? [])];
}

function onCardKey(event: KeyboardEvent, world: StoredWorld | undefined): void {
  if (renaming.value) return;
  if (isArrowKey(event.key)) {
    event.preventDefault();
    moveFocus(cards(), event.key);
  } else if (event.key === 'Enter') {
    event.preventDefault();
    if (world) emit('open', world.id);
    else void create();
  } else if (world && event.key === 'F2') {
    event.preventDefault();
    void startRename(world);
  } else if (world && event.key === 'Delete') {
    deleting.value = world;
  } else if (world && event.code === 'KeyE') {
    downloadRudaFile(world.name, world.data);
  }
}

function onKeyDown(event: KeyboardEvent): void {
  if (renaming.value || deleting.value || repaired.value) return;
  const typing = event.target instanceof HTMLInputElement;
  if (event.key === 'Escape') {
    if (typing) {
      // Without this, the browser also clears the search field.
      event.preventDefault();
      searchInput.value?.blur();
    } else emit('back');
  } else if (
    nothingFocused() &&
    ((event.key === 'Tab' && !event.shiftKey) || isArrowKey(event.key))
  ) {
    event.preventDefault();
    focusFirstWorld();
  } else if (event.key === 'ArrowDown' && typing) {
    cards()[0]?.focus();
  } else if (!typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
    onShortcut(event);
  }
}

/** Keys that work anywhere on the screen except while typing. */
function onShortcut(event: KeyboardEvent): void {
  if (event.key === '/') {
    event.preventDefault();
    searchInput.value?.focus();
  } else if (event.key === ' ') {
    event.preventDefault();
    focusFirstWorld();
  } else if (event.code === 'KeyI') {
    fileInput.value?.click();
  }
}

/** The first world's card, or the new world card when there are none. */
function focusFirstWorld(): void {
  (cards()[1] ?? cards()[0])?.focus();
}

/** Nothing is focused when the screen opens; the first Tab or arrow goes to the first world. */
function nothingFocused(): boolean {
  return document.activeElement === null || document.activeElement === document.body;
}

onMounted(async () => {
  window.addEventListener('keydown', onKeyDown);
  await refresh();
});
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown));
</script>

<template>
  <main class="worlds" :style="{ '--floor': backdrop }">
    <h1>{{ t('game.worlds.title') }}</h1>

    <div class="bar">
      <button type="button" class="blocky-button" @click="emit('back')">
        {{ t('game.worlds.back') }}
      </button>
      <input
        ref="searchInput"
        v-model="search"
        class="search"
        type="search"
        :placeholder="t('game.worlds.search')"
        :aria-label="t('game.worlds.search')"
      />
      <button type="button" class="blocky-button" @click="fileInput?.click()">
        {{ t('game.worlds.import') }}
      </button>
      <input ref="fileInput" type="file" :accept="RUDA_FILE_ACCEPT" hidden @change="importFile" />
    </div>

    <p v-if="error" class="error" role="alert">{{ t(error) }}</p>

    <div ref="grid" class="grid" role="list" :aria-label="t('game.worlds.title')">
      <div
        class="card new blocky-panel"
        role="listitem"
        tabindex="0"
        @click="create"
        @keydown="onCardKey($event, undefined)"
      >
        <span class="plus">+</span>
        <span>{{ t('game.worlds.create') }}</span>
      </div>
      <div
        v-for="world in shownWorlds"
        :key="world.id"
        class="card blocky-panel"
        role="listitem"
        tabindex="0"
        :data-id="world.id"
        :aria-label="world.name"
        @click="emit('open', world.id)"
        @keydown.self="onCardKey($event, world)"
      >
        <WorldThumbnail class="thumbnail" :data="world.data" :skin="worldSkin" />
        <form
          v-if="renaming?.id === world.id"
          class="rename"
          @click.stop
          @submit.prevent="commitRename"
        >
          <input
            ref="nameInput"
            v-model="renaming.name"
            :aria-label="t('game.worlds.nameLabel')"
            maxlength="100"
            @keydown.esc.stop="cancelRename"
            @blur="commitRename"
          />
        </form>
        <button
          v-else
          type="button"
          class="name"
          tabindex="-1"
          :data-tip="t('game.worlds.renameHint')"
          @click.stop="startRename(world)"
        >
          {{ world.name }}
        </button>
        <span class="date">{{ lastPlayed(world) }}</span>
        <div class="tools">
          <button
            type="button"
            class="blocky-button icon-button"
            tabindex="-1"
            :data-tip="t('game.worlds.export')"
            :aria-label="t('game.worlds.export')"
            @click.stop="downloadRudaFile(world.name, world.data)"
          >
            <PixelIcon name="download" />
          </button>
          <button
            type="button"
            class="blocky-button icon-button"
            tabindex="-1"
            :data-tip="t('game.worlds.delete')"
            :aria-label="t('game.worlds.delete')"
            @click.stop="deleting = world"
          >
            <PixelIcon name="trash" />
          </button>
        </div>
      </div>
    </div>

    <p v-if="worlds.length === 0" class="empty">{{ t('game.worlds.empty') }}</p>
    <p class="hint">{{ t('game.worlds.keys') }}</p>

    <ConfirmDialog
      v-if="deleting"
      blocky
      :message="t('game.worlds.confirmDelete', { name: deleting.name })"
      :actions="[
        { value: 'delete', label: t('game.worlds.delete') },
        { value: 'cancel', label: t('dialog.cancel') },
      ]"
      cancel="cancel"
      @choose="onDeleteChoice"
    />
    <ConfirmDialog
      v-if="repaired"
      blocky
      :message="t('game.worlds.repaired', repaired.problems)"
      :actions="[{ value: 'open', label: t('game.worlds.openRepaired'), primary: true }]"
      cancel="open"
      @choose="onRepairedChoice"
    />
  </main>
</template>

<style scoped>
.worlds {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  box-sizing: border-box;
  height: 100%;
  padding: 18px 16px 12px;
  /* The night slabs, large and dimmed: a calm floor under the cards. */
  background:
    linear-gradient(rgba(12, 13, 16, 0.55), rgba(12, 13, 16, 0.55)),
    var(--floor) 0 0 / 128px 128px #1d1f24;
  image-rendering: pixelated;
  color: #fff;
  font: 28px var(--font-retro);
}

h1 {
  margin: 0;
  font: 34px var(--font-pixel);
  text-shadow: 3px 3px #000;
}

.bar {
  display: flex;
  gap: 10px;
  width: min(1100px, 100%);
}

.search {
  flex: 1;
  min-width: 0;
  padding: 4px 10px;
  border: 3px solid #000;
  border-radius: 0;
  background: #0c0d10;
  box-shadow: inset 0 0 0 2px #444;
  font: 26px var(--font-retro);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  align-content: start;
  gap: 16px;
  flex: 1;
  width: min(1100px, 100%);
  padding: 4px;
  overflow-y: auto;
  image-rendering: auto;
}

.card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 8px;
  cursor: pointer;
  outline: none;
}

.card:hover,
.card:focus-visible,
.card:focus-within {
  box-shadow:
    inset 0 0 0 2px #555,
    0 0 0 3px #fff;
}

.thumbnail {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 10;
  border: 3px solid #000;
  box-sizing: border-box;
}

.name {
  align-self: flex-start;
  max-width: 100%;
  margin-top: 6px;
  padding: 0;
  overflow: hidden;
  border: 0;
  border-bottom: 2px dashed transparent;
  border-radius: 0;
  background: none;
  font: 28px var(--font-retro);
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: text;
}

.name:hover,
.name:focus-visible {
  border-bottom-color: #aaa;
  background: none;
  outline: none;
}

.name[data-tip]::after {
  right: auto;
  left: 0;
}

.rename input {
  box-sizing: border-box;
  width: 100%;
  margin-top: 6px;
  padding: 0 6px;
  border: 2px solid #a0a0a0;
  border-radius: 0;
  background: #000;
  font: 28px var(--font-retro);
}

.date {
  color: #9a9a9a;
  font-size: 22px;
}

.tools {
  position: absolute;
  top: 14px;
  right: 14px;
  display: flex;
  gap: 4px;
  opacity: 0;
}

.card:hover .tools,
.card:focus-visible .tools,
.card:focus-within .tools {
  opacity: 1;
}

.tools .icon-button {
  width: 36px;
  height: 36px;
  font-size: 20px;
}

.new {
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: #ccc;
  text-align: center;
}

.plus {
  font: 64px var(--font-pixel);
  line-height: 1;
}

.empty,
.hint {
  margin: 0;
  color: #9aa;
  font-size: 22px;
  text-align: center;
}

.error {
  margin: 0;
  color: #ff8a80;
}
</style>
