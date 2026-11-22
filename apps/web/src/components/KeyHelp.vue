<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { keyHelpRows, keyLabel } from '../input/keyHelp';
import { scrollByKey } from '../input/scrollKeys';

const { t } = useI18n();
const open = ref(false);
const list = useTemplateRef<HTMLElement>('list');

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

/**
 * Listens before every other key handler. While open, the overlay keeps key presses from the
 * screen behind it, except that the arrows and page keys scroll its list; key releases still
 * pass, so keys held down when it opened are let go.
 */
function onKeyDown(event: KeyboardEvent): void {
  if (open.value) {
    event.stopImmediatePropagation();
    if (event.key === '?' || event.key === 'Escape' || event.key === 'Tab') {
      event.preventDefault();
      if (event.key !== 'Tab') open.value = false;
    } else if (list.value && scrollByKey(list.value, event.key)) {
      event.preventDefault();
    }
    return;
  }
  if (event.key !== '?' || isTyping(event.target) || keyHelpRows.value.length === 0) return;
  event.stopImmediatePropagation();
  event.preventDefault();
  open.value = true;
}

watch(keyHelpRows, (rows) => {
  if (rows.length === 0) open.value = false;
});

onMounted(() => window.addEventListener('keydown', onKeyDown, { capture: true }));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown, { capture: true }));
</script>

<template>
  <div
    v-if="open"
    class="key-help"
    role="dialog"
    :aria-label="t('keyHelp.title')"
    @click="open = false"
  >
    <h1>{{ t('keyHelp.title') }}</h1>
    <div ref="list" class="rows blocky-panel blocky-scroll">
      <div v-for="[action, ...keys] in keyHelpRows" :key="action" class="row">
        <span class="action">{{ t(`keyHelp.actions.${action}`) }}</span>
        <span class="keys">
          <kbd v-for="key in keys" :key="key" class="blocky-key">{{ keyLabel(t, key) }}</kbd>
        </span>
      </div>
    </div>
    <p class="hint">{{ t('keyHelp.close') }}</p>
  </div>
</template>

<style scoped>
.key-help {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.72);
  color: #fff;
  font: 26px var(--font-retro);
  cursor: pointer;
}

h1 {
  margin: 0 0 12px;
  font: 34px var(--font-pixel);
  text-shadow: 3px 3px #000;
}

.rows {
  box-sizing: border-box;
  width: min(620px, 100%);
  max-height: 70vh;
  padding: 10px 18px;
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px 16px;
  padding: 3px 0;
}

.action {
  color: #e0e0e0;
  text-shadow: 2px 2px #000;
}

.keys {
  display: flex;
  gap: 6px;
}

.hint {
  margin: 12px 0 0;
  color: #bbb;
  text-shadow: 2px 2px #000;
}
</style>
