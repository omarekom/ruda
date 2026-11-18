<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue';
import { useI18n } from 'vue-i18n';

const emit = defineEmits<{ done: [] }>();
const { t } = useI18n();
const dialog = useTemplateRef<HTMLDialogElement>('dialog');

/** Public contact details and where the source of this version can be found. */
const CONTACT_EMAIL = 'om@omarek.cz';
const REPOSITORY_URL = 'https://github.com/omarekom/ruda';
/** Written next to the built app by `pnpm build`; see apps/web/package.json. */
const SOURCE_ARCHIVE = 'ruda-source.zip';

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
    <dl>
      <dt>{{ t('about.contact') }}</dt>
      <dd>
        <a :href="`mailto:${CONTACT_EMAIL}`">{{ CONTACT_EMAIL }}</a>
      </dd>
      <dt>{{ t('about.source') }}</dt>
      <dd>
        <a :href="REPOSITORY_URL" target="_blank" rel="noopener">{{ t('about.repository') }}</a>
        ·
        <a :href="SOURCE_ARCHIVE" download>{{ t('about.download') }}</a>
      </dd>
    </dl>
    <button type="button" class="blocky-button" autofocus @click="emit('done')">
      {{ t('about.done') }}
    </button>
  </dialog>
</template>

<style scoped>
.about {
  width: min(560px, 92vw);
  padding: 20px 24px;
  border: 3px solid #000;
  border-radius: 0;
  background: rgba(20, 20, 24, 0.96);
  box-shadow: inset 0 0 0 2px #555;
  color: #fff;
  font: 26px var(--font-retro);
  text-align: center;
}

.about::backdrop {
  background: rgba(0, 0, 0, 0.6);
}

h1 {
  margin: 0 0 10px;
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

dl {
  margin: 16px 0;
}

dt {
  color: #ffe14d;
}

dd {
  margin: 0 0 8px;
}

a {
  color: #fff;
}

button {
  padding: 4px 28px;
}
</style>
