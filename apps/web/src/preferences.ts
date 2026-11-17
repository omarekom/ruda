export type Theme = 'light' | 'dark';

/** Small per-browser settings, kept in localStorage. */
export interface Preferences {
  /** The light or dark world, when the player chose one that differs from the system. */
  readonly theme: Theme | undefined;
  /** The world the player had open last. */
  readonly lastWorld: string | undefined;
}

const KEYS: { readonly [K in keyof Preferences]: string } = {
  theme: 'ruda.theme',
  lastWorld: 'ruda.lastWorld',
};

const THEMES: readonly string[] = ['light', 'dark'] satisfies Theme[];

/** localStorage, or undefined where it is blocked (some private modes throw on access). */
function browserStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function read(storage: Storage | undefined, key: string): string | undefined {
  try {
    return storage?.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}

/** Reads the preferences; anything missing or unrecognised falls back to the default. */
export function readPreferences(storage = browserStorage()): Preferences {
  const theme = read(storage, KEYS.theme);
  return {
    theme: theme !== undefined && THEMES.includes(theme) ? (theme as Theme) : undefined,
    lastWorld: read(storage, KEYS.lastWorld),
  };
}

/** Stores one preference; `undefined` removes it. Failures are ignored: these are conveniences. */
export function writePreference<K extends keyof Preferences>(
  key: K,
  value: Preferences[K],
  storage = browserStorage(),
): void {
  try {
    if (value === undefined) storage?.removeItem(KEYS[key]);
    else storage?.setItem(KEYS[key], value);
  } catch {
    // Storage full or blocked: the app simply won't remember this.
  }
}

/** What to remember after switching to `next`: nothing when it matches the system's theme. */
export function themeToRemember(next: Theme, system: Theme): Theme | undefined {
  return next === system ? undefined : next;
}
