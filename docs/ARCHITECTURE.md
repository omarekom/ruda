# Architecture

## Packages

```
ruda/
  docs/
  packages/
    core/       pure TypeScript, no DOM: world, blocks, simulation, (de)serialization, migrations
    creations/  built-in library creations drawn from ASCII maps, with behaviour tests
  apps/
    web/          Vue 3 + Vite: game, hotbar, menus, saving, import/export, library tab, i18n
    library-api/  PHP + SQLite backend of the library (seed file generated from creations/)
```

The core knows nothing about the UI, storage or real time. Persistence and tick pacing (10 ticks/s) are the app's job. The core can step the simulation instantly.

## World

- Sparse and chunked (e.g. 32 × 32 cells); a chunk exists only if it contains a block.
- Limit 64 000 × 64 000. Chunk keys fit into a single number. The world is never stored densely.
- A block is a type plus a small data-only state (rotation, lever on/off, repeater delay).
- The block registry is a table in code mapping each type to its look and behavior.

## Simulation model

- Binary signal; a connected group of wires is a single node (a _network_). A crossing has two independent channels, horizontal and vertical; each joins the network on its axis.
- Sources (power block, lit lever, lit torch front) power adjacent cells. Only wire networks carry power further; other blocks never conduct.
- A torch's (and delayer's) input is its back neighbour; it outputs only to its front neighbour.
- Blocks with a delay (torch, delayer, button) define a `tick` in the registry: their next state from the power entering each side. Each also declares which sides it reads. A block is evaluated only when a side it reads changes, or while ticking it again with unchanged inputs would still change it (a delay line still shifting, a button counting down).
- Edits are commands applied between ticks. Zero-delay parts (wires, crossings, lamps) settle immediately after a command or a torch change.
- Per tick, every torch is evaluated simultaneously from the previous tick's state (all reads happen before any write), so order does not matter and runs are deterministic. A newly placed torch starts unlit and updates on the next tick.
- Wires, levers, lamps and crossings have no delay. Torch, delayer and button (and later piston) have a delay of 1 tick or more.
- Only active parts are recomputed (event-driven), not the whole world: only torches whose input may have changed are evaluated, and only networks touched by a change are rebuilt.
- Torch lit state, delayer contents and button countdown are world state (they are saved); network power and lamp state are derived and recomputed on load.
- Player interaction is one `interact` command; the registry decides what it does (flip a lever, press a button, cycle a delay).

## File format (`.ruda`)

Minified JSON. Blocks are grouped by type and state, with coordinates as a flat list:

```json
{
  "format": 4,
  "name": "My world",
  "blocks": {
    "power_block": [0, 0, 5, 3],
    "lever:off": [2, 2],
    "torch:east:lit": [4, 4],
    "delayer:north:3:010": [6, 1],
    "button:0": [7, 7]
  }
}
```

- The key is the block type followed by every state segment, in a fixed order (`type:state…`). States are always written explicitly: `lever:on` / `lever:off`, `torch:<north|east|south|west>:<lit|unlit>`, `delayer:<facing>:<delay>:<line>` (the line is one `0`/`1` per tick of delay, current output first), `button:<ticks remaining>`. Stateless blocks have no suffix.
- Pistons: `piston:<facing>:<extended|retracted>`, `piston_head:<facing>`.
- Format history: 1 – initial blocks; 2 – adds delayer and button; 3 – adds piston (no changes to existing content).
- The value is a flat list of `x, y` pairs.
- Output is canonical: keys and cells are sorted, so the same world always gives the same file.
- `format` is the file version. Loading runs a chain of migrations `vN → vN+1`. A file newer than the app is rejected with a clear message. Old migrations are never edited, only appended.
- Loading is strict: unknown blocks, bad coordinates or a cell listed twice reject the file.
- Names have no namespace prefix.
- Worlds stored in the browser use the same format, so migrations apply to them too.

## Tooling

pnpm workspaces, TypeScript 6 (strict), Vite, Vue 3, vue-i18n, idb, Fontsource (self-hosted fonts), Vitest, ESLint, Prettier, tsx (scripts). Library backend: PHP 8.1+ with PDO SQLite, no PHP dependencies. The renderer lives in `apps/web/src/renderer` until there is a reason to split it out.

## Frontend

