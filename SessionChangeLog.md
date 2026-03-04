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

### Card Type Architecture Refactor
- Introduced explicit `cardType` on `Card`:
- `note`, `checkbox`, `link`, `image`, `drawing`, `folder`.
- Implemented non-destructive type semantics:
- changing card type is a UI-mode switch,
- existing blocks and children are retained in data.
- Added state normalization/migration to infer missing `cardType` values for loaded/imported legacy data.
- Added `folder` type as a first-class note type.

### Workspace and Tree Type UX
- Removed per-card add/remove modifier toggles for checkbox/link/image/drawing.
- Added single `Change type...` menu action in card `...` menus.
- Added type picker popup dialog for:
- creating new notes from `New Note`,
- changing existing note type.
- Replaced `New Note` dropdown with a single button that opens the type picker popup.
- Updated tree icon behavior to be type-driven (note/checkbox/link/image/drawing/folder).
- Updated open-card header to show type icon left of title and removed type text line under title.

### Type-Gated Rendering and Folder Behavior
- Implemented strict type-based rendering in workspace:
- `note` shows text/bullet blocks,
- `checkbox` shows checkbox UI,
- `link` shows link UI,
- `image` shows image UI,
- `drawing` shows drawing UI,
- `folder` hides block editor.
- Sub-note grid/actions are shown only for Home/folder/recycle-bin views.
- Removed folder helper text from open-card content area.
- Styled folder cards in right-grid with folder-like shape and later aligned color to standard card palette (removed orange tint).

### Interaction and Menu Simplification
- Removed open-card `...` menus for image and drawing blocks (no per-block delete/reorder actions there).
- Removed open-card `...` menu for checkbox block.
- Kept card-level deletion as the primary deletion path.
- Changed grid card open behavior to double-click for all card types.
- Removed single-click open behavior on image/drawing previews.
- Fixed drag/reorder conflict on image/drawing cards:
- disabled native image drag/copy behavior,
- ensured card drag gestures reorder cards reliably.
- Enabled `Shift+Enter` newline in grid card title inline editing (while plain Enter still commits).

### Version and Documentation
- Bumped app version from `2.28.0` to `2.29.0`.
- Recompiled production build output after the version bump and UI/model changes.
- Updated `Architecture.md` contracts to match:
- explicit card-type model,
- non-destructive type switching,
- type picker dialog flows,
- double-click opening,
- updated menu contracts and regression checklist.

### Post-2.29 Incremental UX and Reliability Updates
- Added sidebar `Hard Refresh` action below dark mode.
- Implemented mobile overscroll guard to reduce pull-to-refresh gesture conflicts in Android PWA usage.
- Tuned workspace card drag activation on touch to use long-press behavior for better scroll-vs-drag separation on mobile.
- Refined grid title editing interaction:
- long-hold activates title edit mode,
- drag gestures are preserved when not in edit mode.

### Drawing and Image Rendering Refinements
- Drawing editor toolbar was decluttered:
- drawing tool selection moved into a `Tools` dropdown,
- color, line width, clear, and aspect toggle moved into the same dropdown.
- Drawing viewport changed from square to fixed `3:4` aspect to provide more vertical space while preserving non-stretched rendering.
- Circle drawing behavior corrected:
- with aspect lock enabled, circles are now constrained in pixel space to render as true circles (not ovals),
- with aspect lock disabled, ovals remain allowed.
- Grid drawing preview rendering updated to avoid crop/stretch:
- preview generation now matches drawing viewport aspect,
- card height adapts to drawing preview instead of forcing distorted fill.
- Image grid cards were aligned with drawing behavior:
- card height adapts to image aspect,
- images scale proportionally without crop/stretch.

### Service Worker and Refresh Stability
- Migrated service worker cache behavior to avoid refresh instability:
- removed recursive version-based cache-name lookup during fetch handling,
- switched to stable runtime cache naming,
- forced network/no-store fetch path for `version.json`.
- Hardened `Hard Refresh` action to:
- unregister service workers,
- clear Cache Storage,
- reload cleanly.
- Added architecture-level refresh outcome contracts:
- normal refresh must render reliably without white-screen loop,
- hard refresh must recover app state and re-register service worker on subsequent load.

### Version Source Migration
- Migrated app/runtime version source from build-time injected constants to runtime `version.json`.
- Added `version.json` as root source of truth and emitted build artifact (`docs/version.json`).
- Replaced npm semver bump scripts for app versioning with `script/version-bump.ts` targeting `version.json`.
- Updated Vite configuration to serve/emit `version.json` directly.
- Removed `__APP_VERSION__` build-time constant usage from app/html flows.
- Updated runtime version loading in `src/src/lib/app-version.ts` and app bootstrap in `src/src/main.tsx`.
- Preserved UI version display contract as `vMAJOR.MINOR`.
- Updated docs (`Architecture.md`, `DevelopmentProcessGuide.md`, `README.md`) to reflect the new versioning process and runtime source.

### Release Progression
- Version progression during these sessions advanced through:
- `2.30.0`,
- `2.31.0`,
- `2.32.0`,
- `2.33.0`,
- `2.34.0`,
- `2.35.0`,
- `2.36.0`,
- `2.37.0`,
- `2.38.0`.
