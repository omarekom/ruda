<script setup lang="ts">
import { createBlock } from '@ruda/core';
import { HOTBAR_SLOTS, type HotbarState } from '../game/hotbar';
import BlockIcon from './BlockIcon.vue';

defineProps<{ state: HotbarState }>();
const emit = defineEmits<{ select: [index: number] }>();
</script>

<template>
  <nav class="hotbar blocky-panel" :aria-label="$t('hotbar.label')">
    <button
      v-for="(type, index) in HOTBAR_SLOTS"
      :key="type"
      type="button"
      class="slot"
      :class="{ selected: index === state.selected }"
      :title="$t(`blocks.${type}`)"
      @click="emit('select', index)"
    >
      <BlockIcon :block="createBlock(type, state.facing)" :size="34" />
    </button>
  </nav>
</template>

<style scoped>
.hotbar {
  display: flex;
  gap: 3px;
  padding: 4px;
}

.slot {
  display: grid;
  place-items: center;
  width: 50px;
  height: 50px;
  padding: 0;
  border: none;
  border-radius: 0;
  background: #8b8b8b;
  box-shadow:
    inset 3px 3px 0 #373737,
    inset -3px -3px 0 #fff;
  cursor: pointer;
}

.slot:hover {
  background: #9d9d9d;
}

.slot.selected {
  outline: 4px solid #fff;
  box-shadow: inset 0 0 0 3px #000;
}
</style>
