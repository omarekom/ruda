<script setup lang="ts">
import { parseWorld, serializeWorld } from '@ruda/core';
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import { useI18n } from 'vue-i18n';
import ConfirmDialog from './components/ConfirmDialog.vue';
import GameLoading from './components/GameLoading.vue';
import GameWorlds from './components/GameWorlds.vue';
import StartScreen from './components/StartScreen.vue';
import WorldScreen from './components/WorldScreen.vue';
import type { OpenWorld } from './game/openWorld';
import type { LibraryHost } from './library/host';
import LibraryView from './library/LibraryView.vue';
import MobileNotice from './components/MobileNotice.vue';
import { readPreferences, writePreference } from './preferences';
import { createEmptyWorld } from './storage/worldActions';
import { fileErrorKey } from './storage/fileErrors';
import { WorldStore, type Recovery, type StoredWorld } from './storage/worldStore';

const { t, d } = useI18n();
const store = shallowRef<WorldStore>();
const storageUnavailable = ref(false);
const opened = shallowRef<OpenWorld>();
const restoring = shallowRef<{ stored: StoredWorld; recovery: Recovery }>();
const openError = ref<string>();
/** What shows while no world is open; the library only through its link (#library, #admin). */
const screen = ref<'start' | 'worlds' | 'library'>('start');
/**
 * Opening a world shows a loading screen, kept up a little longer than needed because it is
 * part of the fun.
 */
const LOADING_SCREEN_MS = 1200;
const loadingScreen = ref(false);

/**
 * The game needs a mouse and a keyboard; on touch-only devices (phones, most tablets) it shows
 * a notice instead, which the player may dismiss. The library works on any device.
 */
const touchOnly = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
const mobileNoticeDismissed = ref(false);

const ADMIN_HASH = '#admin';
const LIBRARY_HASH = '#library';
const admin = ref(false);

function readHash(): void {
  admin.value = location.hash === ADMIN_HASH;
  if (admin.value || location.hash === LIBRARY_HASH) screen.value = 'library';
  else if (screen.value === 'library') screen.value = 'start';
}

function leaveLibrary(): void {
  location.hash = '';
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

/** From the start screen: continue the last world, or start a fresh one. */
async function play(): Promise<void> {
  const worlds = store.value;
  if (!worlds) return;
  await withLoadingScreen(async () => {
    const { lastWorld } = readPreferences();
    if (lastWorld && (await loadWorld(lastWorld))) return true;
    const created = await createEmptyWorld(worlds, t('worlds.defaultName'));
    return loadWorld(created.id);
  });
}

async function withLoadingScreen(load: () => Promise<boolean>): Promise<boolean> {
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
    leaveLibrary();
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
    // Only for sorting and showing when it was played, so a failure is not worth reporting.
    store.value?.markPlayed(stored.id).catch(() => undefined);
    openError.value = undefined;
  } catch (error) {
    openError.value = fileErrorKey(error);
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
      @close="
        opened = undefined;
        screen = 'worlds';
      "
      @start-screen="
        opened = undefined;
        screen = 'start';
      "
    />
    <main v-else-if="screen === 'library'" class="library">
      <header class="masthead">
        <h1>{{ t('app.title') }}</h1>
        <button type="button" @click="leaveLibrary">{{ t('app.backToGame') }}</button>
      </header>
      <LibraryView :host="libraryHost" :admin="admin" />
    </main>
    <GameWorlds
      v-else-if="screen === 'worlds'"
      :store="store"
      @open="openWorld"
      @back="screen = 'start'"
    />
    <StartScreen v-else @play="play" @worlds="screen = 'worlds'" />
  </template>
  <p v-if="openError" class="open-error" role="alert" @click="openError = undefined">
    {{ t(openError) }}
  </p>
  <!-- The loading screen stays behind the question about unsaved changes, if one comes up. -->
  <GameLoading v-if="loadingScreen || restoring" :duration-ms="LOADING_SCREEN_MS" />
  <ConfirmDialog
    v-if="restoring"
    blocky
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
  <MobileNotice
    v-if="touchOnly && !mobileNoticeDismissed && screen !== 'library'"
    @dismiss="mobileNoticeDismissed = true"
  />
</template>

<style scoped>
.library {
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

.open-error {
  position: fixed;
  bottom: 24px;
  left: 50%;
  margin: 0;
  padding: 6px 16px;
  border: 3px solid #000;
  background: rgba(20, 20, 24, 0.95);
  color: #ff8a80;
  font: 26px var(--font-retro);
  transform: translateX(-50%);
  cursor: pointer;
}

.fatal {
  padding: 32px;
  text-align: center;
}
</style>
