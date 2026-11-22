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
- Labels change with one `label` command (an empty text removes the label); they take no part in the simulation.
- Player interaction is one `interact` command; the registry decides what it does (flip a lever, press a button, cycle a delay).

## File format (`.ruda`)

Minified JSON. Blocks are grouped by type and state, with coordinates as a flat list:

```json
{
  "rudaversion": 2,
  "name": "My world",
  "blocks": {
    "power_block": [0, 0, 5, 3],
    "lever:off": [2, 2],
    "torch:east:lit": [4, 4],
    "delayer:north:3:010": [6, 1],
    "button:0": [7, 7]
  },
  "labels": [
    [0, -2, "Clock"],
    [6, 1, "Delay 3"]
  ]
}
```

- The key is the block type followed by every state segment, in a fixed order (`type:state…`). States are always written explicitly: `lever:on` / `lever:off`, `torch:<north|east|south|west>:<lit|unlit>`, `delayer:<facing>:<delay>:<line>` (the line is one `0`/`1` per tick of delay, current output first), `button:<ticks remaining>`. Stateless blocks have no suffix.
- Pistons: `piston:<facing>:<extended|retracted>`, `piston_head:<facing>`.
- The value is a flat list of `x, y` pairs.
- `labels` lists `[x, y, text]`: the cell the label starts in and its text (one line of 1–80 characters, no spaces at either end). It is left out when the world has no labels. Labels are not blocks: they live in their own layer of the world, a cell can hold both a block and the start of a label, and pistons never move labels.
- Output is canonical: keys and cells are sorted, so the same world always gives the same file.
- `rudaversion` is the file version, which also marks the file as a Ruda world. Version 2 (Ruda 1.1) added `labels`; its migration from 1 changes nothing, but a 1.0 app rejects a version 2 file as too new instead of silently dropping its labels. Loading runs a chain of migrations `vN → vN+1`. A file newer than the app is rejected with a clear message. Old migrations are never edited, only appended.
- Loading is strict: unknown blocks, bad coordinates or a cell listed twice reject the file (`parseWorld`, used for saved worlds).
- Importing uses `repairWorld`, which loads what it can and counts the problems: unknown blocks, bad or repeated cells and pistons without their other half are left out. Text that is not valid JSON (a missing comma, a cut-off file) is not repaired, and a file that is not a Ruda world or is newer than the app is rejected.
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
- Textures never shimmer as their size changes. Enlarged, they are scaled up by the next whole factor without smoothing and then smoothed down the rest of the way ("sharp bilinear"), so texel edges move smoothly between pixels. Shrunk, they come from mipmaps (copies halved down to one pixel, each averaging 2×2 pixels); the floor also blends the two nearest levels, so it does not pop while zooming. Sizes are measured in device pixels, so high-DPI screens keep the detail.
- Switching skins (day and night) cross-fades: a still copy of the canvas is laid over it and faded out (`renderer/crossfade.ts`).
- Lighting is a pass in the renderer: lit lamps, torches, sources and powered wires each add a soft glow (a pre-painted sprite) into a small light buffer at a quarter of the screen resolution, which is then blended once under the blocks (added on dark skins, overlaid on light ones), plus a faint second time over the blocks on dark skins. Light from blocks just off screen is included so glows do not pop at the edges; at very small zoom lighting is skipped.
- The renderer draws a frame only when it would differ from the last one (camera, ticks, hover, ghost block, piston animation; edits, skin changes and resizes invalidate it), so an idle world costs almost nothing. The canvas is opaque, and solid blocks' outline and bevel are baked into their textures, so a block is one image.

## Keys overlay

- The `?` overlay (`KeyHelp.vue`) shows the keys of the screen in front. A screen lists them with `useKeyHelp(() => rows)` during setup (`input/keyHelp.ts`); the getter may depend on state, like the game's menu or debug mode. Dialogs and notices call `useKeyHelpBlocker()` so `?` does nothing while they are open.
- Every new screen must call `useKeyHelp` and every new dialog or notice `useKeyHelpBlocker`, and the overlay's list must stay in step with the keys the screen actually handles.

## Undo

- `History` (core) wraps the simulation: it runs each player command and stores how to reverse it, as further commands, so undo works the same way over the network later. It is computed from the world just before the command runs (a removed block's state, a lever's or delayer's interaction repeated).
- The world keeps ticking between edits, so each reverse step remembers which block type its cell must hold; when that no longer matches (a piston moved the block), the step is dropped and the next one is tried.
- The app keeps one `History` per opened world, inside `Game`.

## Mouse placement

One click places one block (no painting). Pressing the left button (or Space) shows a ghost block, dragging sets its rotation, releasing places it. The right button (or Delete) breaks. `PointerInput` owns these primary and secondary actions; the keyboard aliases call them at the cursor.

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
