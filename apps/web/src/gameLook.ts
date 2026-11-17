import { computed, ref } from 'vue';
import { GAME_LOOK_NAMES, GAME_LOOKS, type GameLook } from './renderer/skins/gameLooks';
import { readPreferences, writePreference } from './preferences';

/** The block look game mode uses, chosen in the pause menu. */
export const gameLook = ref<GameLook>(readPreferences().gameLook);

export const gameSkin = computed(() => GAME_LOOKS[gameLook.value]);

/** Switches to the next look in the list, wrapping around. */
export function nextGameLook(): void {
  const index = GAME_LOOK_NAMES.indexOf(gameLook.value);
  const next = GAME_LOOK_NAMES[(index + 1) % GAME_LOOK_NAMES.length] ?? 'original';
  gameLook.value = next;
  writePreference('gameLook', next);
}
