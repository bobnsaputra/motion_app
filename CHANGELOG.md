# Changelog

All notable changes to this project will be documented in this file.

Entries format:
- YYYY-MM-DD HH:MM — Short description (file references)

## 2026-02-03
- 16:00 — Initial features: 2D canvas stage, add characters, draggable guides (move/handles), canvas resize controls, character labels and selection.
- 16:xx — Removed hover-facing behavior from `src/App.tsx` so adding characters isn't interrupted.
- 16:xx — Added `Escape` key to cancel add-mode in `src/App.tsx`.
- 16:xx — Attached `onMouseMove` handler and fixed canvas event hookup in `src/App.tsx`.
- 16:xx — Centered head over shoulders in `src/App.tsx`.
- 16:xx — Created changelog system with `CHANGELOG.md` and `scripts/appendLog.js` for tracking changes.
- 16:xx — Set default character facing to down (π/2) for eagle view convention in `src/App.tsx`.
- 16:xx — Added click-to-set direction mode: click character head to enter mode, click canvas to set direction in `src/App.tsx`.
- 16:xx — Replaced eye pupils with straight line indicator showing gaze direction in `src/App.tsx`.
- 16:xx — Added hover rotation preview while setting direction in `src/App.tsx`.
- 16:xx — Made body angles snap to 90° increments only (0, π/2, π, 3π/2) with `snapToRightAngles()` utility in `src/App.tsx`.
- 16:xx — Added person size input (1-3 integers) and per-character scaling system in `src/App.tsx`.
- 16:xx — Fixed shoulders to scale with head size in `src/App.tsx`.
- 16:xx — Implemented shoulder z-order rendering: shoulders draw under head when facing up/down (vertical angles) in `src/App.tsx`.
- 16:xx — Added "Press Esc to cancel" note under Add Char button with reserved space to prevent layout shift in `src/App.tsx`.
- 16:xx — Moved STAGE label inside canvas (rendered at top) in `src/App.tsx`.
- 16:xx — Added Delete button to remove selected character in `src/App.tsx`.
- 16:xx — Added Clear All button to remove all characters and reset counter in `src/App.tsx`.
- 16:xx — Added character naming system: editable name input (max 3 chars) for selected character in `src/App.tsx`.
- 16:xx — Created file operations dropdown menu (💾 icon) with Save/Load to localStorage, Export/Import JSON, and Export PNG in `src/App.tsx`.
- 16:xx — Created configuration dropdown menu (⚙️ icon) for Width, Height, and Person size settings in `src/App.tsx`.
- 16:xx — Implemented undo/redo system with history tracking, Ctrl+Z/Ctrl+Y keyboard shortcuts, and UI buttons in `src/App.tsx`.
- 16:xx — Added character color customization: 8 preset color combinations (head + shoulder) plus custom color pickers in `src/App.tsx`.
- 16:xx — Color combinations use complementary and contrasting palettes for visual distinction (Yellow+Red, Blue+Orange, Green+Pink, etc.) in `src/App.tsx`.
- 16:xx — Added Duplicate button to copy selected character with all properties (position offset by 30px) in `src/App.tsx`.
- 16:xx — Implemented click vs drag detection: click head or shoulder enters direction mode, drag to move character position in `src/App.tsx`.
- 16:xx — Selection circle now hides while dragging character for cleaner visual feedback in `src/App.tsx`.
- 16:xx — Set default person size to 2 for better visibility in `src/App.tsx`.
- 16:xx — Aligned all toolbar buttons to same baseline with Add Char button in `src/App.tsx`.
- 16:xx — Implemented smart alignment guides: blue dotted lines appear when dragging characters align with canvas center, other character centers/edges, or mixed alignments in `src/App.tsx`.
- 16:xx — Added magnetic snapping (8px threshold) when characters align with other objects during drag in `src/App.tsx`.
- 16:xx — Alignment guides automatically clear when drag is released in `src/App.tsx`.
- 16:xx — Character selection now clears after dragging (deselects) but remains selected when clicking for direction mode in `src/App.tsx`.
- 16:xx — Delete and Duplicate buttons now only appear when a character is selected (conditional rendering) in `src/App.tsx`.
