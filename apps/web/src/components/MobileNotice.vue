<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useKeyHelpBlocker } from '../input/keyHelp';

const emit = defineEmits<{ dismiss: [] }>();
const { t } = useI18n();
useKeyHelpBlocker();
</script>

<template>
  <div class="mobile-notice" role="alertdialog" aria-labelledby="mobile-notice-title">
    <h1 id="mobile-notice-title">{{ t('app.title') }}</h1>
    <p>{{ t('mobile.unsupported') }}</p>
    <p class="later">{{ t('mobile.later') }}</p>
    <button type="button" class="anyway" @click="emit('dismiss')">
      {{ t('mobile.continueAnyway') }}
    </button>
  </div>
</template>

<style scoped>
.mobile-notice {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  box-sizing: border-box;
  padding: 24px;
  background: #16171b;
  color: #fff;
  font: 26px var(--font-retro);
  text-align: center;
}

h1 {
  margin: 0 0 12px;
  color: #ff3b2f;
  font: 56px var(--font-pixel);
  letter-spacing: 4px;
  text-shadow: 4px 4px 0 #5c1410;
}

p {
  max-width: 22em;
  margin: 0;
  text-shadow: 2px 2px #000;
}

.later {
  color: #b8b8b8;
}

/* Small on purpose: a way out for touch devices that do have a mouse and keyboard. */
.anyway {
  margin-top: 28px;
  padding: 4px 8px;
  border: none;
  background: none;
  color: #8a8a8a;
  font: 20px var(--font-retro);
  text-decoration: underline;
  cursor: pointer;
}
</style>
