/**
 * What the library needs from the rest of the app. The library only exchanges `.ruda` text
 * with the game, so it stays independent of how worlds are stored and played.
 */
export interface LibraryHost {
  listWorlds(): Promise<readonly { readonly id: string; readonly name: string }[]>;
  /** The world as `.ruda` text, or undefined if it no longer exists. */
  loadWorld(id: string): Promise<string | undefined>;
  /** Adds a world to the player's worlds and returns its id. Throws RudaFileError on bad data. */
  addWorld(name: string, data: string): Promise<string>;
  openWorld(id: string): void;
}
