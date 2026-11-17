<script setup lang="ts">
import { parseWorld, serializeWorld } from '@ruda/core';
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import { useI18n } from 'vue-i18n';
import ConfirmDialog from './components/ConfirmDialog.vue';
import EditorView from './components/EditorView.vue';
import WorldList from './components/WorldList.vue';
import type { OpenWorld } from './game/openWorld';
import type { LibraryHost } from './library/host';
import LibraryView from './library/LibraryView.vue';
import { fileErrorKey } from './storage/fileErrors';
import { WorldStore, type Recovery, type StoredWorld } from './storage/worldStore';

const { t, d } = useI18n();
const store = shallowRef<WorldStore>();
const storageUnavailable = ref(false);
const opened = shallowRef<OpenWorld>();
const restoring = shallowRef<{ stored: StoredWorld; recovery: Recovery }>();
const listError = ref<string>();

type Tab = 'worlds' | 'library';
const ADMIN_HASH = '#admin';
const tab = ref<Tab>('worlds');
const admin = ref(false);

/** The tab lives in the address (#library, #admin) so it survives reloads and can be linked. */
function readHash(): void {
  admin.value = location.hash === ADMIN_HASH;
  tab.value = admin.value || location.hash === '#library' ? 'library' : 'worlds';
}

function selectTab(next: Tab): void {
  location.hash = next === 'library' ? '#library' : '';
}

onMounted(async () => {
  readHash();
  window.addEventListener('hashchange', readHash);
  try {
    store.value = await WorldStore.open();
  } catch {
    storageUnavailable.value = true;
  }
});

onBeforeUnmount(() => window.removeEventListener('hashchange', readHash));

const libraryHost: LibraryHost = {
  async listWorlds() {
    return (await store.value?.list()) ?? [];
  },
  async loadWorld(id) {
    return (await store.value?.load(id))?.data;
  },
  async addWorld(name, data) {
    if (!store.value) throw new Error('Storage is not ready');
    const { world } = parseWorld(data);
    return (await store.value.create(name, serializeWorld(world, name))).id;
  },
  openWorld(id) {
    void openWorld(id);
  },
};

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
    <main v-else class="home">
      <h1>{{ t('app.title') }}</h1>
      <nav class="tabs" :aria-label="t('app.sections')">
        <button
          v-for="name in ['worlds', 'library'] as const"
          :key="name"
          type="button"
          class="tab"
          :class="{ active: tab === name }"
          :aria-current="tab === name ? 'page' : undefined"
          @click="selectTab(name)"
        >
          {{ t(`app.tabs.${name}`) }}
        </button>
      </nav>
      <WorldList
        v-if="tab === 'worlds'"
        :store="store"
        :error="listError"
        @open="openWorld"
        @error="(key) => (listError = key)"
      />
      <LibraryView v-else :host="libraryHost" :admin="admin" />
    </main>
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
.home {
  box-sizing: border-box;
  max-width: 960px;
  height: 100%;
  margin: 0 auto;
  padding: 32px 16px;
  overflow-y: auto;
}

h1 {
  margin: 0 0 16px;
  color: #ff3b2f;
  letter-spacing: 0.05em;
}

.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  border-bottom: 1px solid #33363d;
}

.tab {
  border: none;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  background: transparent;
  opacity: 0.7;
}

.tab.active {
  border-bottom-color: #ff3b2f;
  opacity: 1;
}

.fatal {
  padding: 32px;
  text-align: center;
}
</style>
