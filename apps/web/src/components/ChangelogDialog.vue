<script setup lang="ts">
import { createBlock, type Block } from '@ruda/core';
import { onMounted, useTemplateRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { useKeyHelpBlocker } from '../input/keyHelp';
import { workshopSkin } from '../renderer/skins/workshop';
import BlockIcon from './BlockIcon.vue';
import PixelArt, { type PixelArtImage } from './PixelArt.vue';

/** What each version brought, as a picture: a block, or 16×16 pixel art in the blocks' style. */
type VersionIcon = { readonly block: Block } | { readonly art: PixelArtImage };

/** A speech bubble with writing in it, for the labels of 1.1. */
const SPEECH_BUBBLE: PixelArtImage = {
  palette: { '#': '#1a1a1a', w: '#f4f4f4', g: '#c8c8c8', k: '#3a3a3a' },
  rows: [
    '................',
    '..###########...',
    '.#wwwwwwwwwww#..',
    '#wwwwwwwwwwwww#.',
    '#wkkkkkkkkkkww#.',
    '#wwwwwwwwwwwww#.',
    '#wkkkkkkkwkkkw#.',
    '#wwwwwwwwwwwww#.',
    '#wkkkkkwwwwwwg#.',
    '#gwwwwwwwwwwgg#.',
    '.#gggwwwggggg#..',
    '..###ggg######..',
    '....#gg#........',
    '....#g#.........',
    '....##..........',
    '................',
  ],
};

const ICON_SIZE = 64;

/** Every minor version gets an icon for its main feature; 1.0 shows the power block. */
const VERSION_ICONS: Readonly<Record<string, VersionIcon>> = {
  v1_0: { block: createBlock('power_block') },
  v1_1: { art: SPEECH_BUBBLE },
};

const emit = defineEmits<{ done: [] }>();
const { t, te, tm, rt } = useI18n();
useKeyHelpBlocker();
const dialog = useTemplateRef<HTMLDialogElement>('dialog');

/** Newest first, as ordered in the locale file; the key "v1_0" stands for version 1.0. */
const versions = Object.keys(tm('changelog.versions') as Record<string, unknown>).map((key) => ({
  key,
  heading: heading(key),
  icon: VERSION_ICONS[key],
}));

/** The version number, followed by its informal name when it has one: "1.1 – Text update". */
function heading(key: string): string {
  const version = key.slice(1).replaceAll('_', '.');
  const name = `changelog.names.${key}`;
  return te(name) ? t('changelog.named', { version, name: t(name) }) : version;
}

function changes(key: string): string[] {
  return (tm(`changelog.versions.${key}`) as Parameters<typeof rt>[0][]).map((change) =>
    rt(change),
  );
}

onMounted(() => dialog.value?.showModal());

function onCancel(event: Event): void {
  event.preventDefault();
  emit('done');
}
</script>

<template>
  <dialog
    ref="dialog"
    class="changelog blocky-scroll"
    :aria-label="t('changelog.title')"
    @cancel="onCancel"
    @keydown.stop
  >
    <h1>{{ t('changelog.title') }}</h1>
    <section v-for="version in versions" :key="version.key">
      <template v-if="version.icon">
        <BlockIcon
          v-if="'block' in version.icon"
          class="version-icon"
          :block="version.icon.block"
          :skin="workshopSkin"
          :size="ICON_SIZE"
        />
        <PixelArt v-else class="version-icon" :image="version.icon.art" :size="ICON_SIZE" />
      </template>
      <h2>{{ version.heading }}</h2>
      <ul>
        <li v-for="change in changes(version.key)" :key="change">{{ change }}</li>
      </ul>
    </section>
    <button type="button" class="blocky-button" autofocus @click="emit('done')">
      {{ t('changelog.done') }}
    </button>
  </dialog>
</template>

<style scoped>
.changelog {
  width: min(640px, 92vw);
  max-height: 80vh;
  padding: 22px 26px;
  border: 3px solid #000;
  border-radius: 0;
  background: rgba(20, 20, 24, 0.96);
  box-shadow: inset 0 0 0 2px #555;
  color: #fff;
  font: 26px var(--font-retro);
  text-align: left;
}

.changelog::backdrop {
  background: rgba(0, 0, 0, 0.6);
}

h1 {
  margin: 0 0 12px;
  color: #ff3b2f;
  font: 48px var(--font-pixel);
  text-shadow: 4px 4px #5c1410;
}

h2 {
  margin: 0 0 6px;
  color: #ffe14d;
  font-size: 26px;
  font-weight: normal;
}

/* On the right, with the heading and the changes flowing around it. */
.version-icon {
  float: right;
  margin: 4px 0 8px 16px;
}

section {
  display: flow-root;
}

ul {
  margin: 0 0 14px;
  padding-left: 24px;
}

button {
  display: block;
  margin: 18px 0 0 auto;
  padding: 4px 28px;
}
</style>
