import type { Mode } from './game/mode';
import { GAME_LOOK_NAMES, type GameLook } from './renderer/skins/gameLooks';

export type Theme = 'auto' | 'light' | 'dark';

/** Small per-browser settings, kept in localStorage. */
export interface Preferences {
  /** The mode the player used last; unset until they pick one on the start screen. */
  readonly mode: Mode | undefined;
  readonly theme: Theme;
  /** The world the player had open last. */
  readonly lastWorld: string | undefined;
  /** How blocks look in game mode. */
  readonly gameLook: GameLook;
}

const KEYS: { readonly [K in keyof Preferences]: string } = {
  mode: 'ruda.mode',
  theme: 'ruda.theme',
  lastWorld: 'ruda.lastWorld',
  gameLook: 'ruda.gameLook',
};

const MODES: readonly string[] = ['game', 'expert'] satisfies Mode[];
const THEMES: readonly string[] = ['auto', 'light', 'dark'] satisfies Theme[];

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
  const mode = read(storage, KEYS.mode);
  const theme = read(storage, KEYS.theme);
  const gameLook = read(storage, KEYS.gameLook);
  return {
    mode: mode !== undefined && MODES.includes(mode) ? (mode as Mode) : undefined,
    theme: theme !== undefined && THEMES.includes(theme) ? (theme as Theme) : 'auto',
    lastWorld: read(storage, KEYS.lastWorld),
    gameLook: GAME_LOOK_NAMES.find((name) => name === gameLook) ?? 'original',
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
