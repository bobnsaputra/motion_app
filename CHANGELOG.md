# Changelog

All notable changes to this project will be documented in this file.

Entries format:
- YYYY-MM-DD HH:MM — Short description (file references)


## 2026-03-03
### Dark/Light Theme Toggle
- 22:00 — **Theme toggle system**: Added a light/dark theme toggle with light mode as the default. Uses `ThemeProvider` context with `useTheme()` hook, persisted to `localStorage`. The toggle is accessible from the Config menu (gear icon). (`useTheme.tsx`, `main.tsx`, `ConfigMenu.tsx`)
- 22:05 — **CSS variable scoping for dark toolbar**: Dark mode overrides Tailwind semantic color variables (`--color-foreground`, `--color-muted-foreground`, `--color-border`, etc.) scoped to `.toolbar-root`, so all toolbar buttons/text/dividers automatically get dark theme colors without inline style changes. Floating panels (`.floating-panel`) reset variables back to light values. (`styles.css`)
- 22:10 — **Dark sidebar**: Sidebar switches from yellow-50/white gradient to navy gradient (`#0f172a → #1e293b`), with indigo accent colors replacing yellow accents for active/hover states. (`Sidebar.tsx`, `styles.css`)
- 22:15 — **Dark login page**: Login page switches from warm yellow/cream theme to dark navy with indigo/violet gradient orbs, translucent card, and indigo submit button. All via CSS `[data-theme="dark"]` selectors — no component changes needed. (`Login.css`)
- 22:20 — **Dark toast notifications**: Toast colors switch from opaque pastels to translucent dark backgrounds with light text and backdrop blur. (`Toast.tsx`)
- 22:25 — **Dark loading screen**: Auth-checking spinner uses dark navy background with indigo accent in dark mode. (`App.tsx`)
- 22:30 — **Dark body & stage refinements**: Body gets subtle indigo radial gradients, stage gets refined shadows and border in dark mode. Project list modal gets glassmorphism backdrop with indigo "New Project" button. (`styles.css`, `ProjectListModal.tsx`)


## 2026-03-02
### Props & Visibility Improvements
- 02:10 — **Props as top-level state**: Moved `stageProps` from being stored inside keyframes to a top-level React state, matching how characters work. Props now exist independently of keyframe mode — no need to enter keyframes first. Save/load/export/import include `stageProps` at the top level with backward compatibility for old files that stored props inside keyframes. (`StageBlockingApp.tsx`)
- 02:15 — **Props lock fix in Props mode**: Fixed lock button not working inside Props mode. The `onCanvasMouseDown` handler was intercepting clicks and setting `skipNextClickRef`, which swallowed the click event before the lock hit-test in `handleCanvasClick`. Lock button check now runs first in `onCanvasMouseDown` for the propsMode block. (`StageBlockingApp.tsx`)
- 02:20 — **Prop resize cursor**: Hovering over a selected prop's corner resize handles now shows `nwse-resize` or `nesw-resize` cursor, matching annotation behavior. (`StageBlockingApp.tsx`)
- 02:25 — **Auto-enter Props mode on click**: Clicking a prop outside of Props mode now automatically enters Props mode and selects the prop, for both click and drag interactions. (`StageBlockingApp.tsx`)
- 02:30 — **Props blocked in keyframe mode**: Props can no longer be clicked, dragged, or resized in keyframe mode to avoid conflicts with character positioning workflow. (`StageBlockingApp.tsx`)
- 02:35 — **Visibility eye button on canvas**: Added a visibility toggle button drawn directly beside the selected character on the canvas in keyframe mode (like the lock button on props). Transparent (35% opacity, 18px) when not hovered; fully opaque and bigger (24px) when hovered with pointer cursor. Click to toggle character visibility. Removed the old visibility toolbar button. (`StageBlockingApp.tsx`, `Toolbar.tsx`)

