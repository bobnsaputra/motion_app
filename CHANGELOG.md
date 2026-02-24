# Changelog

All notable changes to this project will be documented in this file.

Entries format:
- YYYY-MM-DD HH:MM — Short description (file references)

## 2026-02-21
### UI, Config & Login polish
- 11:05 — **ConfigMenu**: Moved the "Stage Size" section to the bottom of the menu and added small ±100 quick-apply buttons beside the Width/Height labels (buttons apply immediately). Inputs remain free-text with a 2s debounce auto-apply. Added clamped limits and ephemeral toasts when exceeding maxima. (`src/components/ConfigMenu.tsx`)
- 11:10 — **Size limits**: Increased stage max width to `2000` and set max height to `900`; clamped minimum 100. (`src/components/ConfigMenu.tsx`)
- 11:15 — **Buttons**: Removed borders from the ± buttons for a cleaner, inline appearance. (`src/components/ConfigMenu.tsx`)
- 11:20 — **Toolbar sizing**: Made the toolbar default responsive to the stage by wrapping it in a container set to the stage `canvasSize` (toolbar now matches the stage width and shrinks on small viewports). (`src/components/StageBlockingApp.tsx`, `src/styles.css`, `src/components/Toolbar.tsx`)
- 11:25 — **Layout**: Adjusted layout so the stage is visually anchored toward the bottom of the main column while the toolbar sits above and is centered to the stage width. (`src/components/StageBlockingApp.tsx`, `src/styles.css`)
- 11:30 — **Login UI**: Reworked login page glassmorphism to a light yellow/white palette, improved card contrast and input readability, updated title gradient to dark→yellow, and added a new SVG logo asset. (`src/components/Login.css`, `src/components/Login.tsx`, `src/assets/stage-logo.svg`)
- 11:35 — **Cleanup**: Added timer cleanup for toast/debounce timers and minor UX polish across menus. (`src/components/ConfigMenu.tsx`)

## 2026-02-23
### Lock Stage Size UX
- 09:10 — **ConfigMenu / Stage**: Added `Lock Stage Size` checkbox (default: enabled). When enabled, the Width/Height text inputs and the ±100 quick-apply buttons are disabled and visually subdued; attempts to change the canvas size are blocked and show an ephemeral toast. (`src/components/ConfigMenu.tsx`, `src/components/StageBlockingApp.tsx`)

## 2026-02-24
### ConfigMenu: Keyframe Timing polish
- 10:15 — **Keyframe Timing**: `Move` and `Fade` inputs now display seconds (s) instead of milliseconds and remain editable with a 2s debounce before applying. (`src/components/ConfigMenu.tsx`)
- 10:20 — **Quick-adjust**: Added ±100ms quick-apply buttons for both `Move` and `Fade` (buttons apply immediately and respect configured min/max clamps). (`src/components/ConfigMenu.tsx`)
- 10:25 — **Locking**: Wired `lockKeyframeTiming` through the toolbar/config stack; when enabled the Move/Fade inputs and ± buttons are disabled and visually subdued, mirroring the Stage Size lock behavior. (`src/components/ConfigMenu.tsx`, `src/components/Toolbar.tsx`, `src/components/StageBlockingApp.tsx`)
- 10:30 — **Layout**: Cleaned up the Move/Fade input layout to match Width/Height controls and moved the `(s)` unit to the `Keyframe Timing` header for clarity. (`src/components/ConfigMenu.tsx`)

## 2026-02-13
### Scenes, Persistence & UX
- 10:10 — **Scenes**: Added scene model with `sceneBoundaries`, `sceneNames`, and `sceneIndex`. `New Scene` now saves prior scenes and starts a new scene with a first offstage keyframe and a second keyframe that is initially linked-to the first. (`StageBlockingApp.tsx`, `types.ts`)
- 10:15 — **Persistence**: Save/Load/Export/Import now persist scene metadata while remaining backward-compatible with legacy flat saves. (`StageBlockingApp.tsx`)
- 10:20 — **Playback**: Scene playback is isolated — animations and interpolation run only within the active scene and start at the scene's first keyframe (no cross-scene interpolation). (`StageBlockingApp.tsx`)
- 10:25 — **Drawing & Paths**: Movement connectors and path drawing are constrained to scene boundaries; connectors won't draw across scenes. (`StageBlockingApp.tsx`)
- 10:30 — **Linked keyframes**: The second keyframe in a new scene follows the first until edited; selecting a linked keyframe unlinks it to allow independent edits. (`types.ts`, `StageBlockingApp.tsx`)
- 10:35 — **Toolbar UX**: Added the Add (+) button inside the keyframe strip, enabled inline keyframe rename by clicking a chip, inline scene rename, and a delete-scene button (with guard preventing deletion of Scene 1). Prev/Next navigation now wraps within the current scene. (`Toolbar.tsx`, `StageBlockingApp.tsx`, `styles.css`)
- 10:40 — **Misc fixes**: Fixed popover clipping by making toolbar overflow visible so menus render properly. (`styles.css`, `FileMenu.tsx`, `ConfigMenu.tsx`)


