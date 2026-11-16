<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, useTemplateRef } from 'vue';
import HotbarPanel from './components/HotbarPanel.vue';
import { Game } from './game/game';
import { createHotbarState, selectSlot } from './game/hotbar';

const hotbar = reactive(createHotbarState());
const canvas = useTemplateRef<HTMLCanvasElement>('canvas');
let game: Game | undefined;

onMounted(() => {
  if (!canvas.value) return;
  game = new Game(canvas.value, hotbar);
  game.start();
});

onBeforeUnmount(() => game?.stop());
</script>

<template>
  <canvas ref="canvas" class="world" />
  <p class="help">{{ $t('help.controls') }}</p>
  <HotbarPanel :state="hotbar" @select="(index) => selectSlot(hotbar, index)" />
</template>

<style scoped>
.world {
  display: block;
  width: 100%;
  height: 100%;
  cursor: crosshair;
  touch-action: none;
}

.help {
  position: absolute;
  top: 8px;
  left: 12px;
  margin: 0;
  font-size: 12px;
  opacity: 0.6;
  pointer-events: none;
}
</style>
