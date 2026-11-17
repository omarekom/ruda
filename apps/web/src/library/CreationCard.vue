<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { LibraryCreation } from './api';
import WorldPreview from './WorldPreview.vue';

defineProps<{ creation: LibraryCreation; pending?: boolean }>();
const { t, d } = useI18n();
</script>

<template>
  <article class="card">
    <WorldPreview :data="creation.data" />
    <h3>{{ creation.title }}</h3>
    <p class="meta">
      {{ t('library.byAuthor', { author: creation.author }) }} ·
      {{
        d(pending ? creation.submittedAt : (creation.approvedAt ?? creation.submittedAt), 'short')
      }}
    </p>
    <p class="description">{{ creation.description }}</p>
    <div class="actions"><slot /></div>
  </article>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border: 1px solid #33363d;
  border-radius: 6px;
  background: #24262c;
}

h3 {
  margin: 4px 0 0;
  font-size: 16px;
}

.meta {
  margin: 0;
  font-size: 12px;
  opacity: 0.6;
}

.description {
  flex: 1;
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  white-space: pre-line;
  opacity: 0.85;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}
</style>
