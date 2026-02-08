# Changelog

All notable changes to this project will be documented in this file.

Entries format:
- YYYY-MM-DD HH:MM — Short description (file references)

## 2026-02-09
### Keyframe & Shortcut Polish
- 15:xx — Keyframe labels simplified from "K1/K2/K3" to just "1/2/3" (`renumberKeyframes` and `toggleKeyframeMode` in `StageBlockingApp.tsx`).
- 15:xx — Keyframe pills now wrap to new lines instead of horizontal scrolling (`flex-wrap` replaces `overflow-x-auto` in `Toolbar.tsx`).
- 15:xx — Added **R** keyboard shortcut to toggle Reverse Stage; underlined "R" in ConfigMenu label (`StageBlockingApp.tsx`, `ConfigMenu.tsx`).
- 15:xx — Added **Space** shortcut to play/stop keyframe playback; Play/Stop buttons now show underlined text labels (`Toolbar.tsx`, `StageBlockingApp.tsx`).
- 15:xx — **R** shortcut disabled while in keyframe mode to prevent accidental stage reversal during editing (`StageBlockingApp.tsx`).

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
