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
  <dialog ref="dialog" class="dialog" @cancel="onCancel">
    <p>{{ message }}</p>
    <div class="actions">
      <button
        v-for="action in actions"
        :key="action.value"
        type="button"
        :class="{ primary: action.primary }"
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
</style>
