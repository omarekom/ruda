import { computed, ref } from 'vue';
import { readPreferences, writePreference, type Theme } from './preferences';

const media = window.matchMedia('(prefers-color-scheme: dark)');
const systemDark = ref(media.matches);
media.addEventListener('change', (event) => (systemDark.value = event.matches));

/** The chosen theme for expert mode; 'auto' follows the system setting. */
export const theme = ref<Theme>(readPreferences().theme);

export const isDark = computed(() =>
  theme.value === 'auto' ? systemDark.value : theme.value === 'dark',
);

export function setTheme(next: Theme): void {
  theme.value = next;
  writePreference('theme', next);
}
