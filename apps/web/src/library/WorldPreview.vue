<script setup lang="ts">
import { parseWorld } from '@ruda/core';
import { onMounted, ref, useTemplateRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { drawWorldPreview } from '../renderer/preview';
import { workshopSkin } from '../renderer/skins/workshop';
import { fileErrorKey } from '../storage/fileErrors';

const props = defineProps<{ data: string }>();
const { t } = useI18n();
const canvas = useTemplateRef<HTMLCanvasElement>('canvas');
const error = ref<string>();

function draw(): void {
  if (!canvas.value) return;
  try {
    drawWorldPreview(canvas.value, parseWorld(props.data).world, workshopSkin);
    error.value = undefined;
  } catch (failure) {
    error.value = fileErrorKey(failure);
  }
}

onMounted(draw);
watch(() => props.data, draw);
</script>

<template>
  <div class="preview">
    <canvas ref="canvas" />
    <p v-if="error" class="error">{{ t(error) }}</p>
  </div>
</template>

<style scoped>
.preview {
  position: relative;
  height: 170px;
  border-radius: 4px;
  overflow: hidden;
  background: #1d1f24;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 12px;
  background: #4a1f1c;
  text-align: center;
  font-size: 13px;
}
</style>
