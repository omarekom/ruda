# Ruda – Specification

Ruda is a 2D, top-down, web-based redstone simulator inspired by Minecraft. It is **not** a 1:1 clone: the goal is a fun tool in which you can build real logic (up to something like a calculator).

Each section below is a release. Items are a plain feature list; design details live in [ARCHITECTURE.md](ARCHITECTURE.md).

## 0.1 – Playable core

World and camera

- Seemingly infinite 2D canvas (sparse, chunked world; hard limit 64 000 × 64 000 cells).
- Canvas 2D rendering, only visible chunks are drawn.
- Zoom with the mouse wheel; pan with WASD / arrow keys or the middle mouse button.
- Crosshair cursor.
- Edge scrolling: moving the cursor to the edge of the screen pans the view.

Editing

- Hotbar ("inventory") at the bottom; slots selected with number keys (1–9) or clicking.
- Right mouse button places the selected block, left mouse button removes the block under the cursor (Minecraft-style). Blocks are placed only into empty cells; nothing is replaced.
- `R` rotates the held block. Holding the right mouse button and dragging also rotates it toward the drag direction.
- Right-clicking a lever toggles it (and, from 0.3, presses a button or cycles a delayer's delay).

Blocks (hotbar slots 1–7)

- Redstone block – constant power source; powers its 4 neighbours.
- Lever – toggleable power source; powers its 4 neighbours when on.
- Wire – conducts power. Connects to wires, crossings, redstone blocks, levers, lamps and the front and back of torches.
- Crossing – lets a horizontal and a vertical wire pass through each other without connecting.
- Lamp – lit when powered; does not pass power on.
- Torch – directional inverter with 1-tick delay. Its input is the cell behind it; it powers only the cell in front of it. Drawn as a half-cell block plus a torch, to show the connection.
- Stone – inert block with no function (for pushing and walls).

Simulation

- Binary signal (on/off), no signal strength.
- Only wires and crossings carry signal. Other blocks (stone, lamps) never pass power on. Only the 4 direct neighbours count, never diagonals.
- Discrete ticks, 10 ticks per second, running continuously in real time (a frontend constant, not a user setting).
- The simulation pauses while the browser tab is hidden and continues without catching up on missed ticks.
- Deterministic: all components are evaluated simultaneously from the previous tick's state.
- The core library can also simulate instantly (without real-time pacing).

Other

- English UI.

## 0.2 – Saving

- Multiple saved worlds, with a world list: create, open, rename, delete (with confirmation), import and export.
- Worlds stored locally (IndexedDB).
- Explicit **Save** button (and Ctrl+S) with a saved / unsaved indicator.
- "Unsaved changes" warning when closing the window; leaving a world with unsaved changes asks to save, discard or cancel.
- Background autosave as a safety net: every 30 s and when the tab is hidden, unsaved changes go to a separate recovery copy, never to the world's real save. Opening a world whose recovery copy is newer than its save offers to restore it.
- Export / import of `.ruda` files (minified JSON, world name included). An imported world is added to the list.
- Versioned file format with migrations from older versions to newer ones; files from a newer version are rejected with a clear message.

## 0.3 – Timing and inputs

- Delayer (hotbar slot 8) – a pure delay line, rotatable. Its output equals its input from `delay` ticks earlier, so every pulse comes out unchanged, just later. Delay is 1–4 ticks (new delayers start at 1); right-clicking a placed delayer cycles 1 → 2 → 3 → 4 → 1, and the change keeps the current output. Like a torch, it reads only its back and powers only its front. It shows the signals travelling through it.
- Button (hotbar slot 9) – momentary power source. Right-clicking powers its 4 neighbours for 10 ticks (1 s); presses while it is on are ignored.
- File format 2 (adds the new blocks); format 1 files still load.

## 0.4 – Pistons

- Piston (push only, no sticky variant), rotatable. It cannot be powered from its front (head) side.
- Pushes a chain of up to 12 blocks; if the chain is longer or blocked, nothing moves.
- Pushes all blocks, including wires, levers and lamps.
- Push animation.
- If two pistons push into the same cell in one tick, neither moves.

## 0.5 – Graphical interface

Scope still to be designed. Questions to settle:

- Overall look and layout of the editor and the world list.
- Which controls get on-screen buttons or menus instead of only shortcuts.
- Block visuals (style, colors, power indication).
- Help and onboarding for new players (replacing the current one-line control hint).

## 0.6 – Debug mode

- Pressing `/` turns debug mode on and off.

Contents still to be decided. Candidates:

- Cell coordinates under the cursor and camera position / zoom.
- Tick counter, ticks per second and frame rate.
- World statistics: block, chunk and wire-network counts.
- Overlays: chunk borders, wire networks highlighted, torches pending evaluation.

## Future

Ideas, not committed:

- Czech localization (strings kept in locale files from the start).
- Advanced / simulation mode: editing and time control (pause, step, speed), alongside the real-time game mode with a discreet switch for advanced users.
- Undo / redo.
- Selection, copy and paste, saved blueprints.
- Sticky pistons.
- Delayer locking: a delayer powered from its side by another delayer holds its output.
- Observer, comparator and other components.
- Multiplayer: one client hosts, others join (see ARCHITECTURE.md).
- Fully playable with only a keyboard or only a mouse (the default is both together).
- Mobile / touch support.
- Textures, sounds and richer game-like visuals.
- Simulation in a Web Worker.
- Running worlds headless from a file (CLI / library use).
- Sharing worlds and prebuilt circuits.
