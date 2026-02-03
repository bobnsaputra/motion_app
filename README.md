# Stage Simulator — MVP

Purpose
- Small web-based stage simulator (2D canvas) to place characters and define simple movement paths.
- Focus: fast feedback loop; ship a usable v1 in 2–4 weeks.

Status
- Day 1 (Canvas + Add Character): Implemented. See `index.html`.

Quick Start
1. Open `index.html` in your browser (double-click or serve from a local server).
2. Click the `Add Char` button, then click on the stage to place a character.

MVP Scope (Absolute Minimum Features)
- Stage: 800x600 canvas.
- Characters: Add via toolbar, visualized as colored circle + label (A, B, ...).
- Paths: (Day 2) Select a character and click to add waypoints; each segment = 1s.
- Simulation Controls: Play, Pause, Step (0.1s), Reset, Time display.
- Movement: Linear interpolation between waypoints. Characters stop at last waypoint.

Data Structures
- Characters: [{ id, x, y, path: [{x, y, time}] }]
- Simulation state: { currentTime, isPlaying }

Day-by-Day Plan
- Day 1: Canvas + Add Character (completed).
- Day 2: Click character to select; add waypoints; draw path lines.
- Day 3: Play button; animate characters along paths (1s per segment).
- Day 4: Step, Pause, Reset, multi-character support, time display.
- Day 5: Polish UI and visuals; prepare for user feedback.

Notes
- No frameworks; vanilla JS + HTML5 canvas.
- No backend; export/import later if needed.

Files
- `index.html` — Day 1 implementation (place characters).

Next Steps
- Implement Day 2: path definition and waypoint storage.
