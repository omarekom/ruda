<script setup lang="ts">
import { computed } from 'vue';

/** A small multicoloured picture: one character per pixel, `.` transparent, others from the palette. */
export interface PixelArtImage {
  readonly palette: Readonly<Record<string, string>>;
  readonly rows: readonly string[];
}

const props = defineProps<{ image: PixelArtImage; size: number }>();

const pixels = computed(() =>
  props.image.rows.flatMap((row, y) =>
    [...row].flatMap((key, x) => {
      const fill = props.image.palette[key];
      return fill ? [{ x, y, fill }] : [];
    }),
  ),
);
const width = computed(() => Math.max(...props.image.rows.map((row) => row.length)));
</script>

<template>
  <svg
    :width="size"
    :height="size"
    :viewBox="`0 0 ${width} ${image.rows.length}`"
    shape-rendering="crispEdges"
    aria-hidden="true"
  >
    <rect
      v-for="pixel in pixels"
      :key="`${pixel.x},${pixel.y}`"
      :x="pixel.x"
      :y="pixel.y"
      width="1"
      height="1"
      :fill="pixel.fill"
    />
  </svg>
</template>
