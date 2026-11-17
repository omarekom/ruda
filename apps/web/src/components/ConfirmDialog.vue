<script setup lang="ts" generic="T extends string">
import { onMounted, useTemplateRef } from 'vue';

export interface DialogAction<V extends string> {
  readonly value: V;
  readonly label: string;
  readonly primary?: boolean;
}

const props = defineProps<{
  message: string;
  actions: readonly DialogAction<T>[];
  /** Chosen when the dialog is dismissed with Escape. */
  cancel: T;
  /** Game mode's blocky look instead of the plain one. */
  blocky?: boolean;
}>();
const emit = defineEmits<{ choose: [value: T] }>();
const dialog = useTemplateRef<HTMLDialogElement>('dialog');

onMounted(() => dialog.value?.showModal());

function onCancel(event: Event): void {
  event.preventDefault();
  emit('choose', props.cancel);
}
</script>

<template>
  <dialog ref="dialog" class="dialog" :class="{ blocky }" @cancel="onCancel">
    <p>{{ message }}</p>
    <div class="actions">
      <button
        v-for="action in actions"
        :key="action.value"
        type="button"
        :class="blocky ? 'blocky-button' : { primary: action.primary }"
        :autofocus="action.primary"
        @click="emit('choose', action.value)"
      >
        {{ action.label }}
      </button>
    </div>
  </dialog>
</template>

<style scoped>
.dialog {
  max-width: 420px;
  padding: 20px;
  border: 1px solid #444;
  border-radius: 8px;
  background: #26282e;
  color: inherit;
}

.dialog::backdrop {
  background: rgba(0, 0, 0, 0.5);
}

.dialog p {
  margin: 0 0 16px;
  line-height: 1.4;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.dialog.blocky {
  border: 3px solid #000;
  border-radius: 0;
  background: rgba(20, 20, 24, 0.96);
  box-shadow: inset 0 0 0 2px #555;
  color: #fff;
  font: 28px var(--font-retro);
  text-align: center;
}

.dialog.blocky {
  max-width: 520px;
}

.dialog.blocky .actions {
  justify-content: center;
}
</style>