- Vue 3 renders only panels (hotbar, menus). The world is drawn on a canvas outside Vue's reactivity.
- Saving: IndexedDB (via `idb`) with two stores: `worlds` (the real saves) and `recovery` (autosaved copies of unsaved changes, keyed by world id). Saving a world deletes its recovery copy in the same transaction. `beforeunload` warns about unsaved changes.
- Only player commands mark a world as unsaved; torch ticks do not (their state is still saved with the next save).
- Strings go through i18n keys from the start (English only at first).
- `WorldScreen` owns the simulation, the `Game` (canvas, ticks, input) and saving, and shows `GameHud` over the canvas, plus `DebugHud` while debug mode is on.
- Pausing, single steps and speed live in the app's `TickLoop`, not in the core: the game pauses while its menu is open, and debug mode has its own controls, including a max speed that fills a fixed slice of every frame with ticks.
- Small per-browser settings (last world, a day/night choice that differs from the system) are kept in `localStorage` (`preferences.ts`); they are conveniences, so blocked storage only means nothing is remembered.
- Fonts are bundled from Fontsource packages, so the app makes no third-party requests.

## Rendering

- A _skin_ is a complete visual style: canvas colours plus a look for every block type (`renderer/skins/`). The game uses the Workshop skin by day or at night (`theme.ts` picks one). The renderer, icons, previews and the start screen all draw through a skin.
- Skins get a per-cell seed, so texture variants stay the same in every frame.
- Lighting is a pass in the renderer: lit lamps, torches, sources and powered wires paint soft radial glows under the blocks (added on dark skins, tinting on light ones), plus a faint second pass over the blocks on dark skins. Light from blocks just off screen is included so glows do not pop at the edges; at very small zoom lighting is skipped.

## Mouse placement

One click places one block (no painting). Pressing the right button shows a ghost block, dragging sets its rotation, releasing places it.

## Library

- The library UI (`apps/web/src/library/`) is independent of the game. It talks to the rest of the app only through a `LibraryHost` interface (list worlds, load a world's `.ruda` text, add a world, open a world) and to the server through `LibraryApi`.
- The server stores each creation's `.ruda` text unchanged. It only checks the file's shape; the app fully validates a world when previewing or copying it, and the admin cannot approve one that does not load.
- Every request except `GET` carries the header `X-Ruda-Library: 1`. Another site cannot send it without a CORS preflight, which the server never allows, so this guards against cross-site requests; the admin session cookie is also `SameSite=Strict` and `HttpOnly`.
- Client addresses are stored only as keyed hashes, for rate limiting, and deleted after a day.
- Built-in creations are code (`packages/creations`). `pnpm --filter @ruda/creations export-seed` writes `apps/library-api/seed/creations.json`; a test fails if it is stale. `php bin/seed.php` adds new ones to a server without touching existing entries.

## Multiplayer (future)

One client hosts and is authoritative; others send edit commands and receive state. A browser cannot accept incoming WebSocket connections, so hosting needs either a small relay server (WebSocket) or WebRTC. This is an open decision. The design already helps: deterministic ticks and edits as serializable commands.

## Pistons

- A piston ignores power coming from its front (head) side. This lets a piston push a power block without being re-powered by it, and costs the simulation only one excluded input side.
- The extended head is its own block (`piston_head`) so every cell query stays a plain world lookup. It is never placed by the player; loading rejects a piston without its head or a head without its piston.
- The piston's registry `tick` only returns the wanted position. The simulation turns it into a _plan_: the cells the move touches (the piston, every destination cell). After all blocks have read the previous tick, plans that share a cell are dropped, so conflicts are order-independent; the rest are applied as ordinary cell edits.
- Each block type declares in the registry whether it is `pushable` (solid) or not (flat components). Pushed blocks keep their state; a block whose state changed this tick moves with the new state.
- The simulation exposes the moves of the last tick (`recentMoves`) so the renderer can animate them; this is transient, not world state.

## Coordinates

Cells are integers in `[-32000, 32000)` on both axes, origin at the centre. `x` grows east, `y` grows south (screen direction).

## Edge scrolling

Edge scrolling does not trigger over the hotbar or when the cursor leaves the window.

## Open questions

- How closely to follow Minecraft behavior in general (current stance: compatibility is not a goal).
