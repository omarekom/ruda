<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { keyLabel, useKeyHelpBlocker } from '../input/keyHelp';
import { scrollByKey } from '../input/scrollKeys';

const emit = defineEmits<{ done: [] }>();
const { t } = useI18n();
const list = useTemplateRef<HTMLElement>('list');
const done = useTemplateRef<HTMLElement>('done');

useKeyHelpBlocker();

/** Enter and Escape close the dialog; the other keys scroll the list like a scrollable page. */
function onKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === 'Escape') {
    event.preventDefault();
    emit('done');
    return;
  }
  if (event.key === 'Tab') {
    // The Done button is the dialog's only tab stop; the page behind it stays out of reach.
    event.preventDefault();
    done.value?.focus();
    return;
  }
  if (list.value && scrollByKey(list.value, event.key)) event.preventDefault();
}

onMounted(() => window.addEventListener('keydown', onKeyDown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown));

/** Each section lists actions (i18n keys under game.controls.actions) and the keys for them. */
const SECTIONS: readonly (readonly [
  section: string,
  rows: readonly (readonly [string, ...string[]])[],
])[] = [
  [
    'movement',
    [
      ['moveUp', 'W', '↑'],
      ['moveLeft', 'A', '←'],
      ['moveDown', 'S', '↓'],
      ['moveRight', 'D', '→'],
      ['pan', 'middleDrag'],
      ['edge', 'screenEdge'],
      ['zoom', 'wheel', '+', '−'],
    ],
  ],
  [
    'building',
    [
      ['place', 'leftClick', 'space'],
      ['break', 'rightClick', 'delete'],
      ['turn', 'R'],
      ['aim', 'leftDrag'],
      ['label', 'T', 'leftHold'],
    ],
  ],
  [
    'using',
    [
      ['lever', 'leftClick', 'space'],
      ['button', 'leftClick', 'space'],
      ['delay', 'leftClick', 'space'],
    ],
  ],
  [
    'game',
    [
      ['menu', 'Esc'],
      ['save', 'Ctrl+S'],
      ['debug', '/'],
      ['pause', 'P'],
      ['step', '.'],
      ['undo', 'Z'],
      ['redo', 'Shift+Z'],
    ],
  ],
  ['hotbar', [['slot', '1–9', '0']]],
];
</script>

<template>
  <div class="controls" role="dialog" :aria-label="t('game.controls.title')">
    <h1>{{ t('game.controls.title') }}</h1>
    <div ref="list" class="list blocky-scroll">
      <section v-for="[section, rows] in SECTIONS" :key="section">
        <h2>{{ t(`game.controls.sections.${section}`) }}</h2>
        <div v-for="[action, ...keys] in rows" :key="action" class="row">
          <span class="action">{{ t(`game.controls.actions.${action}`) }}</span>
          <span class="keys">
            <kbd v-for="key in keys" :key="key" class="blocky-key">{{ keyLabel(t, key) }}</kbd>
          </span>
        </div>
      </section>
    </div>
    <button ref="done" type="button" class="blocky-button done" autofocus @click="emit('done')">
      {{ t('game.controls.done') }}
    </button>
  </div>
</template>

<style scoped>
.controls {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 18px 0 20px;
  background: rgba(0, 0, 0, 0.72);
  color: #fff;
  font: 28px var(--font-retro);
}

h1 {
  margin: 0 0 14px;
  font: 34px var(--font-pixel);
  text-shadow: 3px 3px #000;
}

.list {
  flex: 1;
  width: 100%;
  border-top: 2px solid #000;
  border-bottom: 2px solid #000;
  background: rgba(0, 0, 0, 0.35);
  box-shadow:
    inset 0 2px 0 #3a3a3a,
    inset 0 -2px 0 #3a3a3a;
}

section {
  width: min(700px, 92vw);
  margin: 0 auto;
  padding: 6px 0 10px;
}

h2 {
  margin: 8px 0 6px;
  color: #fff;
  font: 28px var(--font-retro);
  text-align: center;
  text-shadow: 2px 2px #3f3f3f;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 2px 0;
}

.action {
  color: #e0e0e0;
  text-shadow: 2px 2px #000;
}

.keys {
  display: flex;
  gap: 6px;
}

kbd:first-child {
  min-width: 150px;
}

.done {
  width: min(480px, 80vw);
  margin-top: 16px;
  padding: 8px;
}
</style>
