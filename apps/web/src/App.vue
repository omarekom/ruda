<script setup lang="ts">
import {
  CURRENT_VERSION,
  fileVersion,
  parseWorld,
  serializeWorld,
  type LoadedWorld,
} from '@ruda/core';
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import { useI18n } from 'vue-i18n';
import ConfirmDialog from './components/ConfirmDialog.vue';
import GameLoading from './components/GameLoading.vue';
import GameWorlds from './components/GameWorlds.vue';
import KeyHelp from './components/KeyHelp.vue';
import StartScreen from './components/StartScreen.vue';
import WorldScreen from './components/WorldScreen.vue';
import type { OpenWorld } from './game/openWorld';
import type { LibraryHost } from './library/host';
import LibraryView from './library/LibraryView.vue';
import MobileNotice from './components/MobileNotice.vue';
import MotionNotice from './components/MotionNotice.vue';
import { readPreferences, writePreference } from './preferences';
import { createEmptyWorld, createWorld } from './storage/worldActions';
import { fileErrorKey } from './storage/fileErrors';
import { WorldStore, type Recovery, type StoredWorld } from './storage/worldStore';

const { t, d } = useI18n();
const store = shallowRef<WorldStore>();
const storageUnavailable = ref(false);
const opened = shallowRef<OpenWorld>();
const restoring = shallowRef<{ stored: StoredWorld; recovery: Recovery }>();
/** A world saved by an older version of Ruda, waiting for the player to agree to update it. */
const upgrading = shallowRef<{ stored: StoredWorld; loaded: LoadedWorld }>();
/** Why a world could not be opened (an i18n key) and which one, while the player is told. */
const openError = ref<{ readonly key: string; readonly world: string }>();
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

/** Ruda flashes by nature, so players who asked their browser for less motion are warned once per visit. */
const motionNoticeDismissed = ref(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);

/** The library is switched off for now: with this false its hashes lead nowhere and nothing links to it. */
const LIBRARY_ENABLED = false;
const ADMIN_HASH = '#admin';
const LIBRARY_HASH = '#library';
const admin = ref(false);

function readHash(): void {
  if (!LIBRARY_ENABLED) return;
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
  const { lastWorld } = readPreferences();
  if (lastWorld && (await openWorld(lastWorld))) return;
  const created = await createEmptyWorld(worlds, t('worlds.defaultName'));
  await openWorld(created.id);
}

/** Shows the loading screen for at least LOADING_SCREEN_MS while the world opens behind it. */
async function withLoadingScreen(open: () => void): Promise<void> {
  loadingScreen.value = true;
  open();
  await new Promise((resolve) => setTimeout(resolve, LOADING_SCREEN_MS));
  loadingScreen.value = false;
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
    // A copy from the library is a new world, created now.
    const { world } = parseWorld(data);
    return (await createWorld(store.value, name, world)).id;
  },
  openWorld(id) {
    leaveLibrary();
    void openWorld(id);
  },
};

/**
 * Opens a stored world; false if it is gone. Every question (newer unsaved changes, an update
 * from an older version) and every error comes first; the loading screen only once the world
 * is sure to open.
 */
async function openWorld(id: string): Promise<boolean> {
  if (!store.value) return false;
  const stored = await store.value.load(id);
  if (!stored) return false;
  const recovery = await store.value.loadRecovery(id);
  if (recovery && recovery.savedAt > stored.updatedAt) {
    restoring.value = { stored, recovery };
    return true;
  }
  if (recovery) await store.value.discardRecovery(id);
  await start(stored, stored.data, false);
  return true;
}

async function onRestoreChoice(choice: 'restore' | 'discard' | 'cancel'): Promise<void> {
  const target = restoring.value;
  restoring.value = undefined;
  if (!target || !store.value || choice === 'cancel') return;
  if (choice === 'restore') {
    await start(target.stored, target.recovery.data, true);
  } else {
    await store.value.discardRecovery(target.stored.id);
    await start(target.stored, target.stored.data, false);
  }
}

/** Opens the world in `data`, after asking to update it if an older version of Ruda saved it. */
async function start(stored: StoredWorld, data: string, restored: boolean): Promise<void> {
  let loaded: LoadedWorld;
  try {
    loaded = parseWorld(data);
  } catch (error) {
    openError.value = { key: fileErrorKey(error), world: stored.name };
    return;
  }
  const version = fileVersion(data);
  if (!restored && version !== undefined && version < CURRENT_VERSION) {
    upgrading.value = { stored, loaded };
    return;
  }
  await withLoadingScreen(() => show(stored, loaded, restored));
}

/** Updating rewrites the stored world in the current format, so it is asked only once. */
async function onUpgradeChoice(choice: 'open' | 'cancel'): Promise<void> {
  const target = upgrading.value;
  upgrading.value = undefined;
  if (!target || !store.value || choice === 'cancel') return;
  const { stored, loaded } = target;
  const data = serializeWorld(loaded.world, stored.name, loaded.created);
  await store.value.rename(stored.id, stored.name, data);
  await withLoadingScreen(() => show(stored, loaded, false));
}

function show(stored: StoredWorld, { world, created }: LoadedWorld, restored: boolean): void {
  opened.value = { id: stored.id, name: stored.name, world, created, restored };
  writePreference('lastWorld', stored.id);
  // Only for sorting and showing when it was played, so a failure is not worth reporting.
  store.value?.markPlayed(stored.id).catch(() => undefined);
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
  <GameLoading v-if="loadingScreen" :duration-ms="LOADING_SCREEN_MS" />
  <ConfirmDialog
    v-if="openError"
    blocky
    :subject="openError.world"
    :message="t(openError.key)"
    :actions="[{ value: 'ok', label: t('dialog.ok'), primary: true }]"
    cancel="ok"
    @choose="openError = undefined"
  />
  <ConfirmDialog
    v-if="upgrading"
    blocky
    :message="t('worlds.upgradePrompt', { name: upgrading.stored.name })"
    :actions="[
      { value: 'cancel', label: t('dialog.cancel') },
      { value: 'open', label: t('worlds.upgradeOpen'), primary: true },
    ]"
    cancel="cancel"
    @choose="onUpgradeChoice"
  />
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
  <MotionNotice
    v-if="!motionNoticeDismissed && screen !== 'library'"
    @dismiss="motionNoticeDismissed = true"
  />
  <KeyHelp />
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

.fatal {
  padding: 32px;
  text-align: center;
}
</style>
