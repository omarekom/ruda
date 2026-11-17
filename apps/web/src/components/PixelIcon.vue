<script setup lang="ts">
import { computed } from 'vue';

/** 9×9 pixel pictures; '#' is a filled pixel. They take the text colour. */
const ICONS = {
  sun: [
    '....#....',
    '.#.....#.',
    '...###...',
    '..#####..',
    '#.#####.#',
    '..#####..',
    '...###...',
    '.#.....#.',
    '....#....',
  ],
  moon: [
    '...###...',
    '..###....',
    '.###.....',
    '.###.....',
    '.###.....',
    '.####....',
    '..######.',
    '...####..',
    '.........',
  ],
  trash: [
    '...###...',
    '#########',
    '.#######.',
    '.#.#.#.#.',
    '.#.#.#.#.',
    '.#.#.#.#.',
    '.#.#.#.#.',
    '.#######.',
    '.........',
  ],
  download: [
    '....#....',
    '....#....',
    '....#....',
    '..#.#.#..',
    '...###...',
    '....#....',
    '.........',
    '#.......#',
    '#########',
  ],
  menu: [
    '.........',
    '#########',
    '#########',
    '.........',
    '#########',
    '#########',
    '.........',
    '#########',
    '#########',
  ],
} as const satisfies Record<string, readonly string[]>;

export type IconName = keyof typeof ICONS;

const props = defineProps<{ name: IconName }>();

/** One SVG path of unit squares, so the icon stays crisp at any size. */
const path = computed(() =>
  ICONS[props.name]
    .flatMap((row, y) => [...row].map((pixel, x) => (pixel === '#' ? `M${x} ${y}h1v1h-1z` : '')))
    .join(''),
);
</script>

<template>
  <svg class="pixel-icon" viewBox="0 0 9 9" shape-rendering="crispEdges" aria-hidden="true">
    <path :d="path" fill="currentColor" />
  </svg>
</template>

<style scoped>
.pixel-icon {
  display: block;
  width: 1em;
  height: 1em;
}
</style>