## 2026-02-12
### Fixes & Small UX Improvements
- 09:10 — **Toolbar blocker**: Prevent toolbar overlay from intercepting canvas clicks by making `.toolbar-blocker` non-blocking; restores character clickability (`styles.css`, `Toolbar.tsx`).
- 09:12 — **Type/props**: Fixed `keyframeSpeed`/`onKeyframeSpeedChange` prop usage in `Toolbar.tsx` to remove IDE/TS errors (`Toolbar.tsx`).
- 09:20 — **Scrollbar**: Thinned keyframe horizontal scrollbar for a subtler appearance (`styles.css`).
- 09:25 — **Fade timing**: Added `fadeSpeed` configuration (Config menu + state) and used it for independent fade timing during keyframe playback (`ConfigMenu.tsx`, `StageBlockingApp.tsx`).
- 09:35 — **Playback UX**: Playback now displays the target keyframe during transitions (UI highlights the "to" frame so the beginning appears as the second frame) and starts animating from the selected keyframe (`StageBlockingApp.tsx`).
- 09:40 — **Prev/Next buttons**: Reduced padding/size for the Prev/Next toolbar buttons to tighten spacing (`Toolbar.tsx`).
- 09:45 — **Keyframe controls**: Removed per-keyframe hover icons; added global Rename/Delete controls next to Shortcuts and disabled them appropriately when no keyframe or only one keyframe exists (`Toolbar.tsx`).
- 09:50 — **Toolbar layout**: Constrained toolbar width with a `.toolbar` rule and applied `overflow:hidden` so it no longer expands the page; menus remain absolute so they render above (`styles.css`, `Toolbar.tsx`).

## 2026-02-10
### Layout & Styling
- 13:45 — **Sidebar Dock**: Added collapsible left sidebar as an overlay (`fixed z-50`) with **yellow-to-white gradient** background and shadow-xl (`StageBlockingApp.tsx`).
- 13:45 — **Horizontal Toolbar**: Reverted to floating horizontal toolbar at the top with improved spacing (`pt-8`, `pl-12`) (`StageBlockingApp.tsx`).
- 13:40 — **Shortcuts**: Added `=` as an alternative to `+` for adding keyframes (`StageBlockingApp.tsx`).
- 13:30 — **Visuals**: Restored yellow-to-white gradient background and updated canvas label typography (Inter font, subtle color) (`styles.css`, `StageBlockingApp.tsx`).
### Usability fixes and keybindings
- 10:05 — Validation: prevent characters from both moving and toggling visibility in the same keyframe; shows toast with instruction "please remove one of the actions." (`StageBlockingApp.tsx`).
- 10:15 — Changed add-keyframe shortcut to `Y` and added it to the shortcuts help (`StageBlockingApp.tsx`, `Toolbar.tsx`).
- 10:20 — Added hover tooltip beside the Add Character button and updated Add Keyframe button tooltip to show the `Y` hint (`Toolbar.tsx`).
- 10:25 — Added a Rename character button next to Duplicate that prompts for a new name (`Toolbar.tsx`).
- 10:30 — Removed `L: Load` from the shortcuts help tooltip (Load still available via the File menu). (`Toolbar.tsx`).

