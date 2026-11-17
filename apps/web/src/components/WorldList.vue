<script setup lang="ts">
import { parseWorld, serializeWorld, World } from '@ruda/core';
import { nextTick, onMounted, ref, shallowRef, useTemplateRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { fileErrorKey } from '../storage/fileErrors';
import { downloadRudaFile, RUDA_FILE_ACCEPT } from '../storage/files';
import type { WorldStore, WorldSummary } from '../storage/worldStore';
import ConfirmDialog from './ConfirmDialog.vue';

const props = defineProps<{ store: WorldStore; error: string | undefined }>();
const emit = defineEmits<{ open: [id: string]; error: [key: string | undefined] }>();
const { t } = useI18n();

const worlds = ref<WorldSummary[]>([]);
const renaming = ref<{ id: string; name: string }>();
const deleting = shallowRef<WorldSummary>();
const fileInput = useTemplateRef<HTMLInputElement>('fileInput');
const renameInput = useTemplateRef<HTMLInputElement[]>('renameInput');

async function refresh(): Promise<void> {
  worlds.value = await props.store.list();
}

onMounted(refresh);

async function createWorld(): Promise<void> {
  const name = t('worlds.defaultName');
  const created = await props.store.create(name, serializeWorld(new World(), name));
  emit('open', created.id);
}

async function importFile(): Promise<void> {
  const file = fileInput.value?.files?.[0];
  if (!fileInput.value || !file) return;
  fileInput.value.value = '';
  try {
    const loaded = parseWorld(await file.text());
    const name = loaded.name.trim() || t('worlds.defaultName');
    await props.store.create(name, serializeWorld(loaded.world, name));
    emit('error', undefined);
    await refresh();
  } catch (error) {
    emit('error', fileErrorKey(error));
  }
}

async function startRename(world: WorldSummary): Promise<void> {
  renaming.value = { id: world.id, name: world.name };
  await nextTick();
  renameInput.value?.[0]?.select();
}

async function commitRename(): Promise<void> {
  const target = renaming.value;
  renaming.value = undefined;
  const name = target?.name.trim();
  if (!target || !name) return;
  const stored = await props.store.load(target.id);
  if (!stored || stored.name === name) return;
  try {
    const { world } = parseWorld(stored.data);
    await props.store.rename(target.id, name, serializeWorld(world, name));
  } catch (error) {
    emit('error', fileErrorKey(error));
  }
  await refresh();
}

async function exportWorld(id: string): Promise<void> {
  const stored = await props.store.load(id);
  if (stored) downloadRudaFile(stored.name, stored.data);
}

async function onDeleteChoice(choice: 'delete' | 'cancel'): Promise<void> {
  const target = deleting.value;
  deleting.value = undefined;
  if (choice !== 'delete' || !target) return;
  await props.store.delete(target.id);
  await refresh();
}
</script>

<template>
  <section class="worlds">
    <div class="toolbar">
      <h2>{{ t('worlds.title') }}</h2>
      <button type="button" class="primary" @click="createWorld">{{ t('worlds.new') }}</button>
      <button type="button" @click="fileInput?.click()">{{ t('worlds.import') }}</button>
      <input
        ref="fileInput"
        type="file"
        class="hidden"
        :accept="RUDA_FILE_ACCEPT"
        @change="importFile"
      />
    </div>
    <p v-if="error" class="error" role="alert">{{ t(error) }}</p>
    <p v-if="worlds.length === 0" class="empty">{{ t('worlds.empty') }}</p>
    <ul v-else class="list">
      <li v-for="world in worlds" :key="world.id" class="row">
        <form v-if="renaming?.id === world.id" class="name" @submit.prevent="commitRename">
          <input
            ref="renameInput"
            v-model="renaming.name"
            :aria-label="t('worlds.nameLabel')"
            maxlength="100"
            @blur="commitRename"
            @keydown.esc="renaming = undefined"
          />
        </form>
        <button v-else type="button" class="name open" @click="emit('open', world.id)">
          <strong>{{ world.name }}</strong>
          <small>{{ t('worlds.savedAt', { date: $d(world.updatedAt, 'short') }) }}</small>
        </button>
        <button type="button" @click="startRename(world)">{{ t('worlds.rename') }}</button>
        <button type="button" @click="exportWorld(world.id)">{{ t('worlds.export') }}</button>
        <button type="button" @click="deleting = world">{{ t('worlds.delete') }}</button>
      </li>
    </ul>
    <ConfirmDialog
      v-if="deleting"
      :message="t('worlds.confirmDelete', { name: deleting.name })"
      :actions="[
        { value: 'cancel', label: t('dialog.cancel') },
        { value: 'delete', label: t('dialog.delete'), primary: true },
      ]"
      cancel="cancel"
      @choose="onDeleteChoice"
    />
  </section>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.toolbar h2 {
  flex: 1;
  margin: 0;
  font-size: 18px;
}

.hidden {
  display: none;
}

.error {
  padding: 8px 12px;
  border-radius: 4px;
  background: #4a1f1c;
}

.empty {
  opacity: 0.7;
}

.list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid #33363d;
}

.name {
  flex: 1;
  min-width: 0;
}

.name input {
  box-sizing: border-box;
  width: 100%;
}

.open {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  border-color: transparent;
  background: transparent;
  text-align: left;
}

.open strong {
  overflow: hidden;
  max-width: 100%;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.open small {
  opacity: 0.6;
}
</style>