### Mode Mutual Exclusivity & Props UX
- 04:00 — **Four mutually exclusive modes**: Enforced strict mutual exclusivity between Add Char, Edit Char, Add Prop, and Edit Prop modes. Entering any mode exits all others — deselects characters/props, clears gaze direction, exits keyframe mode as needed. (`StageBlockingApp.tsx`, `Toolbar.tsx`)
- 04:05 — **P key dual function**: P key now duplicates the selected character (when one is selected) or toggles Props mode (when no selection). Shortcut lists updated to show both. Props button underscores P only when no character is selected. (`StageBlockingApp.tsx`, `Toolbar.tsx`)
- 04:10 — **Props button dynamic label**: Button shows "Add Prop… (Esc)" in add mode, "Edit Prop… (Esc)" when a prop is selected, or "Props" when inactive. Added `selectedPropId` prop to Toolbar. (`Toolbar.tsx`, `StageBlockingApp.tsx`)
- 04:15 — **Add Prop mode isolation**: In Add Prop mode, clicking existing props is ignored — only empty-space clicks place new props. Prevents accidental selection while placing. (`StageBlockingApp.tsx`)
- 04:20 — **Edit Prop exit on empty click**: Clicking empty space in Edit Prop mode deselects the prop and exits Props mode entirely, returning to the default state. (`StageBlockingApp.tsx`)
- 04:25 — **Add Char blocks prop interaction**: Props cannot be clicked, selected, or dragged while in Add Char mode. (`StageBlockingApp.tsx`)
- 04:30 — **Prop click clears char state**: Clicking a prop to enter Edit Prop mode now clears both `selectedCharId` and `awaitingDirectionFor`, preventing stale character gaze editing. (`StageBlockingApp.tsx`)
- 04:35 — **Add tooltip position**: Moved the Add Character hover tooltip from right side to left side of the button. (`Toolbar.tsx`)
- 04:40 — **Custom rotate cursor**: Props rotation handle shows a circular arrow SVG cursor instead of the grab hand. (`StageBlockingApp.tsx`)
- 04:45 — **Smaller props picker**: Reduced props shape picker button sizes (w-5 h-5), SVG icons (10px), and padding for a more compact overlay. (`StageBlockingApp.tsx`)
- 04:50 — **Esc fix in props mode**: Fixed Escape key not working in props mode due to stale closure — added `propsMode` and `selectedPropId` to the keyboard handler useEffect dependency array. Also added early `return` after handling Esc in the propsMode branch. (`StageBlockingApp.tsx`)
- 04:55 — **Button renamed to Character**: Renamed the "Add" toolbar button to "Character" with the A underlined for the shortcut. Tooltip updated accordingly. (`Toolbar.tsx`)
- 05:00 — **Single-click char from props mode**: Clicking a character while in Edit Prop or Add Prop mode now directly selects the character, exits props mode, and initiates drag — all in one click instead of requiring two. Added character hit-testing inside the propsMode mouseDown block before the deselect/return path. (`StageBlockingApp.tsx`)

### Multi-Project Cloud Storage
- 03:00 — **Projects table migration**: Created Supabase migration for `projects` table with `id`, `user_id`, `title`, `data` (jsonb), `created_at`, `updated_at`. RLS policies restrict all CRUD to the owning user. Auto-updates `updated_at` via existing `handle_updated_at()` trigger. (`supabase/migrations/20260302000000_create_projects.sql`)
- 03:05 — **Projects service layer**: Created CRUD service module with `listProjects()`, `loadProject()`, `createProject()`, `updateProject()`, `deleteProject()`. List returns metadata only (no data blob) for performance. (`frontend/src/lib/projects.ts`)
- 03:10 — **Cloud save/load integration**: Added `currentProjectId` state, `saveToCloud()` (creates or updates), `loadProjectFromCloud()` (restores all state), `newProject()` (resets everything), and shared `buildProjectState()` helper. Cloud save also backs up to localStorage. (`StageBlockingApp.tsx`)
- 03:15 — **File menu cloud items**: Added "Save to Cloud" (with cloud upload icon) and "My Projects" (with folder icon) at the top of the File menu, separated from local operations by a divider. Renamed "Save"/"Load" to "Save Local"/"Load Local". (`FileMenu.tsx`, `Toolbar.tsx`)
- 03:20 — **Project list modal**: Created full modal for browsing all user projects with Open, New, and Delete actions. Shows project titles, last-updated timestamps, and highlights the current project. (`ProjectListModal.tsx`, `StageBlockingApp.tsx`)
- 03:25 — **Sidebar recent projects**: Sidebar now shows the 7 most recent projects when expanded, with file icons, relative timestamps, hover-to-reveal delete buttons, and a "+" new project button. Collapsed sidebar shows a clock icon. (`Sidebar.tsx`, `StageBlockingApp.tsx`)

