# Changelog

Every release of Ruda, patch releases included. The changelog inside the game (opened by the version label on the start screen) lists only the minor versions, the ones players notice; see [docs/UPDATE_GUIDE.md](docs/UPDATE_GUIDE.md).

## 1.1 (unreleased)

- Labels: `T` writes a one-line note in the cell under the cursor, or edits the label there. Labels scale with the zoom, hide when zoomed out below 50 %, are saved with the world and can be undone.
- Mouse buttons swapped: the left button places and uses blocks, the right button breaks them. Space and Delete click like them at the cursor.
- Debug mode pauses with `P` instead of Space.
- File format version 2 (adds labels). Version 1 files still open; Ruda 1.0 rejects version 2 files as too new.
- The keys overlay scrolls with the arrow and page keys; the keys overlay, Worlds and the changelog use the game's own scrollbar.
- A world that failed to open is no longer reported on other screens.
- In-game changelog entries get an icon.

## 1.0.3 (2026-11-20)

- Debug mode: undo and redo (Z, Shift+Z), time keys (Space to pause, `.` to step), a redesigned time bar and info box.
- The `?` keys overlay on every screen.
- A piston broken while the game is paused no longer leaves its head behind.
- The About and version buttons on the start screen show their focus ring in light mode.

## 1.0.2 (2026-11-19)

- A world with no blocks opens at 300 % zoom.

## 1.0.1 (2026-11-19)

- Works over plain HTTP too: world ids no longer need `crypto.randomUUID`.
- The site enforces HTTPS and its main host name.

## 1.0 (2026-11-18)

- First release: an endless 2D world with wires, crossings, levers, buttons, torches, delayers, lamps, power blocks, stone and pistons; worlds saved in the browser and exported as `.ruda` files; a blocky interface with light and dark looks.
