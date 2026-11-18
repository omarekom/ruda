<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue';
import { useI18n } from 'vue-i18n';

const emit = defineEmits<{ dismiss: [] }>();
const { t } = useI18n();
const button = useTemplateRef<HTMLButtonElement>('button');

onMounted(() => button.value?.focus());
</script>

<template>
  <div
    class="motion-notice"
    role="alertdialog"
    aria-labelledby="motion-notice-title"
    aria-describedby="motion-notice-text"
    @keydown.esc="emit('dismiss')"
  >
    <h1 id="motion-notice-title">{{ t('motion.title') }}</h1>
    <p id="motion-notice-text">{{ t('motion.warning') }}</p>
    <button ref="button" type="button" class="blocky-button" @click="emit('dismiss')">
      {{ t('motion.continue') }}
    </button>
  </div>
</template>

<style scoped>
.motion-notice {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  box-sizing: border-box;
  padding: 24px;
  background: #16171b;
  color: #fff;
  font: 26px var(--font-retro);
  text-align: center;
}

h1 {
  margin: 0 0 12px;
  color: #ffe14d;
  font: 48px var(--font-pixel);
  letter-spacing: 4px;
  text-shadow: 4px 4px 0 #5c4a00;
}

p {
  max-width: 24em;
  margin: 0 0 20px;
  text-shadow: 2px 2px #000;
}

.blocky-button {
  padding: 8px 32px;
}
</style>
