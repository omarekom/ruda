<script setup lang="ts">
import { parseWorld, serializeWorld } from '@ruda/core';
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import { useI18n } from 'vue-i18n';
import ConfirmDialog from './components/ConfirmDialog.vue';
import GameLoading from './components/GameLoading.vue';
import GameWorlds from './components/GameWorlds.vue';
import StartScreen from './components/StartScreen.vue';
import WorldScreen from './components/WorldScreen.vue';
import WorldList from './components/WorldList.vue';
import type { Mode } from './game/mode';
import type { OpenWorld } from './game/openWorld';
import type { LibraryHost } from './library/host';
import LibraryView from './library/LibraryView.vue';
import { readPreferences, writePreference } from './preferences';
import { createEmptyWorld } from './storage/worldActions';
import { fileErrorKey } from './storage/fileErrors';
import { WorldStore, type Recovery, type StoredWorld } from './storage/worldStore';

const { t, d } = useI18n();
const store = shallowRef<WorldStore>();
const storageUnavailable = ref(false);
const opened = shallowRef<OpenWorld>();
const restoring = shallowRef<{ stored: StoredWorld; recovery: Recovery }>();
const listError = ref<string>();
const mode = ref<Mode>(readPreferences().mode ?? 'game');
/**
 * What shows while no world is open; 'loading' until the first decision is made. Game mode
 * has its own world selection ('gameWorlds'); 'home' is the shared world list and library.
 */
const screen = ref<'loading' | 'start' | 'home' | 'gameWorlds'>('loading');
/**
 * Game mode covers loading a world with a loading screen, kept up a little longer than needed
 * because it is part of the fun. Expert mode opens worlds without it.
 */
const LOADING_SCREEN_MS = 1200;
const loadingScreen = ref(false);

/** The world list that belongs to the current mode. */
const worldsScreen = (): 'home' | 'gameWorlds' => (mode.value === 'game' ? 'gameWorlds' : 'home');

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
    return;
  }
  await resume();
});

/**
 * The first visit shows the start screen. Later visits go straight back to the last world
 * in the last mode, except when the address links to a tab such as the library.
 */
async function resume(): Promise<void> {
  const { mode: lastMode, lastWorld } = readPreferences();
  if (location.hash || !lastMode) {
    screen.value = location.hash ? 'home' : 'start';
    return;
  }
  if (lastWorld) await openWorld(lastWorld);
  screen.value = worldsScreen();
}

function setMode(next: Mode): void {
  mode.value = next;
  writePreference('mode', next);
}

/** From the start screen: continue the last world, or start a fresh one. */
async function play(next: Mode): Promise<void> {
  setMode(next);
  const worlds = store.value;
  if (!worlds) return;
  await withLoadingScreen(async () => {
    const { lastWorld } = readPreferences();
    if (lastWorld && (await loadWorld(lastWorld))) return true;
    const created = await createEmptyWorld(worlds, t('worlds.defaultName'));
    return loadWorld(created.id);
  });
  screen.value = worldsScreen();
}

/** Runs `load` behind game mode's loading screen; in expert mode it simply runs it. */
async function withLoadingScreen(load: () => Promise<boolean>): Promise<boolean> {
  if (mode.value !== 'game') return load();
  loadingScreen.value = true;
  try {
    const [found] = await Promise.all([
      load(),
      new Promise((resolve) => setTimeout(resolve, LOADING_SCREEN_MS)),
    ]);
    return found;
  } finally {
    loadingScreen.value = false;
  }
}

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

/** Opens a stored world (asking first if it has newer unsaved changes); false if it is gone. */
function openWorld(id: string): Promise<boolean> {
  return withLoadingScreen(() => loadWorld(id));
}

async function loadWorld(id: string): Promise<boolean> {
  if (!store.value) return false;
  const stored = await store.value.load(id);
  if (!stored) return false;
  const recovery = await store.value.loadRecovery(id);
  if (recovery && recovery.savedAt > stored.updatedAt) {
    restoring.value = { stored, recovery };
    return true;
  }
  if (recovery) await store.value.discardRecovery(id);
  show(stored, stored.data, false);
  return true;
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
    writePreference('lastWorld', stored.id);
    listError.value = undefined;
  } catch (error) {
    listError.value = fileErrorKey(error);
  }
}
</script>

<template>
  <p v-if="storageUnavailable" class="fatal" role="alert">{{ t('app.storageUnavailable') }}</p>
  <template v-else-if="store">
    <WorldScreen
      v-if="opened"
      :store="store"
      :world="opened"
      :mode="mode"
      @switch-mode="setMode"
      @close="
        opened = undefined;
        screen = worldsScreen();
      "
      @start-screen="
        opened = undefined;
        screen = 'start';
      "
    />
    <StartScreen v-else-if="screen === 'start'" @choose="play" />
    <GameWorlds
      v-else-if="screen === 'gameWorlds'"
      :store="store"
      @open="openWorld"
      @back="screen = 'start'"
    />
    <main v-else-if="screen === 'home'" class="home">
      <header class="masthead">
        <h1>{{ t('app.title') }}</h1>
        <button type="button" @click="screen = 'start'">{{ t('app.startScreen') }}</button>
      </header>
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
  <!-- The loading screen stays behind the question about unsaved changes, if one comes up. -->
  <GameLoading
    v-if="loadingScreen || (restoring && mode === 'game')"
    :duration-ms="LOADING_SCREEN_MS"
  />
  <ConfirmDialog
    v-if="restoring"
    :blocky="mode === 'game'"
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

.masthead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

h1 {
  margin: 0;
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
