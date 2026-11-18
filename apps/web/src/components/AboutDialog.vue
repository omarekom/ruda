<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { APP_VERSION } from '../version';

const emit = defineEmits<{ done: [] }>();
const { t } = useI18n();
const dialog = useTemplateRef<HTMLDialogElement>('dialog');

/** Public contact details and where the source of this version can be found. */
const CONTACT_EMAIL = 'om@omarek.cz';
const REPOSITORY_URL = 'https://github.com/omarekom/ruda';
/** Made from the last commit by `pnpm build` (scripts/sourceZip.ts); the dev server makes it on demand. */
const SOURCE_ARCHIVE = `ruda_v${APP_VERSION}.zip`;

onMounted(() => dialog.value?.showModal());

function onCancel(event: Event): void {
  event.preventDefault();
  emit('done');
}
</script>

<template>
  <dialog
    ref="dialog"
    class="about"
    :aria-label="t('about.title')"
    @cancel="onCancel"
    @keydown.stop
  >
    <h1>{{ t('app.title') }}</h1>
    <p>{{ t('about.description') }}</p>
    <p class="disclaimer">{{ t('about.disclaimer') }}</p>
    <p class="disclaimer">{{ t('about.madeWithClaude') }}</p>
    <table>
      <thead>
        <tr>
          <th scope="col">{{ t('about.contact') }}</th>
          <th scope="col" colspan="2">{{ t('about.source') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <a :href="`mailto:${CONTACT_EMAIL}`">{{ CONTACT_EMAIL }}</a>
          </td>
          <td>
            <a :href="REPOSITORY_URL" target="_blank" rel="noopener">{{ t('about.repository') }}</a>
          </td>
          <td>
            <a :href="SOURCE_ARCHIVE" download>{{ t('about.download') }}</a>
          </td>
        </tr>
      </tbody>
    </table>
    <button type="button" class="blocky-button" autofocus @click="emit('done')">
      {{ t('about.done') }}
    </button>
  </dialog>
</template>

<style scoped>
.about {
  width: min(640px, 92vw);
  padding: 22px 26px;
  border: 3px solid #000;
  border-radius: 0;
  background: rgba(20, 20, 24, 0.96);
  box-shadow: inset 0 0 0 2px #555;
  color: #fff;
  font: 26px var(--font-retro);
  text-align: left;
}

.about::backdrop {
  background: rgba(0, 0, 0, 0.6);
}

h1 {
  margin: 0 0 12px;
  color: #ff3b2f;
  font: 48px var(--font-pixel);
  text-shadow: 4px 4px #5c1410;
}

p {
  margin: 0 0 10px;
}

.disclaimer {
  color: #a8a8a8;
  font-size: 22px;
}

table {
  width: 100%;
  margin: 18px 0;
  border-collapse: collapse;
}

th,
td {
  padding: 4px 16px 4px 0;
  text-align: left;
}

th {
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  color: #ffe14d;
  font-weight: normal;
}

a {
  color: #fff;
}

button {
  display: block;
  margin-left: auto;
  padding: 4px 28px;
}
</style>
