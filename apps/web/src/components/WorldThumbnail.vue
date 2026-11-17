<script setup lang="ts">
import { parseWorld } from '@ruda/core';
import { onMounted, useTemplateRef, watch } from 'vue';
import { drawWorldPreview } from '../renderer/preview';
import type { Skin } from '../renderer/skins/skin';

/** A small still picture of a stored world; a world that fails to load stays blank. */
const props = defineProps<{ data: string; skin: Skin }>();
const canvas = useTemplateRef<HTMLCanvasElement>('canvas');

function draw(): void {
  if (!canvas.value) return;
  try {
    drawWorldPreview(canvas.value, parseWorld(props.data).world, props.skin);
  } catch {
    // Damaged worlds show no picture; opening them reports the problem.
  }
}

onMounted(draw);
watch(() => [props.data, props.skin], draw);
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
