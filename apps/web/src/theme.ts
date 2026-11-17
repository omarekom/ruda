import { computed, ref } from 'vue';
import { readPreferences, themeToRemember, writePreference, type Theme } from './preferences';
import type { Skin } from './renderer/skins/skin';
import { workshopNightSkin, workshopSkin } from './renderer/skins/workshop';

const media = window.matchMedia('(prefers-color-scheme: dark)');
const systemTheme = ref<Theme>(media.matches ? 'dark' : 'light');
media.addEventListener('change', (event) => (systemTheme.value = event.matches ? 'dark' : 'light'));

/** The player's own choice; unset means the world follows the system. */
const chosen = ref<Theme | undefined>(readPreferences().theme);

/** Whether the world is shown at night (dark) or by day (light). */
export const theme = computed<Theme>(() => chosen.value ?? systemTheme.value);

/** The world's look for the current theme. */
export const worldSkin = computed<Skin>(() =>
  theme.value === 'dark' ? workshopNightSkin : workshopSkin,
);

/** Switches to the other theme, remembering it only while it differs from the system. */
export function toggleTheme(): void {
  const next: Theme = theme.value === 'dark' ? 'light' : 'dark';
  chosen.value = themeToRemember(next, systemTheme.value);
  writePreference('theme', chosen.value);
}
