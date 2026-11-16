<script setup lang="ts">
import type { Block } from '@ruda/core';
import { onMounted, useTemplateRef, watch } from 'vue';
import { drawBlock, ISOLATED } from '../renderer/looks';

const SIZE = 38;
const props = defineProps<{ block: Block }>();
const canvas = useTemplateRef<HTMLCanvasElement>('canvas');

function draw(): void {
  const g = canvas.value?.getContext('2d');
  if (!g || !canvas.value) return;
  const ratio = window.devicePixelRatio || 1;
  canvas.value.width = SIZE * ratio;
  canvas.value.height = SIZE * ratio;
  g.setTransform(ratio, 0, 0, ratio, 0, 0);
  drawBlock(g, props.block, SIZE, ISOLATED);
}

onMounted(draw);
watch(() => props.block, draw);
</script>

<template>
  <canvas ref="canvas" class="icon" :style="{ width: `${SIZE}px`, height: `${SIZE}px` }" />
</template>

<style scoped>
.icon {
  display: block;
}
</style>
