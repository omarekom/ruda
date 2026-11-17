<script setup lang="ts">
import { Simulation, type World } from '@ruda/core';
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue';
import { TickLoop } from '../game/tickLoop';
import { Camera } from '../renderer/camera';
import { crossfade } from '../renderer/crossfade';
import { Renderer } from '../renderer/renderer';
import type { Skin } from '../renderer/skins/skin';

/** A world for decoration (e.g. on the start screen); it cannot be edited. */
const props = withDefaults(
  defineProps<{
    world: World;
    skin: Skin;
    cellSize: number;
    /** Simulation speed as a multiple of the normal rate. */
    speed?: number;
    /** Drawn once as a still picture, without running the simulation. */
    still?: boolean;
  }>(),
  { speed: 1, still: false },
);
const canvas = useTemplateRef<HTMLCanvasElement>('canvas');
const NO_OVERLAY = { hover: undefined, ghost: undefined } as const;
const FINISHED_TICK = 1;

let loop: TickLoop | undefined;
let renderer: Renderer | undefined;
let observer: ResizeObserver | undefined;
const simulation = new Simulation(props.world);

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

function drawStill(): void {
  renderer?.draw(simulation, NO_OVERLAY, FINISHED_TICK);
}

onMounted(() => {
  if (!canvas.value) return;
  const camera = new Camera();
  camera.setCellSize(props.cellSize);
  camera.centerOn(...boundsCenter(props.world));
  const view = new Renderer(canvas.value, camera, props.skin);
  renderer = view;
  observer = new ResizeObserver(() => {
    view.resize();
    if (props.still) drawStill();
  });
  observer.observe(canvas.value);
  view.resize();
  if (props.still) {
    drawStill();
    return;
  }
  loop = new TickLoop(
    () => simulation.step(),
    (_dt, progress) => view.draw(simulation, NO_OVERLAY, progress),
  );
  loop.speed = props.speed;
  loop.start();
});

watch(
  () => props.skin,
  (skin) => {
    if (!renderer || !canvas.value) return;
    crossfade(canvas.value);
    renderer.skin = skin;
    if (props.still) drawStill();
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
