<script setup lang="ts">
import { MAX_LABEL_LENGTH } from '@ruda/core';
import { computed, onMounted, ref, useTemplateRef } from 'vue';
import { useI18n } from 'vue-i18n';
import type { LabelPlacement } from '../game/game';
import { useKeyHelpBlocker } from '../input/keyHelp';
import { LABEL_FONT_FAMILY } from '../renderer/labels';

const props = defineProps<{ text: string; placement: LabelPlacement }>();
/** `done` carries the new text (empty removes the label), or undefined when cancelled. */
const emit = defineEmits<{ done: [text: string | undefined] }>();
const { t } = useI18n();

const draft = ref(props.text);
const input = useTemplateRef<HTMLInputElement>('input');
let finished = false;

useKeyHelpBlocker();

const style = computed(() => {
  const { left, top, height, fontPx } = props.placement;
  return {
    left: `${left}px`,
    top: `${top}px`,
    height: `${height}px`,
    font: `${fontPx}px ${LABEL_FONT_FAMILY}`,
    padding: `0 ${Math.round(fontPx * 0.3)}px`,
    // Grows with the text; the font is monospaced.
    width: `${Math.max(draft.value.length, 8) + 1}ch`,
  };
});

/** Pasted tabs or line breaks become spaces; a label is a single line. */
function cleaned(text: string): string {
  return text.replace(/\p{Cc}+/gu, ' ').trim();
}

function finish(text: string | undefined): void {
  if (finished) return;
  finished = true;
  emit('done', text === undefined ? undefined : cleaned(text));
}

function onKeyDown(event: KeyboardEvent): void {
  // The world screen behind must not see these keys (Escape would open the menu).
  event.stopPropagation();
  if (event.key === 'Enter') {
    event.preventDefault();
    finish(draft.value);
  } else if (event.key === 'Escape') {
    event.preventDefault();
    finish(undefined);
  }
}

onMounted(() => {
  input.value?.focus();
  input.value?.select();
});
</script>

<template>
  <input
    ref="input"
    v-model="draft"
    class="label-editor"
    :style="style"
    :maxlength="MAX_LABEL_LENGTH"
    :aria-label="t('game.label.field')"
    :placeholder="t('game.label.placeholder')"
    spellcheck="false"
    autocomplete="off"
    @keydown="onKeyDown"
    @blur="finish(draft)"
  />
</template>

<style scoped>
.label-editor {
  position: absolute;
  box-sizing: content-box;
  max-width: 80vw;
  margin: 0;
  border: none;
  outline: 2px solid #fff;
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
}

.label-editor::placeholder {
  color: #aaa;
}
</style>
