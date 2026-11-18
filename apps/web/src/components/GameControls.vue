<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const emit = defineEmits<{ done: [] }>();
const { t } = useI18n();

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
      ['place', 'rightClick'],
      ['break', 'leftClick'],
      ['turn', 'R'],
      ['aim', 'rightDrag'],
    ],
  ],
  [
    'using',
    [
      ['lever', 'rightClick'],
      ['button', 'rightClick'],
      ['delay', 'rightClick'],
    ],
  ],
  [
    'game',
    [
      ['menu', 'Esc'],
      ['save', 'Ctrl+S'],
      ['debug', '/'],
    ],
  ],
  ['hotbar', [['slot', '1–9', '0']]],
];

/** Keys written as words (mouse buttons) are translated; letters and symbols are shown as is. */
function keyLabel(key: string): string {
  return /^[a-z]/.test(key) ? t(`game.controls.keys.${key}`) : key;
}
</script>

<template>
  <div class="controls" role="dialog" :aria-label="t('game.controls.title')">
    <h1>{{ t('game.controls.title') }}</h1>
    <div class="list">
      <section v-for="[section, rows] in SECTIONS" :key="section">
        <h2>{{ t(`game.controls.sections.${section}`) }}</h2>
        <div v-for="[action, ...keys] in rows" :key="action" class="row">
          <span class="action">{{ t(`game.controls.actions.${action}`) }}</span>
          <span class="keys">
            <kbd v-for="key in keys" :key="key">{{ keyLabel(key) }}</kbd>
          </span>
        </div>
      </section>
    </div>
    <button type="button" class="blocky-button done" autofocus @click="emit('done')">
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
  overflow-y: auto;
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

kbd {
  min-width: 150px;
  padding: 2px 10px;
  border: 3px solid #000;
  background: #6f6f6f;
  box-shadow:
    inset -3px -3px 0 #444,
    inset 3px 3px 0 #a0a0a0;
  color: #fff;
  font: 26px/28px var(--font-retro);
  text-align: center;
  text-shadow: 2px 2px #333;
}

.keys kbd + kbd {
  min-width: 56px;
}

.done {
  width: min(480px, 80vw);
  margin-top: 16px;
  padding: 8px;
}
</style>
