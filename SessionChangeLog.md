# NoteNest Session Change Log

This file captures chronological implementation history and session-level updates.
Architecture requirements and product contracts belong in `Architecture.md`.

## 2026-03-03

### Dev Server Tooling
- Added and hardened local dev server control scripts:
- `script/dev-server-start.sh`
- `script/dev-server-stop.sh`
- `script/dev-server-start.bat`
- `script/dev-server-stop.bat`
- Start scripts enforce single-instance behavior and print host/port URL.
- Stop scripts terminate matching Vite dev-server process flow and clear PID tracking.
- Start scripts validate local dependencies and provide explicit startup-failure diagnostics.

### Drawing Domain Model
- Extended content model with `DrawingBlock` and drawing stroke structures in `src/src/lib/types.ts`.
- Added `DrawingStroke.kind` support for:
- `freehand`
- `line`
- `rectangle`
- `circle`
- Added drawing history fields for session undo/redo snapshots:
- `historyPast`
- `historyFuture`

### Drawing Editor Capabilities
- New drawing tools:
- Select (default on drawing open)
- Pen (freehand)
- Line
- Rectangle
- Circle
- Erase Segment
- Stroke-level object erasing:
- eraser click removes whole rendered stroke segment/object.
- Selection workflows:
- rectangle marquee selection,
- direct click-hit selection on rendered geometry,
- move selected strokes by dragging,
- resize selected strokes via corner handles.
- Resize behavior:
- maintain-aspect-ratio toggle (`Aspect: On/Off`) for selection resize.
- Style editing for selected objects:
- color swatch click recolors selected strokes,
- width slider updates selected stroke width.
- Undo/redo system:
- snapshot-based history for draw, erase, transform, recolor, width changes, and clear.
- Drawing-open history behavior:
- opening a drawing editor resets undo/redo history to a fresh session baseline.

### Card/Grid Presentation
- Added drawing template creation flow and immediate navigation/open after creation.
- Drawing and image previews are visible on workspace cards.
- Clicking drawing/image preview opens the corresponding note.
- Card title rendering updated per final user preference:
- drawing cards show title text,
- image cards show title text.

### Tree View Semantics
- Added leaf icon specialization by content type:
- image notes use an image icon,
- drawing notes use a brush icon.

### Selection Precision Refinement
- Rectangle selection now selects only when the marquee crosses or touches rendered stroke geometry.
- Bounding-box-only overlap is no longer sufficient for selection.

### Validation Notes
- TypeScript validation executed repeatedly after each change set:
- `npm run check` passes with current session changes.

## 2026-03-04

### Drawing Selection Interaction Refinements
- Selection pointer-down flow now prioritizes direct stroke hit-targeting before "move current selection bounds" behavior.
- Added pending-hit behavior so drag-start on an unselected stroke can transition into marquee selection after movement threshold.
- Added additive selection modifiers:
- `Ctrl`/`Shift` + click adds the hit object to current selection.
- `Ctrl`/`Shift` + marquee adds all intersecting objects to current selection.

### Drawing Surface Sizing and Stability
- Replaced fixed-height drawing canvas (`h-72`) with fixed-aspect square viewport (`aspect-square`).
- Drawing viewport now scales uniformly with available width and avoids non-uniform stretch when sidebar visibility changes.
- Mobile/stylus usability improved by larger effective drawing area.

### Drawing Defaults and Preview Consistency
- Changed default brush size from `4` to `2`.
- Grid drawing preview now renders directly from current stroke data (`createDrawingPreviewDataUrl(drawingBlock.strokes)`) to avoid stale cached previews showing incorrect line widths.

### Image Card Presentation Tuning
- Increased image preview height while keeping width behavior unchanged:
- media-card image min-height increased (`140px` -> `220px`),
- non-media image preview height increased (`h-24` -> `h-36`).

### Documentation Architecture/Process Split
- Refocused `Architecture.md` to architecture and product behavior contracts only.
- Removed architecture sections that were process/noise oriented:
- removed change-control policy section from architecture,
- removed source-file-map section from architecture.
- Trimmed regression checklist to product behavior verification only.
- Kept operational procedures and release verification in process documentation.

### Process Guide Standardization
- Moved process/workflow guidance into root-level `DevelopmentProcessGuide.md`.
- Renamed process guide from workflow naming to process-guide naming for clearer scope.
- Standardized documentation conventions:
- root-level markdown guides,
- PascalCase markdown filenames.
- Added markdown guide purpose definitions (`Architecture.md`, `DevelopmentProcessGuide.md`, `SessionChangeLog.md`, `README.md`).

### Dev Server Script Hardening and Output Consistency
- Updated start/stop scripts to keep terminal output visible for ~3 seconds on Windows after execution.
- Fixed Windows batch parsing issue that emitted a stray `^` command error.
- Strengthened single-instance protection in start scripts:
- Windows: mutex lock + project-scoped process detection + listener PID tracking.
- Unix-like: startup lock directory + existing-process/port listener guards.
- Aligned start-script output semantics across `.bat` and `.sh`:
- explicit "already running ... - ignoring request" messaging,
- normalized `IP`, `Port`, `URL`, and `Log` output fields.
