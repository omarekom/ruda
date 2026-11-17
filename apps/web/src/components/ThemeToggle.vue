<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { theme, toggleTheme } from '../theme';
import PixelIcon from './PixelIcon.vue';

/** One button that shows the other theme and switches to it. */
const { t } = useI18n();
const label = computed(() => t(theme.value === 'dark' ? 'theme.toLight' : 'theme.toDark'));
</script>

<template>
  <button
    type="button"
    class="blocky-button icon-button"
    :data-tip="label"
    :aria-label="label"
    @click="toggleTheme"
  >
    <PixelIcon :name="theme === 'dark' ? 'sun' : 'moon'" />
  </button>
</template>
