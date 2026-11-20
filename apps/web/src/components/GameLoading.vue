<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useKeyHelpBlocker } from '../input/keyHelp';

/** How long the bar takes to fill; App keeps the screen up at least this long. */
const props = defineProps<{ durationMs: number }>();
const { t } = useI18n();
useKeyHelpBlocker();

/** Playful status lines (i18n keys under game.loading.steps), shown one after another. */
const STEPS = ['terrain', 'dust', 'lamps', 'pistons', 'torches', 'levers'] as const;
const STEPS_SHOWN = 3;

const step = ref(Math.floor(Math.random() * STEPS.length));
let timer: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  timer = setInterval(
    () => (step.value = (step.value + 1) % STEPS.length),
    props.durationMs / STEPS_SHOWN,
  );
});
onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <div class="loading" role="status">
    <h1>{{ t('game.loading.title') }}</h1>
    <p class="step">{{ t(`game.loading.steps.${STEPS[step]}`) }}</p>
    <div class="bar" :style="{ animationDuration: `${durationMs}ms` }" />
  </div>
</template>

<style scoped>
.loading {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  background: #16171b;
  color: #fff;
  font: 28px var(--font-retro);
}

h1 {
  margin: 0;
  font: 34px var(--font-pixel);
  text-shadow: 3px 3px #000;
}

.step {
  margin: 0;
  color: #e0e0e0;
  text-shadow: 2px 2px #000;
}

/* The fill is a gradient sliding in from the left, in chunky steps like an old progress bar. */
.bar {
  width: min(400px, 70vw);
  height: 8px;
  border: 3px solid #000;
  background: linear-gradient(#80ff20, #80ff20) no-repeat left / 0% 100% #6f6f6f;
  box-shadow: 0 0 0 2px #8b8b8b;
  animation: fill steps(24, end) forwards;
}

@keyframes fill {
  to {
    background-size: 100% 100%;
  }
}
</style>
