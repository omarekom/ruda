<script setup lang="ts">
import { createBlock } from '@ruda/core';
import { HOTBAR_SLOTS, type HotbarState } from '../game/hotbar';
import { workshopSkin } from '../renderer/skins/workshop';
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
      <BlockIcon
        class="icon"
        :block="createBlock(type, state.facing)"
        :skin="workshopSkin"
        :size="34"
      />
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
  position: relative;
  display: grid;
  place-items: center;
  width: 50px;
  height: 50px;
  padding: 0;
  border: none;
  border-radius: 0;
  /* Dark, so the mid-toned blocks stand out; the selected slot is light instead. */
  background: #26272c;
  cursor: pointer;
}

.slot:hover {
  background: #3a3b42;
}

.slot.selected {
  z-index: 1;
  background: #d2ccc0;
}

/*
 * The blocks are mid-toned, so on the dark slots they get a little brighter with a soft light
 * rim; on the light selected slot they cast a shadow like blocks in the world instead.
 */
.icon {
  filter: brightness(1.2) contrast(1.1) drop-shadow(0 0 2px rgba(255, 255, 255, 0.45));
}

.selected .icon {
  filter: drop-shadow(3px 3px 0 rgba(0, 0, 0, 0.3));
}

/* The selection frame reaches past the slot and the panel on every side. */
.slot.selected::after {
  content: '';
  position: absolute;
  inset: -9px;
  border: 4px solid #fff;
  box-shadow:
    0 0 0 2px #000,
    inset 0 0 0 2px #000;
  pointer-events: none;
}
</style>