## 2026-02-09
### Keyframe & Shortcut Polish
- 15:xx — Keyframe labels simplified from "K1/K2/K3" to just "1/2/3" (`renumberKeyframes` and `toggleKeyframeMode` in `StageBlockingApp.tsx`).
- 15:xx — Keyframe pills now wrap to new lines instead of horizontal scrolling (`flex-wrap` replaces `overflow-x-auto` in `Toolbar.tsx`).
- 15:xx — Added **R** keyboard shortcut to toggle Reverse Stage; underlined "R" in ConfigMenu label (`StageBlockingApp.tsx`, `ConfigMenu.tsx`).
- 15:xx — Added **Space** shortcut to play/stop keyframe playback; Play/Stop buttons now show underlined text labels (`Toolbar.tsx`, `StageBlockingApp.tsx`).
- 15:xx — **R** shortcut disabled while in keyframe mode to prevent accidental stage reversal during editing (`StageBlockingApp.tsx`).
 - 15:30 — Added single-key shortcuts: `S` to Save layout and `L` to Load layout (calls `saveToLocalStorage()` / `loadFromLocalStorage()`).
 - 15:30 — Added Save/Load entries to the shortcuts tooltip in the keyframe toolbar (`Toolbar.tsx`).
 - 15:30 — Fixed history snapshots for keyframe edits so Undo/Redo now correctly restores keyframe creation, deletion, rename, and character moves across keyframes (`StageBlockingApp.tsx`).
 - 15:45 — Faster hide/unhide transitions in keyframe playback (fade shortened to 300ms) while keeping movement interpolation readable (`StageBlockingApp.tsx`).
 - 15:50 — Draw movement connector while editing keyframes when dragging a character: the connector now follows the live dragged position and points to the next keyframe (hidden only during playback) (`StageBlockingApp.tsx`).
 - 16:00 — Render hidden characters as a draggable preview during keyframe editing so you can place them while creating keyframes (`StageBlockingApp.tsx`).
 - 16:05 — Fixed runtime ReferenceError in movement-path drawing (`from`/`to` → `fromPos`/`toPos`) and ensured connectors draw from live position while dragging (`StageBlockingApp.tsx`).



## 2026-02-08
### Toolbar Revamp
- 23:45 — Rewrote `Toolbar.tsx`: replaced all inline styles with Tailwind classes, plain buttons with shadcn/ui `<Button>` variants.
- 23:45 — Added Lucide icons: `UserPlus`, `Trash2`, `Copy`, `Eraser`, `Undo2`, `Redo2`, `Settings`, `Save`, `LogOut`.
- 23:45 — Added visual dividers between button groups.
- 23:45 — Rewrote `FileMenu.tsx`: shadcn/ui ghost buttons with icons (`Save`, `FolderOpen`, `FileJson`, `Download`, `Image`), click-outside-to-close, entrance animation.
- 23:45 — Rewrote `ConfigMenu.tsx`: Tailwind grid layout, section headers, hover scale on color presets, proper input styling.
- 23:45 — Removed old `.toolbar` CSS rules from `styles.css`.

### UI Framework: Tailwind CSS + shadcn/ui
- 23:30 — Installed Tailwind CSS v4 and PostCSS plugin (`@tailwindcss/postcss`).
- 23:30 — Created `postcss.config.mjs` for Tailwind PostCSS integration.
- 23:30 — Added `@import "tailwindcss"` and shadcn/ui theme variables (oklch colors) to `src/styles.css`.
- 23:30 — Added `@` path alias in `vite.config.ts` and `tsconfig.json` (`@/*` → `./src/*`).
- 23:30 — Installed shadcn/ui dependencies: `tailwind-merge`, `clsx`, `class-variance-authority`, `lucide-react`, `@radix-ui/react-slot`.
- 23:30 — Created `src/lib/utils.ts` with `cn()` class merging utility.
- 23:30 — Created shadcn/ui components: `Button`, `Input`, `Card`, `Label` in `src/components/ui/`.

