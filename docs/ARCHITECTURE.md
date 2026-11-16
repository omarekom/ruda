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

- Binary signal; a connected group of wires is a single node.
- Sources power all adjacent cells.
- Per tick, every component is evaluated simultaneously from the previous tick's state, so order does not matter and runs are deterministic.
- Wires, levers, lamps and crossings have no delay. Torch (and later repeater, piston) have a delay of 1 tick or more.
- Only active parts are recomputed (event-driven), not the whole world.

## File format (`.ruda`)

Minified JSON. Blocks are grouped by type and state, with coordinates as a flat list:

```json
{
  "format": 1,
  "blocks": {
    "redstone_block": [0, 0, 5, 3],
    "lever:off": [2, 2],
    "torch:east": [4, 4]
  }
}
```

- The key is the block type, optionally followed by its state (`type:state`).
- The value is a flat list of `x, y` pairs.
- `format` is the file version. Loading runs a chain of migrations `vN → vN+1`. A file newer than the app is rejected with a clear message.
- Names have no namespace prefix.

## Frontend

- Vue 3 renders only panels (hotbar, menus). The world is drawn on a canvas outside Vue's reactivity.
- Saving: IndexedDB, explicit Save, `beforeunload` warning for unsaved changes.
- Strings go through i18n keys from the start (English only at first).

## Mouse placement

One click places one block (no painting). Pressing the right button shows a ghost block, dragging sets its rotation, releasing places it.

## Multiplayer (future)

One client hosts and is authoritative; others send edit commands and receive state. A browser cannot accept incoming WebSocket connections, so hosting needs either a small relay server (WebSocket) or WebRTC. This is an open decision. The design already helps: deterministic ticks and edits as serializable commands.

## Piston power rule

A piston ignores power coming from its front (head) side. This lets a piston push a redstone block without being re-powered by it, and costs the simulation only one excluded input side.

## Open questions

- Torch details: which neighbouring cells it powers (front and sides) and exactly what counts as its input (back side).
- Edge scrolling must not trigger over the hotbar or when the cursor leaves the window.
- How closely to follow Minecraft behavior in general (current stance: compatibility is not a goal).
