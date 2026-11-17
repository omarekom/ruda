import type { Creation } from './creation';
import { adders } from './creations/adders';
import { chaser } from './creations/chaser';
import { clocks } from './creations/clocks';
import { gates } from './creations/gates';
import { memory } from './creations/memory';
import { pistons } from './creations/pistons';
import { pulses } from './creations/pulses';
import { sign } from './creations/sign';
import { tour } from './creations/tour';

/** Built-in library creations, in the order the library lists them. */
export const CREATIONS: readonly Creation[] = [
  tour,
  gates,
  clocks,
  chaser,
  pulses,
  memory,
  adders,
  pistons,
  sign,
];
