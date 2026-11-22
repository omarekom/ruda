<script setup lang="ts">
import { createBlock, type Block } from '@ruda/core';
import { onMounted, useTemplateRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { useKeyHelpBlocker } from '../input/keyHelp';
import { workshopSkin } from '../renderer/skins/workshop';
import BlockIcon from './BlockIcon.vue';
import PixelIcon, { type IconName } from './PixelIcon.vue';

/** What each version brought, as a picture: a block, or a pixel icon on a label's dark plate. */
type VersionIcon = { readonly block: Block } | { readonly label: IconName };

/** Versions from 1.1 on get an icon; 1.0 shows the power block it started with. */
const VERSION_ICONS: Readonly<Record<string, VersionIcon>> = {
  v1_0: { block: createBlock('power_block') },
  v1_1: { label: 'label' },
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
      <h2>
        <template v-if="version.icon">
          <BlockIcon
            v-if="'block' in version.icon"
            class="version-icon"
            :block="version.icon.block"
            :skin="workshopSkin"
            :size="32"
          />
          <span v-else class="version-icon plate"><PixelIcon :name="version.icon.label" /></span>
        </template>
        {{ version.heading }}
      </h2>
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
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 6px;
  color: #ffe14d;
  font-size: 26px;
  font-weight: normal;
}

.version-icon {
  flex: none;
}

/* Like a label on the canvas: light on a dark plate. */
.plate {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  background: rgba(0, 0, 0, 0.62);
  box-shadow: inset 0 0 0 2px #555;
  color: #fff;
  font-size: 24px;
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