### Supabase Integration
- 23:00 — Installed `@supabase/supabase-js` client library.
- 23:00 — Created Supabase client config (`src/lib/supabase.ts`).
- 23:00 — Created `frontend/.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- 23:00 — Rewrote `Login.tsx` to use `supabase.auth.signUp()` and `supabase.auth.signInWithPassword()` (replaced `fetch` to Go API).
- 23:00 — Login form now shows email for both sign-in and sign-up (username only on registration).
- 23:00 — Rewrote `App.tsx` with Supabase session management (`getSession`, `onAuthStateChange`, `signOut`).
- 23:00 — Changed `User.id` type from `number` to `string` (UUID) in `src/types.ts`.
- 23:00 — Removed `/api` proxy from `vite.config.ts` (no more Go backend).
- 23:00 — Created database migration (`supabase/migrations/20260208000000_create_profiles.sql`): `profiles` table with RLS, auto-create trigger on signup, `updated_at` trigger.
- 23:00 — Initialized Supabase CLI (`npx supabase init`), installed as local dev dependency.
- 23:00 — Updated `README.md` to reflect Supabase stack.

### Backend Migration: Go → Supabase
- 23:00 — Removed Go backend (`backend/` folder) — auth, handlers, middleware, models, database, utils all deleted.
- 23:00 — Removed old setup docs (`SETUP_GO.md`, `SETUP_LOGIN.md`).
- 23:00 — Removed backend dependencies from frontend `package.json` (`bcrypt`, `express`, `pg`, `cors`, `dotenv`, `jsonwebtoken`, `concurrently`).
- 23:00 — Removed `server` and `start` scripts from `package.json`.
- 23:00 — Cleared root `.env` (old DB/JWT config no longer needed).

## 2026-02-03
- 16:xx — Delete and Duplicate buttons now only appear when a character is selected (conditional rendering) in `src/App.tsx`.
- 16:xx — Character selection now clears after dragging (deselects) but remains selected when clicking for direction mode in `src/App.tsx`.
- 16:xx — Alignment guides automatically clear when drag is released in `src/App.tsx`.
- 16:xx — Added magnetic snapping (8px threshold) when characters align with other objects during drag in `src/App.tsx`.
- 16:xx — Implemented smart alignment guides: blue dotted lines appear when dragging characters align with canvas center, other character centers/edges, or mixed alignments in `src/App.tsx`.
- 16:xx — Aligned all toolbar buttons to same baseline with Add Char button in `src/App.tsx`.
- 16:xx — Set default person size to 2 for better visibility in `src/App.tsx`.
- 16:xx — Selection circle now hides while dragging character for cleaner visual feedback in `src/App.tsx`.
- 16:xx — Implemented click vs drag detection: click head or shoulder enters direction mode, drag to move character position in `src/App.tsx`.
- 16:xx — Added Duplicate button to copy selected character with all properties (position offset by 30px) in `src/App.tsx`.
- 16:xx — Color combinations use complementary and contrasting palettes for visual distinction (Yellow+Red, Blue+Orange, Green+Pink, etc.) in `src/App.tsx`.
- 16:xx — Added character color customization: 8 preset color combinations (head + shoulder) plus custom color pickers in `src/App.tsx`.
- 16:xx — Implemented undo/redo system with history tracking, Ctrl+Z/Ctrl+Y keyboard shortcuts, and UI buttons in `src/App.tsx`.
- 16:xx — Created configuration dropdown menu (⚙️ icon) for Width, Height, and Person size settings in `src/App.tsx`.
- 16:xx — Created file operations dropdown menu (💾 icon) with Save/Load to localStorage, Export/Import JSON, and Export PNG in `src/App.tsx`.
- 16:xx — Added character naming system: editable name input (max 3 chars) for selected character in `src/App.tsx`.
- 16:xx — Added Clear All button to remove all characters and reset counter in `src/App.tsx`.
- 16:xx — Added Delete button to remove selected character in `src/App.tsx`.
- 16:xx — Moved STAGE label inside canvas (rendered at top) in `src/App.tsx`.
- 16:xx — Added "Press Esc to cancel" note under Add Char button with reserved space to prevent layout shift in `src/App.tsx`.
- 16:xx — Implemented shoulder z-order rendering: shoulders draw under head when facing up/down (vertical angles) in `src/App.tsx`.
- 16:xx — Fixed shoulders to scale with head size in `src/App.tsx`.
- 16:xx — Added person size input (1-3 integers) and per-character scaling system in `src/App.tsx`.
- 16:xx — Made body angles snap to 90° increments only (0, π/2, π, 3π/2) with `snapToRightAngles()` utility in `src/App.tsx`.
- 16:xx — Added hover rotation preview while setting direction in `src/App.tsx`.
- 16:xx — Replaced eye pupils with straight line indicator showing gaze direction in `src/App.tsx`.
- 16:xx — Added click-to-set direction mode: click character head to enter mode, click canvas to set direction in `src/App.tsx`.
- 16:xx — Set default character facing to down (π/2) for eagle view convention in `src/App.tsx`.
- 16:xx — Created changelog system with `CHANGELOG.md` and `scripts/appendLog.js` for tracking changes.
- 16:xx — Centered head over shoulders in `src/App.tsx`.
- 16:xx — Attached `onMouseMove` handler and fixed canvas event hookup in `src/App.tsx`.
- 16:xx — Added `Escape` key to cancel add-mode in `src/App.tsx`.
- 16:xx — Removed hover-facing behavior from `src/App.tsx` so adding characters isn't interrupted.
- 16:00 — Initial features: 2D canvas stage, add characters, draggable guides (move/handles), canvas resize controls, character labels and selection.
