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
- Stage: 1600x900 canvas.
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

# StageSim — Theatre Blocking & Planning Tool (Commercial Proposal)

## Core Problem
Theatre directors and drama teachers need a visual tool to plan character blocking (movement) before rehearsals. Paper sketches are limited; 3D software is overkill. StageSim fills the gap: simple, visual, purpose-built for stage work.

## Monetization Model
Tier | Access | Limit
---|---:|---
Free | First project only OR unlimited with valid voucher code | 1 active project
Pro | All projects | Unlimited projects + PDF export + Priority support

Price: $8/month or $72/year

Key Rules
- Users own their data: All scenes exportable as JSON files anytime (no lock-in)
- Voucher codes for educators, students, community theatres (manual approval)
- No feature gating: Free users get full simulation features — only project count limited
- Grace period: After 1st project, 3-day trial to test Pro before paywall

## Target Users
- Professional theatre directors
- Drama teachers (K-12, university)
- Stage managers
- Community/student theatre groups (target for voucher program)

## Platforms
- Web app (primary)
- iOS & Android via Capacitor wrapper
- No cloud sync: Scenes saved/loaded via local files (JSON)
- Lightweight auth only: Email/password to track project count & subscription status

## MVP Features (v1.0)
### Core Simulation
- 2D canvas stage (800x600px default)
- Add characters (colored circles + labels A/B/C)
- Click to place waypoints → linear path movement
- Play/Pause/Step/Reset controls with time display

### Project System
- "New Project" button creates fresh stage
- App tracks: `projectsCreated` per user account
- After 1st project:
  - Free users see modal: "Upgrade to create more projects"
  - Voucher holders bypass limit
  - 3-day trial period before hard paywall

### File Handling
- Export scene as `scene.json` (anytime, no paywall)
- Import JSON to restore project
- No forced cloud storage — user controls files

### Auth & Billing
- Email/password signup (Firebase Auth or similar)
- Stripe integration for subscriptions
- Voucher code field on signup ("Have a code?")
- Dashboard shows: "1/1 free projects used"

## Tech Stack
Layer | Choice | Why
---|---|---
Frontend | React + TypeScript | Professional UI, hiring-friendly
UI Library | Material-UI (MUI) | Polished components, theming
Canvas | HTML5 Canvas API | Direct control for smooth animation
Auth | Firebase Authentication | Fast setup, email/password + social
Billing | Stripe + Firebase Cloud Functions | Handle subscriptions securely
State | Zustand | Simple global state (simulation + auth)
Mobile | Capacitor | Wrap web → iOS/Android
Hosting | Vercel (web) + App Stores | Fast deployment

Why Firebase? Minimal backend needed — just auth + subscription status checks. No scene data stored server-side.

## Data Flow (Privacy-First)
User creates scene → stored in browser memory

          ↓

Export → JSON file downloaded to user's device

          ↓

Import → user selects file → loaded into app

          ↓

Auth check → only for "New Project" action (verify project count)

Server never touches scene content. Only stores:
```
{ userId, email, projectsCreated: 1, subscriptionStatus: "free|pro|trial", voucherCode: "EDU-2026" }
```

## User Flow (With Monetization)
- First visit → "Sign up free"
- Create account → 1 free project unlocked
- Build blocking → export JSON anytime
- Click "New Project" →
  - If 1st project: proceeds
  - If 2nd project: show 3-day trial offer → proceed OR show Pro pricing → upgrade or enter voucher
  - Voucher holders → unlimited projects at $0

## Post-MVP Features (Pro Tier)
- PDF export (stage diagram for rehearsal packets)
- Character images (upload headshots)
- Speech bubbles at timestamps
- Dark mode
- Undo/Redo history

All free users get core simulation features — no crippled experience.

## Tagline Options
- "Your first blocking is free. The rest of the season? $8/month."
- "Plan one scene free. Plan your whole show with StageSim Pro."
- "Theatre blocking that respects your budget — and your art."

## Why This Model Works for Theatre
- Low barrier: Try full tool risk-free with 1 project
- Ethical: No data lock-in — export anytime
- Voucher-friendly: Schools/theatres get free access without sales calls
- Sustainable: Recurring revenue from professionals who use it weekly