## 2026-03-01
### Wing Expansion, Head Tuning, Loading Screen & Stage Props
- 01:00 — **Wing canvas expansion**: Wings now expand the overall canvas width instead of overlapping the stage area. Each wing adds up to 500px per side. `wingOffset` and `totalCanvasWidth` computed values drive layout; `ctx.translate(wingOffset, 0)` keeps all stage content in stage-local coordinates. All mouse handlers subtract `wingOffset` for correct hit-testing. Container divs use `totalCanvasWidth` for `maxWidth`. (`StageBlockingApp.tsx`, `ConfigMenu.tsx`)
- 01:05 — **Grid lines extend to wings**: Horizontal guides now stretch into wing areas when wings are visible, using `drawStart = -wingOffset` and `drawEnd = canvasSize.width + wingOffset`. (`StageBlockingApp.tsx`)
- 01:10 — **Head size tuning**: Default head dimensions adjusted through multiple iterations (48×40 → 36×30 → 24×20 → 32×26 → 40×34). Final default: `headW: 40, headH: 34`. Added Head W and Head H number inputs in ConfigMenu's Person Size section. (`StageBlockingApp.tsx`, `ConfigMenu.tsx`)
- 01:15 — **Person size removed from persistence**: `personSize` is no longer saved to localStorage or included in JSON export/import. Always uses the code default on load, preventing stale cached values from overriding new defaults. (`StageBlockingApp.tsx`)
- 01:20 — **Head-shoulder overlap**: Reduced `shoulderDist` from `headRy` to `headRy * 0.45` so the head sits deeper inside the shoulder ellipse. Applied in both the draw function and hit-testing for consistent click behavior. (`StageBlockingApp.tsx`)
- 01:25 — **Loading screen redesign**: Replaced the dark rectangle auth-checking screen with a themed spinner matching the Login page's warm yellow gradient (`#fffdf0` → `#fff7d6`). Shows a gold spinning circle with subtle "Loading…" text. (`App.tsx`)
- 01:30 — **Keyframe toolbar: Add & Props buttons**: Added Add Character, Props, Delete, and Duplicate buttons to the keyframe mode toolbar (placed after play buttons). Later moved Props to work outside keyframe mode and removed Add/Props from the keyframe toolbar to keep it clean. (`Toolbar.tsx`)
- 01:35 — **Props available outside keyframe mode**: Props button now appears in the non-keyframe toolbar next to Add Character. Props mode no longer requires keyframe mode — you can place, select, drag, and delete props at any time. (`Toolbar.tsx`, `StageBlockingApp.tsx`)
- 01:40 — **Props default white**: Changed default prop color from `#d4a574` (brown) to `#ffffff` (white) with full opacity. (`StageBlockingApp.tsx`)
- 01:45 — **Props shape picker**: When entering Props mode, a shape picker toolbar appears at the top-left of the stage with rectangle, circle, and triangle buttons. Click a shape to select it, then click the stage to place that shape. Active shape is highlighted in orange. (`StageBlockingApp.tsx`)
- 01:50 — **Props resizable**: Props can now be resized by dragging corner handles, identical to annotation resize. Extended `propDragRef` to support resize mode with corner info. Blue square handles appear at all 4 corners of a selected prop. Minimum size 20×20px. (`StageBlockingApp.tsx`)
- 01:55 — **Props lock button**: Selected props show a small lock button at the top-right corner. Default: transparent with padlock icon. Click to lock: turns red with X, prop becomes immovable and non-resizable. Click again to unlock. Uses existing `locked` field on `StageProp` type. (`StageBlockingApp.tsx`)
- 02:00 — **Props clickable without Props mode**: Existing props can be clicked, dragged, resized, and lock-toggled without entering Props mode. Props mode is only needed for placing new props. Added general prop hit-testing in both click and mouseDown handlers outside the propsMode block. (`StageBlockingApp.tsx`)
- 02:05 — **Stage notes auto-expand**: The three stage note textareas (left/center/right) now auto-expand vertically as content grows instead of overflowing. Uses `overflow: hidden` with dynamic height adjustment on change and mount. (`StageBlockingApp.tsx`)

