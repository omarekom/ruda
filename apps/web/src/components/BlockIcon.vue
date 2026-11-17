<script setup lang="ts">
import type { Block } from '@ruda/core';
import { onMounted, useTemplateRef, watch } from 'vue';
import { ISOLATED, type Skin } from '../renderer/skins/skin';

const props = withDefaults(defineProps<{ block: Block; skin: Skin; size?: number }>(), {
  size: 38,
});
const canvas = useTemplateRef<HTMLCanvasElement>('canvas');

function draw(): void {
  const g = canvas.value?.getContext('2d');
  if (!g || !canvas.value) return;
  const ratio = window.devicePixelRatio || 1;
  canvas.value.width = props.size * ratio;
  canvas.value.height = props.size * ratio;
  g.setTransform(ratio, 0, 0, ratio, 0, 0);
  props.skin.drawBlock(g, props.block, props.size, ISOLATED);
}

onMounted(draw);
watch(() => [props.block, props.skin, props.size], draw);
</script>

<template>
  <canvas ref="canvas" class="icon" :style="{ width: `${size}px`, height: `${size}px` }" />
</template>

<style scoped>
.icon {
  display: block;
}
</style>
