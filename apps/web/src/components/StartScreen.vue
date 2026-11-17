<script setup lang="ts">
import { CREATIONS } from '@ruda/creations';
import { useI18n } from 'vue-i18n';
import type { Mode } from '../game/mode';
import { pixelSkin } from '../renderer/skins/pixel';
import { sketchDarkSkin, sketchLightSkin } from '../renderer/skins/sketch';
import { isDark } from '../theme';
import LiveWorld from './LiveWorld.vue';

const emit = defineEmits<{ choose: [mode: Mode] }>();
const { t } = useI18n();

function creationWorld(slug: string) {
  const creation = CREATIONS.find((candidate) => candidate.slug === slug) ?? CREATIONS[0];
  if (!creation) throw new Error('No built-in creations');
  return creation.build().world;
}

const gameWorld = creationWorld('light-chaser');
const expertWorld = creationWorld('clocks');
const EXPERT_POINTS = ['time', 'inspect', 'overview', 'big'] as const;
</script>

<template>
  <main class="start">
    <section class="half play" @click="emit('choose', 'game')">
      <LiveWorld class="backdrop" :world="gameWorld" :skin="pixelSkin" :cell-size="44" />
      <div class="content">
        <h1 class="logo">{{ t('app.title') }}</h1>
        <span class="tagline">{{ t('start.tagline') }}</span>
        <button
          type="button"
          class="blocky-button play-button"
          @click.stop="emit('choose', 'game')"
        >
          {{ t('start.play') }}
        </button>
        <p class="hint">{{ t('start.playHint') }}</p>
      </div>
      <p class="remember">{{ t('start.remember') }}</p>
    </section>

    <section class="half tools sketchy" :class="{ dark: isDark }" @click="emit('choose', 'expert')">
      <LiveWorld
        class="backdrop"
        :world="expertWorld"
        :skin="isDark ? sketchDarkSkin : sketchLightSkin"
        :cell-size="30"
      />
      <div class="content">
        <h2>{{ t('modes.expert') }}</h2>
        <ul>
          <li v-for="point in EXPERT_POINTS" :key="point">
            {{ t(`start.expertPoints.${point}`) }}
          </li>
        </ul>
        <button
          type="button"
          class="sketch-button open-button"
          @click.stop="emit('choose', 'expert')"
        >
          {{ t('start.openExpert') }}
        </button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.start {
  display: flex;
  height: 100%;
  overflow: hidden;
}

.half {
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: flex-grow 0.35s ease;
}

/* The backdrop keeps the full window width while the halves grow and shrink on hover,
   so hovering never resizes (and redraws) the running worlds. */
.backdrop {
  position: absolute;
  top: 0;
  left: 50%;
  width: 100vw;
  height: 100%;
  transform: translateX(-50%);
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
  text-align: center;
}

.play {
  flex-grow: 2;
  background: #1d1f24;
}

.play:hover {
  flex-grow: 2.2;
}

.play .content {
  background:
    radial-gradient(ellipse 45% 40% at center, rgba(17, 18, 22, 0.85), transparent),
    rgba(17, 18, 22, 0.45);
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
}

@keyframes pulse {
  to {
    transform: rotate(-12deg) scale(1.1);
  }
}

.play-button {
  padding: 10px 60px;
  font-size: 34px;
}

.hint {
  max-width: 420px;
  margin: 0;
  color: #ccc;
  font: 24px var(--font-retro);
  text-shadow: 2px 2px #000;
}

.remember {
  position: absolute;
  right: 0;
  bottom: 12px;
  left: 0;
  margin: 0;
  color: #888;
  font: 18px var(--font-retro);
  text-align: center;
}

.tools {
  flex-grow: 1;
  border-left: 4px solid #000;
  background: var(--paper);
}

.tools:hover {
  flex-grow: 1.2;
}

.tools .backdrop {
  opacity: 0.45;
}

.tools .content {
  background: radial-gradient(
    ellipse 60% 38% at center,
    color-mix(in srgb, var(--paper) 95%, transparent) 40%,
    transparent
  );
}

.tools h2 {
  margin: 0;
  font: 56px var(--font-hand-title);
  transform: rotate(-2deg);
}

.tools ul {
  margin: 0;
  padding-left: 22px;
  font-size: 21px;
  text-align: left;
}

.open-button {
  font-size: 22px;
}

@media (prefers-reduced-motion: reduce) {
  .half {
    transition: none;
  }

  .tagline {
    animation: none;
  }
}

@media (max-width: 800px) {
  .start {
    flex-direction: column;
  }

  .tools {
    border-top: 4px solid #000;
    border-left: none;
  }

  .logo {
    font-size: 72px;
  }

  .tagline {
    margin-left: 200px;
  }
}
</style>
