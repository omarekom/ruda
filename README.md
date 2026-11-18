# Ruda

A 2D, top-down web simulator inspired by Minecraft redstone. Build logic circuits (clocks, gates, even a calculator) on an endless canvas.

Not a 1:1 Minecraft clone: signals are on/off, the world is flat, and crossings are a dedicated tile.

## Status

Version 1.0 is ready for release. Implemented: the playable core, saving, timing and inputs, pistons, the graphical interface (start screen, the game, world selection), debug mode and the library. Sounds (0.8) are not done yet. The library (a shared collection of creations with a PHP backend) is built and tested but switched off in the web app for now (`LIBRARY_ENABLED` in [App.vue](apps/web/src/App.vue)). See [docs/SPEC.md](docs/SPEC.md) for the feature list per version and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design.

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

Versioning and the release checklist: [docs/UPDATE_GUIDE.md](docs/UPDATE_GUIDE.md).

## Stack

- `packages/core` – TypeScript simulation library (no UI)
- `packages/creations` – built-in creations drawn from ASCII maps, with behaviour tests
- `apps/web` – Vue 3 + Vite + Canvas 2D
- `apps/library-api` – PHP + SQLite backend of the library

Worlds are saved locally and can be exported to `.ruda` files (minified JSON).
