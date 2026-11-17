<script setup lang="ts">
import { parseWorld } from '@ruda/core';
import { onMounted, ref, shallowRef } from 'vue';
import { useI18n } from 'vue-i18n';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import { libraryErrorKey, type LibraryApi, type LibraryCreation } from './api';
import CreationCard from './CreationCard.vue';

const props = defineProps<{ api: LibraryApi; published: readonly LibraryCreation[] }>();
const emit = defineEmits<{ changed: [] }>();
const { t } = useI18n();

const loggedIn = ref<boolean>();
const password = ref('');
const pending = ref<LibraryCreation[]>([]);
const error = ref<string>();
const removing = shallowRef<{ creation: LibraryCreation; published: boolean }>();

onMounted(async () => {
  try {
    loggedIn.value = await props.api.isAdmin();
    if (loggedIn.value) await refresh();
  } catch (failure) {
    error.value = libraryErrorKey(failure);
  }
});

async function run(action: () => Promise<void>): Promise<void> {
  error.value = undefined;
  try {
    await action();
  } catch (failure) {
    error.value = libraryErrorKey(failure);
  }
}

async function refresh(): Promise<void> {
  pending.value = await props.api.pending();
}

const logIn = () =>
  run(async () => {
    await props.api.logIn(password.value);
    password.value = '';
    loggedIn.value = true;
    await refresh();
  });

const logOut = () =>
  run(async () => {
    await props.api.logOut();
    loggedIn.value = false;
  });

const approve = (creation: LibraryCreation) =>
  run(async () => {
    await props.api.approve(creation.id);
    await refresh();
    emit('changed');
  });

function isLoadable(data: string): boolean {
  try {
    parseWorld(data);
    return true;
  } catch {
    return false;
  }
}

async function onRemoveChoice(choice: 'remove' | 'cancel'): Promise<void> {
  const target = removing.value;
  removing.value = undefined;
  if (choice !== 'remove' || !target) return;
  await run(async () => {
    await props.api.remove(target.creation.id);
    await refresh();
    if (target.published) emit('changed');
  });
}
</script>

<template>
  <section class="admin">
    <h2>{{ t('library.admin.title') }}</h2>
    <p v-if="error" class="error" role="alert">{{ t(error) }}</p>
    <form v-if="loggedIn === false" class="login" @submit.prevent="logIn">
      <input
        v-model="password"
        type="password"
        autocomplete="current-password"
        :aria-label="t('library.admin.password')"
        :placeholder="t('library.admin.password')"
      />
      <button type="submit" class="primary">{{ t('library.admin.logIn') }}</button>
    </form>
    <template v-else-if="loggedIn">
      <div class="toolbar">
        <h3>{{ t('library.admin.pending', { count: pending.length }) }}</h3>
        <button type="button" @click="logOut">{{ t('library.admin.logOut') }}</button>
      </div>
      <p v-if="pending.length === 0" class="empty">{{ t('library.admin.nothingPending') }}</p>
      <div class="grid">
        <CreationCard v-for="creation in pending" :key="creation.id" :creation="creation" pending>
          <button
            type="button"
            class="primary"
            :disabled="!isLoadable(creation.data)"
            @click="approve(creation)"
          >
            {{ t('library.admin.approve') }}
          </button>
          <button type="button" @click="removing = { creation, published: false }">
            {{ t('library.admin.reject') }}
          </button>
        </CreationCard>
      </div>
      <h3>{{ t('library.admin.published') }}</h3>
      <ul class="published">
        <li v-for="creation in published" :key="creation.id">
          <span>{{ creation.title }} · {{ creation.author }}</span>
          <button type="button" @click="removing = { creation, published: true }">
            {{ t('library.admin.takeDown') }}
          </button>
        </li>
      </ul>
    </template>
    <ConfirmDialog
      v-if="removing"
      :message="
        t(removing.published ? 'library.admin.confirmTakeDown' : 'library.admin.confirmReject', {
          title: removing.creation.title,
        })
      "
      :actions="[
        { value: 'cancel', label: t('dialog.cancel') },
        {
          value: 'remove',
          label: t(removing.published ? 'library.admin.takeDown' : 'library.admin.reject'),
          primary: true,
        },
      ]"
      cancel="cancel"
      @choose="onRemoveChoice"
    />
  </section>
</template>

<style scoped>
.admin {
  margin-bottom: 28px;
  padding: 16px;
  border: 1px dashed #c8392f;
  border-radius: 8px;
}

h2 {
  margin: 0 0 12px;
  font-size: 18px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.login {
  display: flex;
  gap: 8px;
}

.error {
  padding: 8px 12px;
  border-radius: 4px;
  background: #4a1f1c;
}

.empty {
  opacity: 0.7;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.published {
  margin: 0;
  padding: 0;
  list-style: none;
}

.published li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 0;
  border-bottom: 1px solid #33363d;
}
</style>