### Wing Stage, Person Size Refactor, Pastel Colors & Config Menu Overhaul
- 00:00 — **Wing stage areas**: Added configurable wing areas on left/right sides of the stage with a darker shade. Toggle via checkbox in ConfigMenu. Width and height are independently adjustable with free-text inputs (2s debounce) and ±100 buttons. Max width = half stage width, max height = stage height. Lock toggle included. (`StageBlockingApp.tsx`, `ConfigMenu.tsx`, `Toolbar.tsx`)
- 00:05 — **Wing state persistence**: `showWings` and `wingSize` are saved/loaded/exported/imported. Fixed loading when keyframes array is empty (moved restore outside the keyframes conditional). `lockWingSize` defaults to true and is not persisted. (`StageBlockingApp.tsx`)
- 00:10 — **Person size pixel refactor**: Replaced integer size levels (1–3) with pixel dimensions `{ headW, headH, shoulderW, shoulderH }`. Default: headW 48, headH 40, shoulderW 72, shoulderH 40. All canvas drawing, hit-testing, and miniature SVG use pixel values directly. (`StageBlockingApp.tsx`, `ConfigMenu.tsx`, `Toolbar.tsx`, `types.ts`)
- 00:15 — **Person size config**: Head size inputs removed (only Shoulder W/H configurable, 8–160px). Head dimensions scale proportionally. Persisted in save/load/export/import. (`ConfigMenu.tsx`, `StageBlockingApp.tsx`)
- 00:20 — **Config menu reorder**: Sections reordered by usage priority: Color presets → Person Size → Keyframe Timing → Prevent Overlap → Reverse Stage → Stage Size → Wing Stage → Label/Note Font Size. (`ConfigMenu.tsx`)
- 00:25 — **Config menu scrollable**: Added `maxHeight: 700px` with `overflowY: auto` to prevent overflow on smaller screens. (`ConfigMenu.tsx`)
- 00:30 — **Pastel color palette**: All 13 color presets replaced with cheerful pastel combinations (pink/mint, lavender/peach, mint/lime, etc.). Each new character auto-cycles through the palette based on counter index. Includes a charcoal/silver dark pastel pair. (`StageBlockingApp.tsx`, `ConfigMenu.tsx`)
- 00:35 — **Prevent Overlap toggle**: Added toggleable collision prevention in ConfigMenu (off by default). When enabled: red dashed ring warns of overlapping characters, characters auto-snap to non-colliding positions on drag release, and new character placement is nudged away. When disabled: no visual warning, free placement. Uses `preventOverlapRef` to avoid stale closure in mouseUp handler. (`StageBlockingApp.tsx`, `ConfigMenu.tsx`, `Toolbar.tsx`)
- 00:40 — **Play All Scenes**: Added a "Play All Scenes" button (PlayCircle icon) next to the existing Play Scene button. Plays from the first keyframe of the first scene through the last keyframe of the last scene, automatically advancing `sceneIndex` as boundaries are crossed. Existing Play button continues to play the current scene only. (`StageBlockingApp.tsx`, `Toolbar.tsx`)
- 00:45 — **Stage Notes per keyframe**: Added `stageNotes` field (`{ left, center, right }`) to the `Keyframe` type. Three editable text areas render below the stage canvas in keyframe mode, labeled "Stage Left", "Center Stage", "Stage Right". Notes persist automatically with save/load/export/import since they live on the keyframe object. (`types.ts`, `StageBlockingApp.tsx`)


## 2026-02-26
### Note Mode robustness & Config improvements
- 00:00 — **Move speed increment**: Changed the Move speed ± quick-adjust buttons from ±100ms to ±1s (1000ms). Increased `MAX_MOVE_MS` from 1600 to 10000. (`ConfigMenu.tsx`)
- 00:05 — **Speed persistence**: `keyframeSpeed` and `fadeSpeed` are now properly saved to localStorage, loaded on restore, included in JSON export, and restored on import. Previously `keyframeSpeed` was written but never read back, and `fadeSpeed` wasn't persisted at all. (`StageBlockingApp.tsx`)
- 00:10 — **Commit notes on mode exit**: Added `commitEditingAnnotation()` helper that reads the current textarea DOM value and commits it before any mode transition. Pressing K (keyframe toggle), N (note toggle), Escape, or clicking the toolbar buttons now saves the editing note instead of discarding it. (`StageBlockingApp.tsx`)
- 00:15 — **Keyframe 1 note restriction**: Notes cannot be placed on Keyframe 1 (the starting position). Creating a note on Keyframe 1 automatically moves it to Keyframe 2, switches the view, and shows an info toast. Consistent with the existing character drag block on Keyframe 1. (`StageBlockingApp.tsx`)
- 00:20 — **Export annotation fix**: Both `saveToLocalStorage` and `exportAsJSON` now inline-read the textarea DOM value into their local snapshot before serializing, fixing a bug where the async `setKeyframes` from `commitEditingAnnotation()` hadn't applied yet and annotations were lost in exports. (`StageBlockingApp.tsx`)
- 00:25 — **Insert keyframe in-place**: `addKeyframe()` now inserts after the currently active keyframe instead of appending at the end of the scene. E.g., on keyframes 1 2 3 with 2 selected, clicking Add creates a new 3 and pushes the old 3→4. Scene boundaries after the insertion point are shifted accordingly. Current characters are committed to the active keyframe before inserting. (`StageBlockingApp.tsx`)
- 00:30 — **Note font size config**: Added `noteFontSize` state (default 14px) with a range slider (8–48px) in ConfigMenu below the Stage/Audience label size slider. New annotations use the configured size. Persisted in save/load/export/import. (`StageBlockingApp.tsx`, `ConfigMenu.tsx`, `Toolbar.tsx`)


