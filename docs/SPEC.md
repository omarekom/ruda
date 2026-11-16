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
- Right mouse button places the selected block, left mouse button removes the block under the cursor (Minecraft-style).
- `R` rotates the held block. Holding the right mouse button and dragging also rotates it toward the drag direction.
- Clicking a lever toggles it.

Blocks
- Redstone block – constant power source.
- Lever – toggleable power source.
- Wire – conducts power; auto-connects to all neighbours.
- Crossing – special tile letting two wires cross without connecting.
- Lamp – lit when powered.
- Torch – directional inverter with 1-tick delay. Drawn as a half-cell block plus a torch, to show the connection.
- Stone – inert block with no function (for pushing and walls).

Simulation
- Binary signal (on/off), no signal strength.
- Discrete ticks, 10 ticks per second, running continuously in real time (a frontend constant, not a user setting).
- Deterministic: all components are evaluated simultaneously from the previous tick's state.
- The core library can also simulate instantly (without real-time pacing).

Other
- English UI.

## 0.2 – Saving

- Multiple saved worlds, with a world list.
- Worlds stored locally (IndexedDB).
- Explicit **Save** button, "unsaved changes" warning when closing the window, background autosave as a safety net.
- Export / import of `.ruda` files (minified JSON).
- Versioned file format with migrations from older versions to newer ones.

## 0.3 – Timing and inputs

- Repeater with adjustable delay.
- Button (momentary power source).

## 0.4 – Pistons

- Piston (push only, no sticky variant), rotatable. It cannot be powered from its front (head) side.
- Pushes a chain of up to 12 blocks; if the chain is longer or blocked, nothing moves.
- Pushes all blocks, including wires, levers and lamps.
- Push animation.
- If two pistons push into the same cell in one tick, neither moves.

## Future

Ideas, not committed:
- Czech localization (strings kept in locale files from the start).
- Advanced / simulation mode: editing and time control (pause, step, speed), alongside the real-time game mode with a discreet switch for advanced users.
- Undo / redo.
- Selection, copy and paste, saved blueprints.
- Sticky pistons.
- Observer, comparator and other components.
- Multiplayer: one client hosts, others join (see ARCHITECTURE.md).
- Fully playable with only a keyboard or only a mouse (the default is both together).
- Mobile / touch support.
- Textures, sounds and richer game-like visuals.
- Simulation in a Web Worker.
- Running worlds headless from a file (CLI / library use).
- Sharing worlds and prebuilt circuits.
