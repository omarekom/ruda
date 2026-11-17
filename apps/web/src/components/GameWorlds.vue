<script setup lang="ts">
import { parseWorld, serializeWorld } from '@ruda/core';
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
import { downloadRudaFile, RUDA_FILE_ACCEPT } from '../storage/files';
import { createEmptyWorld, renameWorld } from '../storage/worldActions';
import type { StoredWorld, WorldStore } from '../storage/worldStore';
import ConfirmDialog from './ConfirmDialog.vue';
import PixelIcon from './PixelIcon.vue';
import WorldThumbnail from './WorldThumbnail.vue';

/** The worlds as a grid of cards: click to play, click the name to rename. */
const props = defineProps<{ store: WorldStore }>();
const emit = defineEmits<{ open: [id: string]; back: [] }>();
const { t, d } = useI18n();

const worlds = shallowRef<StoredWorld[]>([]);
const search = ref('');
const renaming = ref<{ id: string; name: string }>();
const deleting = shallowRef<StoredWorld>();
const error = ref<string>();
const grid = useTemplateRef<HTMLElement>('grid');
const searchInput = useTemplateRef<HTMLInputElement>('searchInput');
const fileInput = useTemplateRef<HTMLInputElement>('fileInput');
const nameInput = useTemplateRef<HTMLInputElement[]>('nameInput');
const backdrop = `url(${nightSlabFloor().toDataURL()})`;

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
    const loaded = parseWorld(await file.text());
    const name = loaded.name.trim() || t('worlds.defaultName');
    const created = await props.store.create(name, serializeWorld(loaded.world, name));
    emit('open', created.id);
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
  const name = target?.name.trim();
  if (!target || !name) return;
  try {
    await renameWorld(props.store, target.id, name);
    error.value = undefined;
  } catch (failure) {
    error.value = fileErrorKey(failure);
  }
  await refresh();
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

/** Moves focus to the card in the given direction, reading the columns from the layout. */
function moveFocus(from: HTMLElement, key: string): void {
  const all = cards();
  const index = all.indexOf(from);
  const columns = all.filter((card) => card.offsetTop === all[0]?.offsetTop).length || 1;
  const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns }[key];
  if (step === undefined) return;
  all[Math.min(all.length - 1, Math.max(0, index + step))]?.focus();
}

function onCardKey(event: KeyboardEvent, world: StoredWorld | undefined): void {
  if (renaming.value) return;
  if (event.key.startsWith('Arrow')) {
    event.preventDefault();
    moveFocus(event.currentTarget as HTMLElement, event.key);
  } else if (event.key === 'Enter' || event.key === ' ') {
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
  if (renaming.value || deleting.value) return;
  const typing = event.target instanceof HTMLInputElement;
  if (event.key === 'Escape') {
    if (typing && search.value) search.value = '';
    else emit('back');
  } else if (event.key === '/' && !typing) {
    event.preventDefault();
    searchInput.value?.focus();
  } else if (event.key === 'ArrowDown' && typing) {
    cards()[0]?.focus();
  }
}

onMounted(async () => {
  window.addEventListener('keydown', onKeyDown);
  await refresh();
  await nextTick();
  (cards()[1] ?? cards()[0])?.focus();
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
            @keydown.esc.stop="renaming = undefined"
            @blur="commitRename"
          />
        </form>
        <button
          v-else
          type="button"
          class="name"
          :data-tip="t('game.worlds.renameHint')"
          @click.stop="startRename(world)"
        >
          {{ world.name }}
        </button>
        <span class="date">{{
          t('game.worlds.saved', { date: d(world.updatedAt, 'short') })
        }}</span>
        <div class="tools">
          <button
            type="button"
            class="blocky-button icon-button"
            :data-tip="t('game.worlds.export')"
            :aria-label="t('game.worlds.export')"
            @click.stop="downloadRudaFile(world.name, world.data)"
          >
            <PixelIcon name="download" />
          </button>
          <button
            type="button"
            class="blocky-button icon-button"
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
