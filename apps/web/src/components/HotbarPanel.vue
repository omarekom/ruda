<script setup lang="ts">
import { createBlock } from '@ruda/core';
import { HOTBAR_SLOTS, type HotbarState } from '../game/hotbar';
import BlockIcon from './BlockIcon.vue';

defineProps<{ state: HotbarState }>();
const emit = defineEmits<{ select: [index: number] }>();
</script>

<template>
  <nav class="hotbar" :aria-label="$t('hotbar.label')">
    <button
      v-for="(type, index) in HOTBAR_SLOTS"
      :key="type"
      type="button"
      class="slot"
      :class="{ selected: index === state.selected }"
      :title="$t('hotbar.slot', { key: index + 1, name: $t(`blocks.${type}`) })"
      @click="emit('select', index)"
    >
      <BlockIcon :block="createBlock(type, state.facing)" />
      <span class="key">{{ index + 1 }}</span>
    </button>
  </nav>
</template>

<style scoped>
.hotbar {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
  padding: 4px;
  background: rgba(0, 0, 0, 0.55);
  border-radius: 6px;
}

.slot {
  position: relative;
  width: 52px;
  height: 52px;
  padding: 5px;
  border: 2px solid transparent;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  cursor: pointer;
}

.slot.selected {
  border-color: #f0f0f0;
}

.key {
  position: absolute;
  top: 1px;
  left: 4px;
  font-size: 11px;
  color: #ddd;
  text-shadow: 0 0 2px #000;
}
</style>
