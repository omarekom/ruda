# Ruda

A 2D, top-down web simulator inspired by Minecraft redstone. Build logic circuits (clocks, gates, even a calculator) on an endless canvas.

Not a 1:1 Minecraft clone: signals are on/off, the world is flat, and crossings are a dedicated tile.

## Status

Versions 0.1–0.4 (playable core, saving, timing and inputs, pistons) and 0.7 (library) are implemented; 0.5 (graphical interface) is being designed. See [docs/SPEC.md](docs/SPEC.md) for the feature list per version and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design.

## Development

Requires Node.js and pnpm (`corepack enable`).

```sh
pnpm install
pnpm dev           # start the web app
pnpm dev:library   # start the library API (needs PHP 8.1+ with pdo_sqlite)
pnpm test          # run tests (the library API tests need PHP)
pnpm typecheck
pnpm lint
```

## Stack

- `packages/core` – TypeScript simulation library (no UI)
- `apps/web` – Vue 3 + Vite + Canvas 2D

Worlds are saved locally and can be exported to `.ruda` files (minified JSON).
