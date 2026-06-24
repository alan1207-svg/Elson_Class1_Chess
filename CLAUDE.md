# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Project

No build step required. Open `index.html` directly in a browser. All dependencies load from CDN:
- `chess.js v0.10.3` (chess logic) — loaded via CDN in `index.html`
- Web Audio API — native browser API, no install needed
- Google Fonts (Outfit) — loaded via CDN

## Architecture

This is a single-page vanilla JS chess application with no bundler, framework, or package manager.

**Core files:**
- [index.html](index.html) — HTML structure and UI layout; loads all scripts and styles
- [script.js](script.js) — Main game controller (~1174 lines): board rendering, event handling, AI move generation, audio synthesis, clock/timer, game mode/variant management
- [laser.js](laser.js) — `LaserChess` class implementing the Khet board game (8×10 board, piece rotation, laser-path tracing, collision detection)
- [style.css](style.css) — Dark glass-morphism theme; no CSS preprocessor

**Game modes managed in `script.js`:**
1. **Standard Chess** — delegates move validation to a `chess.js` `Chess` instance
2. **Laser Chess** — delegates to the `LaserChess` instance from `laser.js`; after every move the laser fires automatically and piece removal is resolved before turn switches
3. **Bomb / Snowball variants** — layered on top of standard chess mode; Snowball accumulates a growing number of moves per turn, Bomb triggers chain reactions

**AI:** Implemented directly in `script.js` as a simple minimax/best-move function; no external engine.

**Audio:** Fully synthesized at runtime via Web Audio API oscillators and gain nodes — no audio asset files.

**State:** Entirely in-memory per session; no localStorage, no server.

## Inactive / Legacy Code

- [game$.ts](game$.ts) and [constants.ts](constants.ts) — TypeScript files referencing Legend-App state management and Konva graphics; not compiled or used by the current build
- [khetGame.py](khetGame.py), [board.py](board.py), [khet_logic.py](khet_logic.py) — Python prototype of the Khet game logic; not connected to the web frontend

## Reference Documents

- [khet_wiki.txt](khet_wiki.txt) — Khet game history, piece mechanics, and expansion rules
- [rules_text.txt](rules_text.txt) — Full rules text
- [rules.html](rules.html) — HTML-formatted rules documentation