## 2026-02-25
### Note Mode — Paint-like text annotations
- 23:00 — **Note Mode**: Added a full Paint-like text annotation system per keyframe. Toggle with the StickyNote button (left of +) or press `N`. Click anywhere on the canvas to place a text box, type to add text, click away to finish. Annotations are per-keyframe and persist with save/load/export/import. (`StageBlockingApp.tsx`, `Toolbar.tsx`, `types.ts`)
- 23:05 — **TextAnnotation type**: Added `TextAnnotation` type with `id`, `x`, `y`, `width`, `height`, `text`, `fontSize`, `color`. Extended `Keyframe` type with optional `annotations` array. (`types.ts`)
- 23:10 — **Three interaction zones**: Annotations have distinct behaviors based on where you click: **corners** = resize (all 4 corners), **border/edge** = drag to move, **inside** = click to edit text. (`StageBlockingApp.tsx`)
- 23:15 — **Corner resize handles**: Selected annotations show blue square handles at all 4 corners. Dragging any corner resizes both width and height. Right-side corners keep the left edge fixed; left-side corners keep the right edge; top corners keep the bottom; bottom corners keep the top. Minimum 60px wide, 20px tall. (`StageBlockingApp.tsx`)
- 23:20 — **Cursor feedback**: Dynamic cursor changes on hover in note mode — `nwse-resize`/`nesw-resize` on corners, `move` on borders, `text` inside, `crosshair` on empty space. (`StageBlockingApp.tsx`)
- 23:25 — **Auto-expanding textarea**: The editing overlay textarea auto-grows as you type or press Enter — no more hidden overflow. Cursor always starts at end of text when re-editing. (`StageBlockingApp.tsx`)
- 23:30 — **Click-outside behavior**: Clicking outside an editing box closes it without creating a new annotation on the same click. The next click places a new box. Empty annotations are auto-deleted on blur. (`StageBlockingApp.tsx`)
- 23:35 — **Empty annotation cleanup**: Empty annotations (no text) are filtered out before save/export and skipped during canvas drawing — no ghost dotted-line boxes. (`StageBlockingApp.tsx`)
- 23:40 — **Stale closure fix**: Save/Load/Export/Import keyboard shortcuts and toolbar buttons now use a `fileOpsRef` to always call the latest function closures, fixing a bug where annotations were lost on save because the keyboard handler captured stale `keyframes` state. (`StageBlockingApp.tsx`)
- 23:45 — **Blur text commit**: The `onBlur` handler now reads text directly from the DOM element (`e.target.value`) instead of the React closure, ensuring typed text is always preserved when clicking outside. (`StageBlockingApp.tsx`)
- 23:48 — **annotationNextId re-init**: The annotation ID counter now updates whenever keyframes change (not just on mount), preventing duplicate IDs after load/import. (`StageBlockingApp.tsx`)

### Config: Label font size
- 22:00 — **Label font size**: Added `labelFontSize` state (default 14px, down from 20px) with a range slider (8–32px) in ConfigMenu. Applied to "STAGE" and "AUDIENCE" canvas labels. Persisted in save/load/export/import. (`StageBlockingApp.tsx`, `ConfigMenu.tsx`, `types.ts`)



