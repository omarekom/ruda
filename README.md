# Ruda

A 2D, top-down web simulator inspired by Minecraft redstone. Build logic circuits (clocks, gates, even a calculator) on an endless canvas.

Not a 1:1 Minecraft clone: signals are on/off, the world is flat, and crossings are a dedicated tile.

## Status

Planning. See [docs/SPEC.md](docs/SPEC.md) for the feature list per version and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design.

## Planned stack

- `packages/core` – TypeScript simulation library (no UI)
- `apps/web` – Vue 3 + Vite + Canvas 2D

Worlds are saved locally and can be exported to `.ruda` files (minified JSON).
