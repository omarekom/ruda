<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { focusHoveredButton, isArrowKey, moveFocus } from '../input/focusNavigation';
import { lightRing } from '../start/lightRing';
import { worldSkin } from '../theme';
import AboutDialog from './AboutDialog.vue';
import GameControls from './GameControls.vue';
import LiveWorld from './LiveWorld.vue';
import ThemeToggle from './ThemeToggle.vue';

const emit = defineEmits<{ play: []; worlds: [] }>();
const { t } = useI18n();

const backdrop = lightRing();
const showControls = ref(false);
const showAbout = ref(false);
const screen = useTemplateRef<HTMLElement>('screen');

function onKeyDown(event: KeyboardEvent): void {
  if (showControls.value || showAbout.value || !isArrowKey(event.key)) return;
  event.preventDefault();
  const buttons = screen.value?.querySelectorAll<HTMLElement>('.buttons button, .corner button, .about-button');
  moveFocus([...(buttons ?? [])], event.key);
}

onMounted(() => window.addEventListener('keydown', onKeyDown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown));
</script>

<template>
  <main ref="screen" class="start" @pointerover="focusHoveredButton">
    <LiveWorld class="backdrop" :world="backdrop" :skin="worldSkin" :cell-size="56" :speed="0.4" />
    <div class="content">
      <h1 class="logo">{{ t('app.title') }}</h1>
      <span class="tagline">{{ t('start.tagline') }}</span>
      <div class="buttons">
        <button type="button" class="blocky-button play" @click="emit('play')">
          {{ t('start.play') }}
        </button>
        <button type="button" class="blocky-button" @click="emit('worlds')">
          {{ t('start.worlds') }}
        </button>
        <button type="button" class="blocky-button" @click="showControls = true">
          {{ t('start.controls') }}
        </button>
      </div>
    </div>
    <!-- After the menu in the page, so Tab reaches Play first and the toggle last. -->
    <div class="corner"><ThemeToggle /></div>
    <button type="button" class="about-button" @click="showAbout = true">
      {{ t('about.open') }}
    </button>
    <AboutDialog v-if="showAbout" @done="showAbout = false" />
    <GameControls v-if="showControls" @done="showControls = false" />
  </main>
</template>

<style scoped>
.start {
  position: relative;
  height: 100%;
  overflow: hidden;
  background: #1d1f24;
}

.backdrop {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.corner {
  position: absolute;
  top: 14px;
  right: 14px;
}

.about-button {
  position: absolute;
  bottom: 12px;
  left: 14px;
  padding: 2px 6px;
  border: 0;
  background: none;
  color: #fff;
  font: 22px var(--font-retro);
  opacity: 0.45;
  text-shadow: 2px 2px #000;
  cursor: pointer;
}

.about-button:hover,
.about-button:focus-visible {
  opacity: 1;
}

.content {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  box-sizing: border-box;
  height: 100%;
  padding: 24px;
  pointer-events: none;
}

.content > * {
  pointer-events: auto;
}

.logo {
  margin: 0;
  color: #ff3b2f;
  font: 120px var(--font-pixel);
  letter-spacing: 8px;
  line-height: 1;
  text-shadow:
    8px 8px 0 #5c1410,
    0 0 60px rgba(255, 59, 47, 0.35);
}

.tagline {
  margin: -34px 0 0 360px;
  color: #ffe14d;
  font: 26px var(--font-retro);
  text-shadow: 2px 2px #3b2a00;
  transform: rotate(-12deg);
  animation: pulse 0.6s infinite alternate ease-in-out;
  pointer-events: none;
}

@keyframes pulse {
  to {
    transform: rotate(-12deg) scale(1.1);
  }
}

.buttons {
  display: grid;
  gap: 10px;
  width: min(420px, 90vw);
  margin-top: 12px;
}

.buttons .blocky-button {
  padding: 8px;
}

.buttons .play {
  font-size: 38px;
}

@media (prefers-reduced-motion: reduce) {
  .tagline {
    animation: none;
  }
}

@media (max-width: 800px) {
  .logo {
    font-size: 72px;
  }

  .tagline {
    margin-left: 200px;
  }
}
</style>
