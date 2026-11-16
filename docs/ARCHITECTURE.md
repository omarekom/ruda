# Architecture

## Packages

```
ruda/
  docs/
  packages/
    core/       pure TypeScript, no DOM: world, blocks, simulation, (de)serialization, migrations
    renderer/   Canvas 2D rendering, camera (may start inside apps/web)
  apps/
    web/        Vue 3 + Vite: hotbar, menus, saving, import/export, i18n
```

The core knows nothing about the UI, storage or real time. Persistence and tick pacing (10 ticks/s) are the app's job. The core can step the simulation instantly.

## World

- Sparse and chunked (e.g. 32 × 32 cells); a chunk exists only if it contains a block.
- Limit 64 000 × 64 000. Chunk keys fit into a single number. The world is never stored densely.
- A block is a type plus a small data-only state (rotation, lever on/off, repeater delay).
- The block registry is a table in code mapping each type to its look and behavior.

## Simulation model

- Binary signal; a connected group of wires is a single node (a _network_). A crossing has two independent channels, horizontal and vertical; each joins the network on its axis.
- Sources (redstone block, lit lever, lit torch front) power adjacent cells. Only wire networks carry power further; other blocks never conduct.
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
  "format": 2,
  "name": "My world",
  "blocks": {
    "redstone_block": [0, 0, 5, 3],
    "lever:off": [2, 2],
    "torch:east:lit": [4, 4],
    "delayer:north:3:010": [6, 1],
    "button:0": [7, 7]
  }
}
```

- The key is the block type followed by every state segment, in a fixed order (`type:state…`). States are always written explicitly: `lever:on` / `lever:off`, `torch:<north|east|south|west>:<lit|unlit>`, `delayer:<facing>:<delay>:<line>` (the line is one `0`/`1` per tick of delay, current output first), `button:<ticks remaining>`. Stateless blocks have no suffix.
- Format history: 1 – initial blocks; 2 – adds delayer and button (no changes to existing content).
- The value is a flat list of `x, y` pairs.
- Output is canonical: keys and cells are sorted, so the same world always gives the same file.
- `format` is the file version. Loading runs a chain of migrations `vN → vN+1`. A file newer than the app is rejected with a clear message. Old migrations are never edited, only appended.
- Loading is strict: unknown blocks, bad coordinates or a cell listed twice reject the file.
- Names have no namespace prefix.
- Worlds stored in the browser use the same format, so migrations apply to them too.

## Tooling

pnpm workspaces, TypeScript 6 (strict), Vite, Vue 3, vue-i18n, idb, Vitest, ESLint, Prettier. The renderer lives in `apps/web/src/renderer` until there is a reason to split it out.

## Frontend

- Vue 3 renders only panels (hotbar, menus). The world is drawn on a canvas outside Vue's reactivity.
- Saving: IndexedDB (via `idb`) with two stores: `worlds` (the real saves) and `recovery` (autosaved copies of unsaved changes, keyed by world id). Saving a world deletes its recovery copy in the same transaction. `beforeunload` warns about unsaved changes.
- Only player commands mark a world as unsaved; torch ticks do not (their state is still saved with the next save).
- Strings go through i18n keys from the start (English only at first).

## Mouse placement

One click places one block (no painting). Pressing the right button shows a ghost block, dragging sets its rotation, releasing places it.

## Multiplayer (future)

One client hosts and is authoritative; others send edit commands and receive state. A browser cannot accept incoming WebSocket connections, so hosting needs either a small relay server (WebSocket) or WebRTC. This is an open decision. The design already helps: deterministic ticks and edits as serializable commands.

## Piston power rule

A piston ignores power coming from its front (head) side. This lets a piston push a redstone block without being re-powered by it, and costs the simulation only one excluded input side.

## Coordinates

Cells are integers in `[-32000, 32000)` on both axes, origin at the centre. `x` grows east, `y` grows south (screen direction).

## Edge scrolling

Edge scrolling does not trigger over the hotbar or when the cursor leaves the window.

## Open questions

- How closely to follow Minecraft behavior in general (current stance: compatibility is not a goal).
