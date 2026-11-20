# Ruda – Specification

Ruda is a 2D, top-down, web-based redstone simulator inspired by Minecraft. It is **not** a 1:1 clone: the goal is a fun tool in which you can build real logic (up to something like a calculator).

The sections up to Debug mode describe what is implemented: version 1.0 and what came after it. Upcoming work is grouped into named packages without version numbers or order; a package gets a version only when it ships. Items are a plain feature list; design details live in [ARCHITECTURE.md](ARCHITECTURE.md). The release process is in [UPDATE_GUIDE.md](UPDATE_GUIDE.md).

## Playable core

World and camera

- Seemingly infinite 2D canvas (sparse, chunked world; hard limit 64 000 × 64 000 cells).
- Canvas 2D rendering, only visible chunks are drawn.
- A world with no blocks (every new world) opens at 300% zoom; others open at 100%.
- Zoom with the mouse wheel or the + and − keys (towards the middle of the screen; digit keys stay hotbar slots); pan with WASD / arrow keys or the middle mouse button.
- Crosshair cursor.
- Edge scrolling: moving the cursor to the edge of the screen pans the view. Not along the bottom edge under the hotbar and a little to its sides, where the cursor often slips while picking a block.

Editing

- Hotbar ("inventory") at the bottom, every block shown switched on (lever flipped, torch lit, button pressed, wire and delayer powered, lamp lit) so the red stands out; slots selected with number keys (1–9, and 0 for the tenth slot) or clicking. The order follows a circuit's signal: inputs, wiring, logic, outputs, then building: 1 lever, 2 button, 3 power block, 4 wire, 5 crossing, 6 torch, 7 delayer, 8 lamp, 9 piston, 0 stone.
- Right mouse button places the selected block, left mouse button removes the block under the cursor (Minecraft-style). Blocks are placed only into empty cells; nothing is replaced.
- `R` rotates the held block. Holding the right mouse button and dragging also rotates it toward the drag direction.
- Right-clicking a lever toggles it (and presses a button or cycles a delayer's delay).

Blocks

- Power block – constant power source; powers its 4 neighbours.
- Lever – toggleable power source; powers its 4 neighbours when on.
- Wire – conducts power. Connects to wires, crossings, power blocks, levers, lamps and the front and back of torches.
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

## Saving

- Multiple saved worlds, with a world list: create, open, rename, delete (with confirmation), import and export.
- Worlds stored locally (IndexedDB).
- Explicit **Save** button (and Ctrl+S) with a saved / unsaved indicator.
- "Unsaved changes" warning when closing the window; leaving a world with unsaved changes asks to save, discard or cancel.
- Background autosave as a safety net: every 30 s and when the tab is hidden, unsaved changes go to a separate recovery copy, never to the world's real save. Opening a world whose recovery copy is newer than its save offers to restore it.
- Export / import of `.ruda` files (minified JSON, world name included). An imported world is added to the list. A damaged file is repaired as far as possible (unreadable blocks and cells are left out) and the user is told before the world opens, with the number of problems found.
- Versioned file format with migrations from older versions to newer ones; files from a newer version are rejected with a clear message.

## Timing and inputs

- Delayer – a pure delay line, rotatable. Its output equals its input from `delay` ticks earlier, so every pulse comes out unchanged, just later. Delay is 1–4 ticks (new delayers start at 1); right-clicking a placed delayer cycles 1 → 2 → 3 → 4 → 1, and the change keeps the current output. Like a torch, it reads only its back and powers only its front. It shows the signals travelling through it.
- Button – momentary power source. Right-clicking powers its 4 neighbours for 10 ticks (1 s); presses while it is on are ignored.

## Pistons

- Piston – push only, no sticky variant, rotatable. Powered from its back and both sides, never from its front (head) side.
- Extends 1 tick after it gets power; when power stops it retracts 1 tick later. Retracting only pulls the head back; pushed blocks stay where they are.
- The extended head occupies the cell in front: nothing can be placed there and it does not conduct power (like stone). Removing either the piston or its head removes both.
- Only solid blocks are pushed: stone, power block, lamp and retracted pistons. They keep their state.
- Flat components (wire, crossing, lever, button, torch, delayer), extended pistons and piston heads cannot be pushed; one anywhere in the chain blocks the push.
- Pushes a chain of up to 12 blocks; if the chain is longer, would leave the world, or contains a block that cannot be pushed, nothing moves. A blocked piston tries again every tick while it is powered.
- Push animation.
- If two pistons would touch the same cell in one tick (pushing into the same cell, or one pushing the other), neither moves.

## Graphical interface

One game, in one blocky, game-like style.

Start screen

- Shown on every visit. The whole screen is a live preview of the game: a slow ring of delayers runs at reduced speed behind it, so one lamp at a time lights up and hands over to the next.
- In the middle the blocky **RUDA** logo and three buttons: **Play** (continues the last world, or creates a new one if there is none), **Worlds…** and **Controls…**. Nothing is focused when the screen opens; Tab (or an arrow) focuses Play first, then Tab goes on through Worlds… and Controls… to the light/dark switch, and the arrows reach the switch too.
- Bottom left, a faint **About** button opens a dialog: what Ruda is (a 2D simulator inspired by Minecraft's redstone, not a copy), that it is independent of Mojang and Microsoft, the contact e-mail, the GitHub repository and a download of this version's source as a `.zip`, laid out in a small table, and a note that the game was programmed with the help of Claude (`ruda_vN.N.zip`, made from the last commit by `pnpm build`).
- Next to the About button a faint version label (e.g. `1.0`) opens a changelog dialog: a short list of changes for every minor version, newest first. Versioning and the release checklist are in [UPDATE_GUIDE.md](UPDATE_GUIDE.md).
- A link to the library (`#library`, `#admin`) opens it instead; nothing in the game links there for now.

The game

- Real time, simple and playful, with a deliberately blocky look: pixel fonts, bevelled grey buttons, a framed hotbar of plain dark slots; the selected one is marked only by a white frame reaching a little past the hotbar on every side.
- On screen only: the hotbar (no number hints; the keys still work), the name of the held block popping up briefly when it changes, and in the top right corner the light/dark switch and a menu button.
- The menu (button or Esc) pauses the simulation. It offers: back to game, save, worlds, controls, debug mode, start screen. Saving shows a short confirmation. It takes the keyboard when it opens: arrows move between the buttons as they are laid out, Enter chooses. The start screen's buttons work the same way. Hovering a button with the mouse moves the focus to it, so only one button is ever highlighted and the arrows carry on from there.
- **Controls** lists every key and mouse action by section (movement, building, using blocks, game, hotbar), each shown as a key cap. The hotbar is one row with its number keys. Undo and redo are listed under game as Z and Shift+Z.
- **Keys overlay**: `?` on the start screen, in Worlds, in the game and in its menu overlays a short list of the keys that work there (in the game, debug mode's keys too while it is on); `?`, Esc or a click closes it. It does nothing while typing in a field or while a dialog, notice or the Controls list is open. While it is up, key presses do not reach the screen behind it. Every screen added later gets the overlay too, listing its own keys; every new dialog or notice turns it off while open.
- Opening a world shows a loading screen: a plain dark backdrop, "Loading world", playful status lines and a filling bar. It stays up for at least 1.2 s on purpose, as part of the game feel, so no menu flashes by on the way in.
- **Block look (Workshop)**: 16×16 Minecraft-like textures seen from straight above. Solid blocks (stone, power blocks, lamps, pistons) have a dark pixel outline, a bevel and a shadow. The lever is a slide switch: a stone plate with a wooden slider, at the bottom when off and at the top when on, where the open slot behind it glows red. The piston is kept plain: a grey body with a groove the metal rod slides in and a wooden face plate at the front. Extending, the plate and the rod slide out together over one tick, smoothly (slow at both ends), as do the blocks it pushes; the rod always comes from inside the body, through the empty socket the plate leaves, and stays joined to the plate. Retracting is the same in reverse. Light glows on the floor: yellow around lit lamps, red around power blocks and other powered parts. Zoomed out, blocks and floor blend smoothly into their average colours, with no shimmering or moiré. The same look is used by the hotbar, world thumbnails, library previews and the start screen.
- **Light and dark**: in light, a bright, warm floor of smooth stone slabs; in dark, the same slabs at night, where the light pools stand out. One button shows the other variant and switches to it; the world fades smoothly from one to the other. The variant follows the system; a choice that differs from the system is remembered, and choosing the system's variant again forgets it. Menus, dialogs and the loading screen are dark in both.
- On touch-only devices (phones, most tablets) the game shows a notice instead: it needs a mouse and a keyboard, and touch support comes later. A small "Continue anyway" dismisses it until the page is reloaded. The library opens on any device.
- When the browser asks for reduced motion (`prefers-reduced-motion`), a notice warns up front that Ruda contains flashing; "I understand" dismisses it until the page is reloaded.
- Dialogs (unsaved changes, delete) use the blocky look. Text in menus is large, for easy reading.

Worlds

- **Worlds…** (from the start screen or the menu) shows the worlds as a grid of cards on a calm dark backdrop: a thumbnail, the name and when it was last played, said the friendly way ("just now", "yesterday", "last week"). The most recently played come first.
- Clicking a card plays the world. Clicking the name renames it in place (Enter keeps, Esc cancels). A small delete button on the card asks before deleting. Each card can also export its world as a `.ruda` file.
- The first card creates a new world; **Import** next to the search field adds a `.ruda` file as a new world and opens it. A search field filters the worlds by name.
- No two worlds share a name: a world created, imported or renamed to a name already in use is numbered like in Minecraft, `New world (1)`, `New world (2)`; a name that is already numbered gets a fresh number (`Showcase (1)` → `Showcase (2)`), not a second one.
- Fully usable with the keyboard: nothing is focused when the screen opens; Tab, an arrow or Space marks the first world, arrows move between cards, Enter plays, F2 renames, Delete deletes, E exports, I imports, `/` focuses the search, Esc leaves the search field (keeping the filter) or else goes back. Tab moves only between the cards and the bar; the rename, export and delete buttons on a card have their keys instead. Keys are listed once, in a line under the cards (Space is left out there; arrows already mark the first world), and written in square brackets where shown elsewhere (`[/]`).

Naming

- Ruda uses its own names, not Minecraft's: the constant power source is the **power block** (`power_block`).

Still to design:

- UI icons and further tuning of block visuals.

## Debug mode

Extra information and control over time, for understanding and testing circuits. It keeps the game's look for buttons and titles, but shows its data in a monospace font, which reads much better than the pixel font.

- Turned on and off with `/` or from the menu; bottom right, an **Exit debug** button with its `/` key cap turns it off too. The game stays fully playable while it is on.
- **Undo and redo** of the player's edits (placing, breaking, flipping levers, changing a delayer's delay; button presses are not undone): undo with Z or Ctrl+Z, redo with Shift+Z or Ctrl+Shift+Z. Each press briefly flashes a short message at the top of the screen, where "World saved" appears, so a key pressed by mistake does not go unnoticed: "Undo" or "Redo". When there is nothing left, an orange warning says so: "Nothing left to undo", "Nothing left to redo", or "Can't go further back: only 100 steps are kept" once older ones were dropped. The same message pressed again pops once more instead of just staying. Warnings (also a failed save) are orange, confirmations green. The keys work only in debug mode, but every edit since the world was opened is remembered, the last 100; saving keeps the history and leaving the world forgets it. Undo removes a placed block, puts a broken block back with its state (an extended piston comes back retracted), and flips a lever or a delayer back. The world keeps running meanwhile, so an edit that can no longer be reversed (its block was pushed away by a piston) is skipped and the one before it is undone instead.
- Top left, a block of text like a game's debug screen, headed with the game version (e.g. "Ruda 1.0.2 debug"): tick, speed, measured ticks per second, the cell under the cursor (x, y) and the block there with its state (facing, on/off, lit, delay…; a crossing shows its horizontal and vertical channel separately, horizontal first, e.g. "on / off"; a delayer its delay and the signals travelling through it, output first, e.g. "4 ticks · 0110"), and the camera's position and zoom. The box keeps its width as the values change, so it does not jump.
- At the top in the middle, time control as a row of pixel-icon buttons in the game's blocky style: **step** (one tick), **pause**, **normal speed** (10 ticks/s), **fast** (3×, 30 ticks/s) and **max** (as many ticks as the browser manages). The chosen one looks pressed in and lit. Step works only while paused; otherwise it is greyed out and its tooltip says it is available only while paused. Keys: Space pauses and resumes at the chosen speed, `.` steps one tick while paused (otherwise it does nothing); both are in the tooltips, Controls and the `?` overlay. Turning debug mode off returns to normal speed.
- Bottom left, switches for panels that are hidden by default, each with its key: **I** the information text, **C** the world's contents (block counts per type), **M** a minimap (clicking it moves the view there). They work with the mouse as well.

Still to decide: tuning debug mode and its map; overlays such as chunk borders and highlighted wire networks; better keys if the letters clash with the game later.

## Upcoming

Packages of work, in no particular order.

### Library

Built, but **currently switched off in the app** (`LIBRARY_ENABLED` in `App.vue`; the UI and backend are complete, nothing links to it). A shared library of creations in its own tab next to **Your worlds**. It is a separate module: it exchanges only `.ruda` text with the game. Still to design: where the library and sharing a creation appear in the game. Both stay; for now the library is reachable only by its link and the built-in creations only through it.

- Browse published creations as cards with a live preview, title, author, date and description. Built-in creations ("From Ruda") come first, community creations newest first.
- **Copy to my worlds** adds a creation to the player's worlds; the copy can then be opened from the card.
- **Share a creation**: pick one of your worlds, give it a title, your name and an optional description. No accounts. Submissions wait in a queue and appear only after the admin approves them. At most 5 submissions per client and hour; a hidden field traps bots.
- Admin view at `#admin` in the Library tab: password login, preview and approve or reject waiting submissions, take down published creations.
- Built-in creations, built and tested in code: block tour, logic gates (NOT, OR, NOR, AND, NAND, XOR), clocks, light chaser, pulse tools (edge detectors, delay line), memory cell (latch), adders (half, full, 2-bit), piston switches, lamp sign.
- Backend: PHP 8.1+ with SQLite on ordinary PHP hosting (see `apps/library-api/README.md`).

### Sounds

Game mode gets sounds, tuned to its playful feel. To design:

- Which events make a sound: placing and breaking blocks, flipping levers, pressing buttons, pistons pushing and pulling, delayers clicking, torches burning out, menu clicks.
- How they are made (recorded samples or synthesized in the browser) and how loud a busy circuit may get, so many events at once don't turn into noise.
- A volume setting and mute in the pause menu; whether expert mode has sounds at all.

## Future

Ideas, not committed:

- Keyboard shortcuts across the game, to tune: consistent keys on every screen (Import and Back in Worlds have keys but no labels on their buttons); the `?` overlay is a first step.
- Guidance when starting: a short tour (coach marks pointing at parts of the screen) so new players get to know each mode's interface.
- Czech localization (strings kept in locale files from the start). [Mby waste of time and confusing only]
- images in changelog for each version, optional actually
- propper in game docs with visuals
- Selection, copy and paste.
- Modules: reusable building blocks (the exact concept is open). The hard part will be their UX, which needs a lot of exploration to get right.
	- library of modules
	- module abstraction has to be included on the field somewhere, then you clone it
	- NOT seprate modal for module creation, that is confusing
	- being able to specify modules interface: pins and lights outside
	- module names, naming pins (see 'hole'/portal feature)
	- optimization of module behaviour simulation?
- Sticky pistons.
- Delayer locking: a delayer powered from its side by another delayer holds its output.
- Observer, comparator and other components. (mby not needed)
- Multiplayer: one client hosts, others join (see ARCHITECTURE.md).
- Fully playable with only a keyboard or only a mouse (the default is both together).
- Mobile / touch support.
- Simulation in a Web Worker.
- Running worlds headless from a file (CLI / library use).
- A 3D flat world, multiplayer included, controlled like Minecraft (first-person movement and building).
- Cross-browser rendering checks: test the display in both Chrome and Firefox.
- Advanced wire placement, e.g. laying parallel wires at once in debug mode?
- 'holes'/portals in debug mode lets player connect a wire to the grid anywehre on the field, by specifying id [a-zA-Z0-9 and -_]
- test inverting mouse button functinos
- campaign mode; learning basics of CPU architecture