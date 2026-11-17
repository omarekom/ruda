<script setup lang="ts">
import { Simulation, type World } from '@ruda/core';
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue';
import { TickLoop } from '../game/tickLoop';
import { Camera } from '../renderer/camera';
import { Renderer } from '../renderer/renderer';
import type { Skin } from '../renderer/skins/skin';

/** A running world for decoration (e.g. behind the start screen); it cannot be edited. */
const props = defineProps<{ world: World; skin: Skin; cellSize: number }>();
const canvas = useTemplateRef<HTMLCanvasElement>('canvas');
const NO_OVERLAY = { hover: undefined, ghost: undefined } as const;

let loop: TickLoop | undefined;
let renderer: Renderer | undefined;
let observer: ResizeObserver | undefined;

function boundsCenter(world: World): [number, number] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  world.forEach((x, y) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });
  return minX > maxX ? [0.5, 0.5] : [(minX + maxX + 1) / 2, (minY + maxY + 1) / 2];
}

onMounted(() => {
  if (!canvas.value) return;
  const simulation = new Simulation(props.world);
  const camera = new Camera();
  camera.setCellSize(props.cellSize);
  camera.centerOn(...boundsCenter(props.world));
  const view = new Renderer(canvas.value, camera, props.skin);
  renderer = view;
  observer = new ResizeObserver(() => view.resize());
  observer.observe(canvas.value);
  view.resize();
  loop = new TickLoop(
    () => simulation.step(),
    (_dt, progress) => view.draw(simulation, NO_OVERLAY, progress),
  );
  loop.start();
});

watch(
  () => props.skin,
  (skin) => {
    if (renderer) renderer.skin = skin;
  },
);

onBeforeUnmount(() => {
  loop?.stop();
  observer?.disconnect();
});
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
