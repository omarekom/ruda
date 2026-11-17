<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { fileErrorKey } from '../storage/fileErrors';
import AdminPanel from './AdminPanel.vue';
import { LibraryApi, libraryErrorKey, type LibraryCreation } from './api';
import CreationCard from './CreationCard.vue';
import type { LibraryHost } from './host';
import SubmitForm from './SubmitForm.vue';

const props = defineProps<{ host: LibraryHost; admin: boolean }>();
const { t } = useI18n();
const api = new LibraryApi();

const creations = ref<LibraryCreation[]>([]);
const total = ref(0);
const loading = ref(true);
const error = ref<string>();
const sharing = ref(false);
/** Creations copied in this visit, with the id of the new world. */
const copied = ref(new Map<number, string>());

const builtIn = computed(() => creations.value.filter((creation) => creation.builtIn));
const community = computed(() => creations.value.filter((creation) => !creation.builtIn));

async function load(more = false): Promise<void> {
  loading.value = true;
  error.value = undefined;
  try {
    const page = await api.published(more ? creations.value.length : 0);
    creations.value = more ? [...creations.value, ...page.items] : page.items;
    total.value = page.total;
  } catch (failure) {
    error.value = libraryErrorKey(failure);
  } finally {
    loading.value = false;
  }
}

onMounted(() => load());

async function copy(creation: LibraryCreation): Promise<void> {
  error.value = undefined;
  try {
    const id = await props.host.addWorld(creation.title, creation.data);
    copied.value = new Map(copied.value).set(creation.id, id);
  } catch (failure) {
    error.value = fileErrorKey(failure);
  }
}
</script>

<template>
  <section class="library">
    <div class="toolbar">
      <h2>{{ t('library.title') }}</h2>
      <button v-if="!sharing" type="button" class="primary" @click="sharing = true">
        {{ t('library.share') }}
      </button>
    </div>
    <p class="intro">{{ t('library.intro') }}</p>
    <SubmitForm v-if="sharing" :api="api" :host="host" @close="sharing = false" />
    <AdminPanel v-if="admin" :api="api" :published="creations" @changed="load()" />
    <p v-if="error" class="error" role="alert">{{ t(error) }}</p>

    <template
      v-for="section in [
        { key: 'builtIn', items: builtIn },
        { key: 'community', items: community },
      ]"
      :key="section.key"
    >
      <h3 v-if="section.items.length > 0 || section.key === 'community'">
        {{ t(`library.sections.${section.key}`) }}
      </h3>
      <p v-if="section.key === 'community' && section.items.length === 0 && !loading" class="empty">
        {{ t('library.noCommunity') }}
      </p>
      <div class="grid">
        <CreationCard v-for="creation in section.items" :key="creation.id" :creation="creation">
          <button
            v-if="copied.has(creation.id)"
            type="button"
            class="primary"
            @click="host.openWorld(copied.get(creation.id) ?? '')"
          >
            {{ t('library.openCopy') }}
          </button>
          <button v-else type="button" @click="copy(creation)">{{ t('library.copy') }}</button>
        </CreationCard>
      </div>
    </template>
    <button
      v-if="creations.length < total"
      type="button"
      class="more"
      :disabled="loading"
      @click="load(true)"
    >
      {{ t('library.loadMore') }}
    </button>
  </section>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

h2 {
  margin: 0;
  font-size: 18px;
}

h3 {
  margin: 24px 0 10px;
  font-size: 15px;
  opacity: 0.8;
}

.intro,
.empty {
  font-size: 13px;
  opacity: 0.7;
}

.error {
  padding: 8px 12px;
  border-radius: 4px;
  background: #4a1f1c;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.more {
  display: block;
  margin: 16px auto;
}
</style>
