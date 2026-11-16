<script setup lang="ts">
import { parseWorld } from '@ruda/core';
import { onMounted, ref, shallowRef } from 'vue';
import { useI18n } from 'vue-i18n';
import ConfirmDialog from './components/ConfirmDialog.vue';
import EditorView from './components/EditorView.vue';
import WorldList from './components/WorldList.vue';
import type { OpenWorld } from './game/openWorld';
import { fileErrorKey } from './storage/fileErrors';
import { WorldStore, type Recovery, type StoredWorld } from './storage/worldStore';

const { t, d } = useI18n();
const store = shallowRef<WorldStore>();
const storageUnavailable = ref(false);
const opened = shallowRef<OpenWorld>();
const restoring = shallowRef<{ stored: StoredWorld; recovery: Recovery }>();
const listError = ref<string>();

onMounted(async () => {
  try {
    store.value = await WorldStore.open();
  } catch {
    storageUnavailable.value = true;
  }
});

async function openWorld(id: string): Promise<void> {
  if (!store.value) return;
  const stored = await store.value.load(id);
  if (!stored) return;
  const recovery = await store.value.loadRecovery(id);
  if (recovery && recovery.savedAt > stored.updatedAt) {
    restoring.value = { stored, recovery };
    return;
  }
  if (recovery) await store.value.discardRecovery(id);
  show(stored, stored.data, false);
}

async function onRestoreChoice(choice: 'restore' | 'discard' | 'cancel'): Promise<void> {
  const target = restoring.value;
  restoring.value = undefined;
  if (!target || !store.value || choice === 'cancel') return;
  if (choice === 'restore') {
    show(target.stored, target.recovery.data, true);
  } else {
    await store.value.discardRecovery(target.stored.id);
    show(target.stored, target.stored.data, false);
  }
}

function show(stored: StoredWorld, data: string, restored: boolean): void {
  try {
    const { world } = parseWorld(data);
    opened.value = { id: stored.id, name: stored.name, world, restored };
    listError.value = undefined;
  } catch (error) {
    listError.value = fileErrorKey(error);
  }
}
</script>

<template>
  <p v-if="storageUnavailable" class="fatal" role="alert">{{ t('app.storageUnavailable') }}</p>
  <template v-else-if="store">
    <EditorView v-if="opened" :store="store" :world="opened" @close="opened = undefined" />
    <WorldList
      v-else
      :store="store"
      :error="listError"
      @open="openWorld"
      @error="(key) => (listError = key)"
    />
  </template>
  <ConfirmDialog
    v-if="restoring"
    :message="
      t('worlds.restorePrompt', {
        name: restoring.stored.name,
        date: d(restoring.recovery.savedAt, 'short'),
      })
    "
    :actions="[
      { value: 'cancel', label: t('dialog.cancel') },
      { value: 'discard', label: t('worlds.discardChanges') },
      { value: 'restore', label: t('worlds.restore'), primary: true },
    ]"
    cancel="cancel"
    @choose="onRestoreChoice"
  />
</template>

<style scoped>
.fatal {
  padding: 32px;
  text-align: center;
}
</style>
