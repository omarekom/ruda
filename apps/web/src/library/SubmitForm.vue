<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { libraryErrorKey, type LibraryApi } from './api';
import type { LibraryHost } from './host';

const AUTHOR_KEY = 'ruda.library.author';
const MAX_TITLE = 80;
const MAX_DESCRIPTION = 500;
const MAX_AUTHOR = 40;

const props = defineProps<{ api: LibraryApi; host: LibraryHost }>();
const emit = defineEmits<{ close: [] }>();
const { t } = useI18n();

const worlds = ref<readonly { id: string; name: string }[]>([]);
const form = reactive({ worldId: '', title: '', description: '', author: '', website: '' });
const sending = ref(false);
const sent = ref(false);
const error = ref<string>();

onMounted(async () => {
  worlds.value = await props.host.listWorlds();
  const first = worlds.value[0];
  if (first) selectWorld(first.id);
  try {
    form.author = localStorage.getItem(AUTHOR_KEY) ?? '';
  } catch {
    // Storage may be unavailable (private window); the name is only a convenience.
  }
});

function selectWorld(id: string): void {
  const previousName = worlds.value.find((world) => world.id === form.worldId)?.name;
  form.worldId = id;
  // Suggest the world's name as the title unless the player has typed their own.
  if (form.title === '' || form.title === previousName) {
    form.title = worlds.value.find((world) => world.id === id)?.name ?? '';
  }
}

async function submit(): Promise<void> {
  error.value = undefined;
  const data = await props.host.loadWorld(form.worldId);
  if (!data) {
    error.value = 'library.errors.invalid_data';
    return;
  }
  sending.value = true;
  try {
    await props.api.submit({
      title: form.title,
      description: form.description,
      author: form.author,
      data,
      website: form.website,
    });
    try {
      localStorage.setItem(AUTHOR_KEY, form.author.trim());
    } catch {
      // See above.
    }
    sent.value = true;
  } catch (failure) {
    error.value = libraryErrorKey(failure);
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <section class="submit">
    <template v-if="sent">
      <p>{{ t('library.submitted') }}</p>
      <button type="button" class="primary" @click="emit('close')">{{ t('library.done') }}</button>
    </template>
    <p v-else-if="worlds.length === 0">{{ t('library.noWorldsToShare') }}</p>
    <form v-else @submit.prevent="submit">
      <h3>{{ t('library.shareTitle') }}</h3>
      <p class="hint">{{ t('library.shareHint') }}</p>
      <label>
        {{ t('library.fields.world') }}
        <select
          :value="form.worldId"
          @change="selectWorld(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="world in worlds" :key="world.id" :value="world.id">
            {{ world.name }}
          </option>
        </select>
      </label>
      <label>
        {{ t('library.fields.title') }}
        <input v-model="form.title" required :maxlength="MAX_TITLE" />
      </label>
      <label>
        {{ t('library.fields.author') }}
        <input v-model="form.author" required :maxlength="MAX_AUTHOR" />
      </label>
      <label>
        {{ t('library.fields.description') }}
        <textarea v-model="form.description" rows="4" :maxlength="MAX_DESCRIPTION" />
      </label>
      <!-- Hidden from people; bots fill it in and get rejected. -->
      <input
        v-model="form.website"
        class="trap"
        tabindex="-1"
        autocomplete="off"
        aria-hidden="true"
      />
      <p v-if="error" class="error" role="alert">{{ t(error) }}</p>
      <div class="actions">
        <button type="button" @click="emit('close')">{{ t('dialog.cancel') }}</button>
        <button type="submit" class="primary" :disabled="sending">{{ t('library.send') }}</button>
      </div>
    </form>
  </section>
</template>

<style scoped>
.submit {
  margin-bottom: 20px;
  padding: 16px;
  border: 1px solid #444;
  border-radius: 8px;
  background: #26282e;
}

form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

h3 {
  margin: 0;
}

.hint {
  margin: 0;
  font-size: 13px;
  opacity: 0.7;
}

label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}

select,
textarea {
  padding: 5px 8px;
  border: 1px solid #555;
  border-radius: 4px;
  background: #1d1f24;
  color: inherit;
  font: inherit;
}

.trap {
  position: absolute;
  left: -10000px;
}

.error {
  margin: 0;
  padding: 8px 12px;
  border-radius: 4px;
  background: #4a1f1c;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