## 2026-02-24
### ConfigMenu: Keyframe Timing polish
- 10:15 — **Keyframe Timing**: `Move` and `Fade` inputs now display seconds (s) instead of milliseconds and remain editable with a 2s debounce before applying. (`src/components/ConfigMenu.tsx`)
- 10:20 — **Quick-adjust**: Added ±100ms quick-apply buttons for both `Move` and `Fade` (buttons apply immediately and respect configured min/max clamps). (`src/components/ConfigMenu.tsx`)
- 10:25 — **Locking**: Wired `lockKeyframeTiming` through the toolbar/config stack; when enabled the Move/Fade inputs and ± buttons are disabled and visually subdued, mirroring the Stage Size lock behavior. (`src/components/ConfigMenu.tsx`, `src/components/Toolbar.tsx`, `src/components/StageBlockingApp.tsx`)
- 10:30 — **Layout**: Cleaned up the Move/Fade input layout to match Width/Height controls and moved the `(s)` unit to the `Keyframe Timing` header for clarity. (`src/components/ConfigMenu.tsx`)

### Data integrity & keyframe fixes
- 14:40 — **Normalize scene names**: `sceneNames` are normalized on save/export/load to replace `null` entries with "Scene N" to avoid invalid saved state. (`src/components/StageBlockingApp.tsx`)
- 14:45 — **Stable export snapshot**: Exports/save now use a stable keyframe snapshot when in keyframe mode so exported top-level `characters` match the editor state. (`src/components/StageBlockingApp.tsx`)
- 14:50 — **Import robustness**: Added `inferSceneBoundariesFromKeyframes()` to infer missing scene boundaries from keyframe label resets during import and auto-fill missing scene names. (`src/components/StageBlockingApp.tsx`)
- 15:05 — **Boundary shifting on edits**: Inserting or deleting keyframes inside a scene now shifts `sceneBoundaries` and renumbers keyframes so scenes remain intact after edits. (`src/components/StageBlockingApp.tsx`)
- 15:10 — **History improvements**: History entries now include `sceneBoundaries` and `sceneNames`; `undo`/`redo` restore scene metadata as well as characters/keyframes. (`src/components/StageBlockingApp.tsx`)
- 15:20 — **Persistence**: `projectTitle`, `sceneNotes`, and `keyframeNotes` are persisted to exports/imports to improve cross-device continuity. (`src/components/Toolbar.tsx`, `src/components/StageBlockingApp.tsx`)

## 2026-02-23
### Lock Stage Size UX
- 09:10 — **ConfigMenu / Stage**: Added `Lock Stage Size` checkbox (default: enabled). When enabled, the Width/Height text inputs and the ±100 quick-apply buttons are disabled and visually subdued; attempts to change the canvas size are blocked and show an ephemeral toast. (`src/components/ConfigMenu.tsx`, `src/components/StageBlockingApp.tsx`)

## 2026-02-21
### UI, Config & Login polish
- 11:05 — **ConfigMenu**: Moved the "Stage Size" section to the bottom of the menu and added small ±100 quick-apply buttons beside the Width/Height labels (buttons apply immediately). Inputs remain free-text with a 2s debounce auto-apply. Added clamped limits and ephemeral toasts when exceeding maxima. (`src/components/ConfigMenu.tsx`)
- 11:10 — **Size limits**: Increased stage max width to `2000` and set max height to `900`; clamped minimum 100. (`src/components/ConfigMenu.tsx`)
- 11:15 — **Buttons**: Removed borders from the ± buttons for a cleaner, inline appearance. (`src/components/ConfigMenu.tsx`)
- 11:20 — **Toolbar sizing**: Made the toolbar default responsive to the stage by wrapping it in a container set to the stage `canvasSize` (toolbar now matches the stage width and shrinks on small viewports). (`src/components/StageBlockingApp.tsx`, `src/styles.css`, `src/components/Toolbar.tsx`)
- 11:25 — **Layout**: Adjusted layout so the stage is visually anchored toward the bottom of the main column while the toolbar sits above and is centered to the stage width. (`src/components/StageBlockingApp.tsx`, `src/styles.css`)
- 11:30 — **Login UI**: Reworked login page glassmorphism to a light yellow/white palette, improved card contrast and input readability, updated title gradient to dark→yellow, and added a new SVG logo asset. (`src/components/Login.css`, `src/components/Login.tsx`, `src/assets/stage-logo.svg`)
- 11:35 — **Cleanup**: Added timer cleanup for toast/debounce timers and minor UX polish across menus. (`src/components/ConfigMenu.tsx`)


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
