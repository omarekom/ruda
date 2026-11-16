# Agent instructions

Project: Ruda, a 2D web redstone simulator. Read [docs/SPEC.md](docs/SPEC.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before working.

## Code

- Everything is strict TypeScript (`strict` on, no `any`, no `@ts-ignore` without a comment explaining why).
- Write excellent, maintainable code: small focused modules, clear names, no dead code, comments only for the non-obvious "why".
- `packages/core` is pure TypeScript with no DOM, storage or real-time dependencies. UI, storage and tick pacing belong to the app.
- Simulation must stay deterministic.
- All world changes go through explicit commands, never direct mutation from the UI. Undo/redo and multiplayer depend on this.
- Code, identifiers and docs are in English. UI strings go through i18n keys.
- Add tests for the core (Vitest), especially simulation and file migrations.

## Workflow

- Commit continuously in small, logical commits with clear messages.
- Keep docs/SPEC.md in sync with what is implemented.

## Communication with the user

- Inform the user about significant decisions (architecture, simulation rules, file format, dependencies) and let them decide.
- Do not report things that are already decided or routine. Do not ask questions whose answer is in the docs or has an obvious conventional default. Keep updates short.

## Multiplayer (planned, see Future in SPEC.md)

One client hosts the session and clients connect over WebSockets. Design with this in mind from the start: deterministic simulation, edits as serializable commands, and no hidden state outside the world.
