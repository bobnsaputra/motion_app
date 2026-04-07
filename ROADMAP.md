# StageSim Roadmap

This document outlines the planned internal and external features for StageSim, prioritizing the "Pro" experience and long-term maintainability.

## 🚀 Immediate Priorities (Pro Features)

### 1. PDF / Rehearsal Packet Export
Generate professional multi-page PDFs for directors to share with their cast.
- **Pages**: Title page, scene overviews, and one page per keyframe.
- **Content**: Stage diagram, character positions, and all three stage notes (SL/C/SR).
- **Style**: High-contrast, black & white friendly for printing.

### 2. Character Headshot Uploads
Bring the real production to life by replacing colored circles with actor photos.
- **Workflow**: Click a character → Upload image → Preview/Crop → Apply.
- **Tech**: Integrated with Supabase Storage; rendered on canvas via `ctx.drawImage`.

## 🎭 Simulation Enhancements

### 3. Stage Templates
Quick-start presets for different theatre architectures.
- **Proscenium**: Standard stage with wings.
- **Thrust**: Audience on three sides.
- **Arena / In the Round**: Audience on all four sides.
- **Custom**: Free-form stage dimensions.

### 4. Multi-Select & Group Blocking
Efficiently manage large casts.
- **Selection**: Shift+Click or Marquee Box selection.
- **Actions**: Move as a unit, rotate group, or toggle visibility for all selected.

### 5. Speech Bubbles & Timestamps
Allow characters to "speak" during keyframes.
- **Visual**: Comic-style bubbles or text labels.
- **Interaction**: Triggered during playback at specific timestamps.

## 🛠️ Technical Health & Maintenance

### 6. Component Architecture Refactoring
Simplify `StageBlockingApp.tsx` (currently ~4,500 lines) for better stability.
- **Hooks**: Extract logic into `useBlockingHistory`, `useKeyframePlayback`, and `useCanvasInteraction`.
- **Modules**: Separate the massive `draw()` function into canvas layer rendering modules.

---
*Last Updated: 2026-04-07*
