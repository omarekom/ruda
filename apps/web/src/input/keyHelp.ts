import { computed, onBeforeUnmount, ref, shallowReactive } from 'vue';

/**
 * One line of the `?` overlay: an action (an i18n key under keyHelp.actions) and its keys.
 * Keys written as lowercase words are named through i18n (see `keyLabel`).
 */
export type KeyRow = readonly [action: string, ...keys: string[]];

interface Screen {
  readonly rows: () => readonly KeyRow[];
}

const screens = shallowReactive<Screen[]>([]);
const blockers = ref(0);

/**
 * Lists the keys that work on a screen for the `?` overlay, while the calling component is
 * mounted. Called during setup, so a screen opened later is listed on top of earlier ones.
 */
export function useKeyHelp(rows: () => readonly KeyRow[]): void {
  const screen: Screen = { rows };
  screens.push(screen);
  onBeforeUnmount(() => screens.splice(screens.indexOf(screen), 1));
}

/** Turns the `?` overlay off while the calling component (a dialog, a notice) is mounted. */
export function useKeyHelpBlocker(): void {
  blockers.value++;
  onBeforeUnmount(() => blockers.value--);
}

/** The keys of the screen in front; empty when there is nothing to show. */
export const keyHelpRows = computed<readonly KeyRow[]>(() =>
  blockers.value > 0 ? [] : (screens.at(-1)?.rows() ?? []),
);

/** Keys written as words (mouse buttons, arrows) are translated; letters and symbols are shown as is. */
export function keyLabel(t: (key: string) => string, key: string): string {
  return /^[a-z]/.test(key) ? t(`game.controls.keys.${key}`) : key;
}
