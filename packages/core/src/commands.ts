import type { Block } from './blocks';

/**
 * A serializable world edit. Every change to the world goes through a command so that
 * edits can later be undone, replayed or sent over the network.
 */
export type Command =
  | { readonly kind: 'place'; readonly x: number; readonly y: number; readonly block: Block }
  | { readonly kind: 'remove'; readonly x: number; readonly y: number }
  /** Interacts with the block, e.g. flips a lever. */
  | { readonly kind: 'toggle'; readonly x: number; readonly y: number };
