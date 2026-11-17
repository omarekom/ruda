<script setup lang="ts">
import { computed, nextTick, onMounted, ref, shallowRef, useTemplateRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { gameSkin } from '../gameLook';
import { fileErrorKey } from '../storage/fileErrors';
import { createEmptyWorld, createShowcaseWorld, renameWorld } from '../storage/worldActions';
import type { StoredWorld, WorldStore } from '../storage/worldStore';
import ConfirmDialog from './ConfirmDialog.vue';
import WorldThumbnail from './WorldThumbnail.vue';

/** Game mode's own world selection, in the blocky style. */
const props = defineProps<{ store: WorldStore }>();
const emit = defineEmits<{ open: [id: string]; back: [] }>();
const { t, d } = useI18n();

const worlds = shallowRef<StoredWorld[]>([]);
const selectedId = ref<string>();
const renaming = ref<string>();
const deleting = ref(false);
const error = ref<string>();
const nameInput = useTemplateRef<HTMLInputElement>('nameInput');

const selected = computed(() => worlds.value.find((world) => world.id === selectedId.value));

async function refresh(): Promise<void> {
  const summaries = await props.store.list();
  const loaded = await Promise.all(summaries.map((summary) => props.store.load(summary.id)));
  worlds.value = loaded.filter((world): world is StoredWorld => world !== undefined);
  if (!selected.value) selectedId.value = worlds.value[0]?.id;
}

onMounted(refresh);

async function create(): Promise<void> {
  const created = await createEmptyWorld(props.store, t('worlds.defaultName'));
  emit('open', created.id);
}

async function createShowcase(): Promise<void> {
  const created = await createShowcaseWorld(props.store, t('game.worlds.showcaseName'));
  emit('open', created.id);
}

async function startRename(): Promise<void> {
  if (!selected.value) return;
  renaming.value = selected.value.name;
  await nextTick();
  nameInput.value?.select();
}

async function commitRename(): Promise<void> {
  const name = renaming.value?.trim();
  renaming.value = undefined;
  if (!selected.value || !name) return;
  try {
    await renameWorld(props.store, selected.value.id, name);
    error.value = undefined;
  } catch (failure) {
    error.value = fileErrorKey(failure);
  }
  await refresh();
}

async function onDeleteChoice(choice: 'delete' | 'cancel'): Promise<void> {
  deleting.value = false;
  if (choice !== 'delete' || !selected.value) return;
  await props.store.delete(selected.value.id);
  selectedId.value = undefined;
  await refresh();
}
</script>

<template>
  <main class="worlds">
    <h1>{{ t('game.worlds.title') }}</h1>

    <div class="list" role="listbox" :aria-label="t('game.worlds.title')">
      <p v-if="worlds.length === 0" class="empty">{{ t('game.worlds.empty') }}</p>
      <button
        v-for="world in worlds"
        :key="world.id"
        type="button"
        role="option"
        class="world"
        :class="{ selected: world.id === selectedId }"
        :aria-selected="world.id === selectedId"
        @click="selectedId = world.id"
        @dblclick="emit('open', world.id)"
      >
        <WorldThumbnail class="thumbnail" :data="world.data" :skin="gameSkin" />
        <span class="text">
          <span class="name">{{ world.name }}</span>
          <span class="date">{{
            t('game.worlds.saved', { date: d(world.updatedAt, 'short') })
          }}</span>
        </span>
      </button>
    </div>

    <p v-if="error" class="error" role="alert">{{ t(error) }}</p>

    <div class="actions">
      <button
        type="button"
        class="blocky-button"
        :disabled="!selected"
        @click="selected && emit('open', selected.id)"
      >
        {{ t('game.worlds.play') }}
      </button>
      <button type="button" class="blocky-button" @click="create">
        {{ t('game.worlds.create') }}
      </button>
      <div class="row">
        <button type="button" class="blocky-button" :disabled="!selected" @click="startRename">
          {{ t('game.worlds.rename') }}
        </button>
        <button type="button" class="blocky-button" :disabled="!selected" @click="deleting = true">
          {{ t('game.worlds.delete') }}
        </button>
      </div>
      <button type="button" class="blocky-button" @click="createShowcase">
        {{ t('game.worlds.showcase') }}
      </button>
      <button type="button" class="blocky-button" @click="emit('back')">
        {{ t('game.worlds.back') }}
      </button>
    </div>

    <div v-if="renaming !== undefined" class="shade">
      <form class="rename blocky-panel" @submit.prevent="commitRename">
        <h2>{{ t('game.worlds.renameTitle') }}</h2>
        <input
          ref="nameInput"
          v-model="renaming"
          :aria-label="t('game.worlds.nameLabel')"
          maxlength="100"
          @keydown.esc="renaming = undefined"
        />
        <div class="row">
          <button type="submit" class="blocky-button">{{ t('game.worlds.saveName') }}</button>
          <button type="button" class="blocky-button" @click="renaming = undefined">
            {{ t('dialog.cancel') }}
          </button>
        </div>
      </form>
    </div>

    <ConfirmDialog
      v-if="deleting && selected"
      blocky
      :message="t('game.worlds.confirmDelete', { name: selected.name })"
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
  box-sizing: border-box;
  height: 100%;
  padding: 18px 0 16px;
  background: #1d1f24;
  color: #fff;
  font: 28px var(--font-retro);
}

h1 {
  margin: 0 0 14px;
  font: 34px var(--font-pixel);
  text-shadow: 3px 3px #000;
}

.list {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
  padding: 6px 0;
  overflow-y: auto;
  border-top: 2px solid #000;
  border-bottom: 2px solid #000;
  background: rgba(0, 0, 0, 0.35);
  box-shadow:
    inset 0 2px 0 #3a3a3a,
    inset 0 -2px 0 #3a3a3a;
}

.empty {
  margin: auto;
  color: #aaa;
}

.world {
  display: flex;
  gap: 12px;
  align-items: center;
  width: min(700px, 92vw);
  padding: 4px;
  border: 2px solid transparent;
  border-radius: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
}

.world:hover {
  background: rgba(255, 255, 255, 0.06);
}

.world.selected {
  border-color: #aaa;
  background: rgba(0, 0, 0, 0.5);
}

.thumbnail {
  flex: none;
  width: 64px;
  height: 64px;
  border: 2px solid #000;
}

.text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.date {
  color: #9a9a9a;
  font-size: 24px;
}

.error {
  margin: 8px 0 0;
  color: #ff8a80;
}

.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  width: min(760px, 92vw);
  margin-top: 14px;
}

.actions .row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.blocky-button:disabled {
  color: #a0a0a0;
  opacity: 0.6;
  cursor: default;
}

.shade {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.6);
}

.rename {
  display: grid;
  gap: 12px;
  width: min(520px, 90vw);
  padding: 18px 22px;
}

.rename h2 {
  margin: 0;
  font: 28px var(--font-pixel);
  text-align: center;
}

.rename input {
  padding: 6px 8px;
  border: 2px solid #a0a0a0;
  border-radius: 0;
  background: #000;
  color: #fff;
  font: 28px var(--font-retro);
}

.rename .row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
</style>
