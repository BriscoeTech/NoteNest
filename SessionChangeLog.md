# NoteNest Session Change Log

This file captures chronological implementation history and session-level updates.
Architecture requirements and product contracts belong in `Architecture.md`.

## 2026-04-26

### Card and Block Registry Refactor (v2.53.0)

**Author**: Codex

**Problem**:
- Adding a new note/card type required touching scattered type checks for creation, tree icons, menu behavior, import/load inference, workspace grid presentation, and editor rendering.
- Import/export formatting behavior was embedded in the store hook, which made the backup contract harder to test directly.

**Changes**:
- Added a `Cardbase` card-type registry in `src/src/lib/card-types.tsx` for shared card metadata and behavior:
- labels and ordering,
- picker/tree icons,
- default block creation,
- type-change block initialization,
- visible/typed block lookup,
- create-file-picker and open-after-create behavior,
- child-container capability,
- workspace grid presentation policy.
- Added a `Blockbase` block-type registry in `src/src/lib/block-types.ts` for shared block normalization and search behavior.
- Replaced repeated block-editor type dispatch with polymorphic editor definitions in `src/src/components/WorkspacePanel.tsx`.
- Extracted drawing shape and drawing tool strategy definitions so drawing behavior is less dependent on repeated tool/kind conditionals.
- Refactored shared card menu rendering to use action descriptors instead of duplicated normal/recycle-bin menu branches.
- Extracted import/export formatting, import normalization, current-format import, and legacy import migration into `src/src/lib/import-export.ts`.
- Added contract tests for:
- card type registry behavior,
- block type registry behavior,
- import/export JSON shape and formatting,
- filename formatting,
- current-format round trips,
- graph import normalization,
- legacy category/card migration.
- Updated `Architecture.md` to document the card registry, block registry, menu descriptor boundary, and import/export formatting contract.

**Result**:
- New card and block types have fewer scattered update points.
- Import/export backup formatting is now explicitly tested and easier to maintain.
- Functional behavior is intended to remain unchanged.

## 2026-04-24

### Graph Note Type and Editor

**Author**: Codex

**Changes**:
- Added first-class `graph` card type and `GraphBlock` content model in `src/src/lib/types.ts`.
- Wired graph type creation and type switching through both workspace and tree type pickers.
- Implemented graph editor UI in `src/src/components/WorkspacePanel.tsx` with:
- default `2 x 2` grid,
- minimum `2 x 2` enforcement,
- selectable cells,
- per-cell text editing,
- per-cell background color editing.
- Added graph previews in workspace cards and graph-aware search support in `src/src/hooks/use-notes-store.ts`.
- Updated `Architecture.md` to document the graph note feature contract and invariants.

**Result**:
- Users can create permanent square-grid notes for organizing and comparing ideas.

### Dev Server Script Reliability and LAN Output

**Author**: Codex

**Changes**:
- Updated `script/dev-server-start.sh` to:
- default to host `0.0.0.0`,
- print LAN-accessible URLs,
- launch Vite directly and detach it cleanly so the server process survives after the script exits.
- Updated `script/dev-server-stop.sh` so it reliably matches and stops the running Vite/npm dev process.

**Result**:
- Local dev server startup, restart, and LAN access output are now more reliable on Linux.

## 2026-04-25

### Graph Editor Resizing and Input Refinements

**Author**: Codex

**Changes**:
- Changed graph row/column numeric inputs to use local draft state so users can clear and replace values without immediate re-clamping.
- Added `+` and `-` controls for both columns and rows, with column controls ordered before row controls per final UI preference.
- Changed graph cell text rendering to black in both editor and preview paths for better readability.
- Fixed graph resize behavior so cells stay anchored to their row/column coordinates when columns or rows are added or removed.
- Added session-local buffering for trimmed graph cells so shrinking and then re-expanding within the same open editor restores hidden cells before the note is closed.

**Result**:
- Graph resizing is substantially more predictable and forgiving during editing, especially when experimenting with temporary shrink/expand changes.

### Graph Normalization Alignment

**Author**: Codex

**Changes**:
- Moved graph dimension/cell normalization helpers into `src/src/lib/types.ts` so graph rules live in one shared domain layer.
- Updated `src/src/hooks/use-notes-store.ts` to use the shared graph normalization helpers during load/import normalization.
- Updated `src/src/components/WorkspacePanel.tsx` to use the same shared helpers/constants used by the store.

**Result**:
- Graph coordinate-preserving behavior is now aligned across editor resizing, load normalization, and import normalization, reducing future drift between interactive editing and persisted/imported graph data.

## 2026-03-28

### Card Options Menu - Align Separator Conditions With Prop Types

**Author**: Codex

**Problem**:
- `npm run check` failed in `src/src/components/CardOptionsMenu.tsx` with `TS2774` because several separator conditions still treated required callbacks as optional truthy checks.
- The component prop types and the render-condition style had drifted out of sync.

**Changes**:
- Replaced the inline separator truthiness chains with explicit derived booleans for primary actions, move actions, expand actions, and type/expand sections.
- Removed the always-true `... || onDelete` style checks that TypeScript correctly rejected because `onDelete` is required.

**Result**:
- `npm run check` now passes again.
- Menu rendering behavior stays the same, but the code now matches the prop contract and is easier to maintain.

### Export Backups - Timestamped Filenames (v2.52.0)

**Author**: Codex

**Problem**:
- Exported backup filenames used only the date, so multiple exports on the same day produced the same filename and made backups easier to overwrite or confuse.

**Changes**:
- Updated `src/src/hooks/use-notes-store.ts` so export now builds filenames as `notes-backup-YYYY-MM-DD_HH-MM.json` using the local export time.
- Reused the same `Date` instance for both `exportedAt` metadata and filename generation so the exported timestamp and filename stay aligned.
- Updated `Architecture.md` to document the timestamped export filename contract in the feature inventory, import/export flow, and export data contract sections.

**Result**:
- Repeated exports on the same day now produce distinct filenames.
- Backup files are easier to identify chronologically before import or external storage.

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

### Reconstructed Release Notes
- The entries below for `2.39.0`, `2.41.0`, and `2.42.0` were derived after the fact by reading the code and Git commit history.
- They were added because the session log had fallen behind and did not contain direct contemporaneous notes for those releases.

### Release `2.39.0` (Reconstructed)
- Restored direct single-click title editing for workspace grid cards after an intermediate long-press editing interaction had been introduced.
- Removed delayed hold-to-edit pointer logic from grid card titles and returned to immediate focus/edit behavior.
- Preserved double-click card opening while making inline rename faster and more predictable.

### Release `2.41.0` (Reconstructed)
- Added masonry-style packing for workspace child cards so mixed-height cards use vertical space more efficiently.
- Implemented dynamic grid row spans based on measured rendered card height.
- Aligned sidebar utility controls so dark mode and Hard Refresh sit together in a shared row, with dividers separating them from import/export above and version display below.

### Release `2.42.0` (Reconstructed)
- Added persistent grouping support for drawing objects.
- Extended the drawing model with group membership and snapshot-based history that stores both strokes and groups.
- Updated drawing selection, move, resize, undo/redo, and editing flows to operate on grouped drawing objects.
- Added explicit group/ungroup actions in the drawing editor UI.

## 2026-03-11

### Release `2.43.0`

### Tree Drag/Reorder Behavior
- Changed sidebar tree drag behavior so dragging a card reorders among visible siblings/root instead of dropping the card inside another card/folder.
- Added before/after insertion targeting in tree drag handling.
- Added visible insertion-line feedback in tree rows while dragging.
- Preserved parent reassignment through the existing `Move to...` picker flow.

### Workspace Grid Drag Feedback
- Kept existing child-card reorder semantics in the workspace masonry/grid view.
- Added visible before/after insertion-line feedback while dragging cards in the right-hand workspace grid.

### Store and Wiring Updates
- Added store support for relative sibling insertion/reordering against a target card.
- Wired tree drag reorder to the new relative-insert flow while leaving parent moves on the explicit move action.

### Release `2.44.0`

### Documentation Alignment
- Updated `Architecture.md` to match current behavior:
- tree drag is reorder-focused,
- parent changes happen via `Move to...`,
- tree and workspace drag both show insertion-line feedback.
- Removed ambiguous architecture wording around version display/export source and made the file state explicitly that displayed/exported version values are derived from runtime `version.json`.
- Added `.gitattributes` line-ending policy notes to `DevelopmentProcessGuide.md` for Linux/Windows/Syncthing workflows.

### Cross-Platform Line Ending Policy
- Added tracked `.gitattributes` rules to reduce cross-platform line-ending churn between Linux and Windows machines.
- Policy now keeps source/docs/config files on `LF` and Windows command files on `CRLF`.

### Version Variable Naming Cleanup
- Renamed version-related implementation identifiers to reduce confusion about source-of-truth semantics.
- Replaced generic UI/export version naming with runtime-derived display naming.
- Replaced service-worker build placeholder naming so it clearly refers to semver injected from `version.json`.
- This cleanup was intended to make it obvious that these values are derived variables, not hard-coded version literals.

### Version and Release
- Bumped the app version to `2.44.0`.
- Rebuilt production `docs/` artifacts after the version bump.

## 2026-03-13

### Release `2.45.0`

### Offline/PWA Reliability Fixes
- Reworked the service worker so offline operation supports actual app startup instead of only opportunistic asset caching.
- Changed navigation handling from network-only to network-first with cache fallback, allowing the last working app shell to load with no internet connection.
- Added root-shell precaching and build-time injection of hashed JS/CSS bundle paths into the generated service worker so installed PWAs can boot offline after a successful online load.
- Changed `version.json` handling to use network-first with cache fallback instead of failing outright offline.

### Refresh Control Behavior
- Replaced the destructive sidebar `Hard Refresh` action with a plain `Refresh` action.
- Removed service-worker unregister and Cache Storage deletion from the sidebar control because that behavior could strand the PWA offline on the next reload.
- Kept the refresh affordance for normal reloads without breaking offline-readiness.

### Offline Dependency Cleanup
- Removed Google Fonts requests from app startup HTML.
- Switched the app font stacks to local/system fonts so initial render no longer depends on external font CDNs.

### Version Metadata Robustness
- Fixed export metadata so it no longer emits a blank app version when `version.json` is temporarily unavailable at startup.
- Added runtime version fallback caching so the last successfully loaded app version can still be used for export metadata and UI display when fresh version fetches fail.
- Preserved explicit final fallback to `unknown` when neither live nor cached runtime version is available.
- Why: this keeps export metadata and version display resilient in offline/degraded-network scenarios without inventing a false version value.

### Version Source Clarification
- Set `package.json`'s npm `version` field to placeholder `0.0.0` so it no longer appears to be a stale real app release number.
- Documented explicitly that `package.json` is not an application version source and that runtime/UI/export/service-worker version consumers must use `version.json`.
- Updated package scripts so patch-release commands no longer create off-protocol releases and instead fail fast with guidance to use the minor-release flow.
- Why: the repo's tooling now enforces the documented release process instead of merely describing it.

### Release Protocol Correction
- Corrected the version bump for this change set from patch-style `2.44.1` to minor release `2.45.0` to match the project rule that user-facing behavior changes use a MINOR bump.
- Rebuilt production artifacts so generated files, service-worker cache naming, and `docs/version.json` all match `2.45.0`.
- Why: the earlier patch bump conflicted with the documented process in `DevelopmentProcessGuide.md`.

### Documentation Alignment
- Updated `Architecture.md` so current contracts now describe:
- sidebar `Refresh` instead of `Hard Refresh`,
- required offline startup from cached app shell,
- service-worker navigation fallback behavior,
- removal of third-party font dependency from app-shell startup,
- non-authoritative placeholder status of `package.json` version metadata,
- runtime version fallback semantics for UI/export metadata when live `version.json` retrieval fails.
- Updated `DevelopmentProcessGuide.md` so its versioning rationale now distinguishes:
- `version.json` as the authoritative runtime version source,
- service-worker/cache versioning as strictly derived from `version.json`,
- UI/export as allowed to use cached last-known runtime version fallback and explicit unknown fallback when live retrieval fails.
- Updated `README.md` to:
- use the current product name `NoteNest`,
- summarize the current typed-note/offline/PWA feature set more accurately,
- remove internal version-policy details that belong in the process guide instead.
- Why: root markdown files should agree on product naming, scope, and versioning responsibilities.

### Version and Release
- Bumped the app version to `2.45.0`.
- Rebuilt production `docs/` artifacts after the version bump and offline/PWA fixes.

## 2026-03-16

### Line Ending Normalization
- Added repository-wide LF enforcement in [`.gitattributes`](/C:/Users/Tron/Desktop/Website/NoteNest/.gitattributes) by changing the default rule from `* text=auto` to `* text=auto eol=lf`.
- Kept explicit overrides for Windows-native script files so `.bat` and `.cmd` still use `CRLF`.
- Renormalized tracked text files that had Windows line endings in the working tree, which cleared false diffs in `package-lock.json`, `src/src/components/WorkspacePanel.tsx`, and `src/src/pages/NotesApp.tsx`.
- Set the repo-local Git setting `core.autocrlf=false` so checkout behavior now follows `.gitattributes` instead of Windows auto-conversion.
- Why: this prevents repeated line-ending churn when syncing the same repo between Linux and Windows machines.

### Tree Expansion Persistence
- Persisted sidebar tree expand/collapse state in browser local storage so folder expansion survives normal page refresh and the sidebar Refresh action.
- Restored saved expanded folder IDs on load and pruned IDs that no longer exist after deletes or import/override changes.
- Updated the architecture specification and regression checklist to make expanded-tree restoration part of the product contract.

### Left-Panel Persistence and Dev Refresh Stability
- Persisted the rest of the sidebar state in browser local storage: current scope, selected tree item, search query, and sidebar open/closed state.
- Fixed startup ordering so saved scope, selection, and expanded-folder state are restored only after IndexedDB finishes loading the card tree.
- Prevented startup from clearing saved tree state by pruning stale saved IDs only after the loaded tree is available.
- Added a localhost-only service-worker guard so local dev loads unregister existing app service workers and clear Cache Storage before boot.
- Why: this eliminates white-screen/stale-shell behavior in local dev and makes normal refresh restore the full left-panel state instead of collapsing the tree during startup.

## 2026-03-18

### Release `2.47.0`

### Shared Card Menu Refactor
- Extracted normal card actions into a shared `CardOptionsMenu` component used by both:
- sidebar tree card menus,
- workspace grid card menus.
- Preserved narrower recycle-bin item menus as a separate implementation path rather than incorrectly forcing them into the normal-card menu contract.
- Why: this reduces drift between tree and workspace menus while keeping the deleted-card recovery flow intentionally distinct.

### Folder Menu Behavior
- Added `Add Note` to folder menus in both the tree and the workspace grid.
- Wired folder `Add Note` to the existing typed note creation popup flow instead of creating a second creation path.
- Standardized folder-menu ordering so `Add Note` appears first, followed immediately by a divider before the remaining folder actions.
- Why: folder actions now expose child-note creation consistently wherever folders appear.

### Right-Click Menu Access
- Added right-click support for normal card menus in both:
- sidebar tree rows,
- workspace grid cards.
- Right-click now opens the same action set as the visible `...` trigger for normal cards.
- Why: this improves discoverability and speed without creating a second menu definition.

### Menu Consistency Improvements
- Added `Rename` to workspace grid card menus and hooked it into the existing inline title-editing surface.
- Kept tree-only actions (`Expand All` / `Collapse All`) scoped to tree menus where they are meaningful.
- Why: the shared menu renderer is now driven by a clearer action contract, while surface-specific capabilities remain explicit.

### Architecture Documentation
- Updated `Architecture.md` to reflect:
- shared normal-card menu behavior,
- right-click support for tree/grid normal-card menus,
- folder menu ordering requirements,
- a canonical menu action matrix covering action type, menu/surface, and card-type applicability.
- Why: the menu combinations had become subtle enough that they needed an explicit tracking table to prevent future regressions or overlooked differences.

### Version
- Bumped the app version from `2.46.0` to `2.47.0` using the documented minor-version workflow (`version.json` as the only app version source).

### Release `2.48.0`

### Treemap Rendering and Interaction Consolidation
- Refactored workspace treemap mode to reuse the same `GridCardItem` card renderer used by the normal workspace grid instead of maintaining a separate treemap card implementation.
- Pulled shared workspace card-grid drag behavior into a reusable `SortableCardGrid` wrapper and reused it for:
- the normal workspace child grid,
- the treemap top-level grid,
- inline child lists rendered inside treemap folders.
- Why: this reduces mode drift and makes shared card behavior land through one implementation path instead of being re-created per mode.

### Treemap Reorder Behavior
- Enabled drag-reorder in treemap mode for each visible sibling group.
- Top-level treemap cards now reorder among top-level siblings.
- Cards shown inline inside a folder now reorder within that folder's visible child list.
- Why: treemap now preserves the same organizing affordances as the standard workspace without flattening the hierarchy into one ambiguous global drag surface.

### Treemap Preference Persistence
- Persisted the workspace child-view mode (`grid` vs `treemap`) in browser local storage.
- Refreshing the page now restores the user's last selected workspace mode instead of always resetting to `grid`.
- Why: this aligns treemap with the app's other persisted UI preferences and prevents refresh from silently discarding user state.

### Architecture Documentation
- Updated `Architecture.md` to add:
- treemap as an explicit workspace-view contract,
- treemap mode persistence across refresh,
- treemap drag behavior by visible sibling group,
- a shared renderer/interaction reuse contract that emphasizes extending shared code paths instead of duplicating features across modes.
- Why: this makes code reuse an explicit architecture requirement so future menu/render/interaction work is less likely to regress by being implemented twice.

### Version
- Bumped the app version from `2.47.0` to `2.48.0` using the documented minor-version workflow (`version.json` as the only app version source).

## 2026-03-19

### Release `2.49.0`

### Workspace Header Layout
- Moved the workspace treemap mode toggle out of the right-panel child-content toolbar and into the top workspace header.
- The treemap toggle now sits alongside the current-context header controls instead of inside the sub-notes content section.
- Why: child-view mode is a workspace-level display control, so placing it in the header keeps it aligned with the overall right-pane context rather than with a specific content block.

### Architecture Documentation
- Updated `Architecture.md` to make the treemap toggle placement explicit:
- it is a header-level workspace control,
- it is not part of the sub-notes content toolbar.
- Why: this prevents future layout drift around which controls belong to the workspace shell versus the child-content area.

### Version
- Bumped the app version from `2.48.0` to `2.49.0` using the documented minor-version workflow (`version.json` as the only app version source).

### Treemap Folder Density Improvements
- Changed treemap folder internals from a single vertical child list to an adaptive masonry-style nested grid.
- Nested folder children now add columns based on child count instead of always stacking into one long strip.
- Large inline child areas now cap their height and scroll internally, preventing a single expanded folder from pushing the overall workspace far off-screen.
- Preserved treemap-local drag reorder inside folder child groups while switching nested layout from single-column list behavior to multi-column packing.
- Why: treemap folders now use available horizontal space more intelligently before falling back to scrolling, which keeps overview quality higher for dense note collections.

### Architecture Documentation
- Updated `Architecture.md` to define the new treemap folder contract:
- inline folder children use adaptive nested masonry columns,
- oversized inline child regions are height-constrained and scroll internally,
- the goal is to trade width before height when a folder contains many visible descendants.
- Why: this makes the nested treemap layout behavior explicit instead of leaving it as an incidental implementation detail.

### Release `2.50.0`

### Workspace Card Density Refinement
- Increased the number of workspace card columns in both normal grid mode and treemap mode so cards can render at a noticeably smaller default width.
- Updated responsive column counts separately for sidebar-open and sidebar-closed layouts to use available width more aggressively.
- Why: the previous column counts kept cards wider than desired, which reduced information density and made the workspace feel overly loose.

### Nested Treemap Folder Sizing
- Updated nested treemap folder sizing so deeper inline folder regions target a stable two-column child layout on medium-and-up widths.
- Allowed parent treemap folders with inline children to expand across additional parent-grid columns so the deepest visible folder can preserve two normal-sized child columns instead of collapsing into a narrow stack.
- Kept top-level treemap folders eligible for even wider expansion when they contain large child sets.
- Why: this makes deep treemap nesting prioritize readable child-card width instead of squeezing the deepest level into undersized columns.

### Architecture Documentation
- Updated `Architecture.md` to add the final layout contract for this release:
- workspace card grids use denser responsive column counts than before,
- nested treemap folders preserve a two-column child layout at deeper levels when space allows,
- ancestor folders may widen to support that deeper child-card sizing.
- Why: these density and width-propagation rules now materially affect how users read and organize dense folder trees, so they belong in the architecture contract.

### Version
- Bumped the app version from `2.49.0` to `2.50.0` using the documented minor-version workflow (`version.json` as the only app version source).

### Release `2.51.0`

### Checkbox Card Text Containment
- Fixed workspace checkbox-card title wrapping so long text now wraps within the card boundaries instead of visually spilling past the card edge before multiline layout engages.
- Added the missing shrink constraints on the checkbox-card text container in the shared workspace card renderer.
- Why: checkbox cards were breaking the visual card boundary contract for long titles, which made dense grids harder to scan and feel less stable than other card types.

### Architecture Documentation
- Updated `Architecture.md` to make checkbox-card text containment explicit:
- long checkbox titles in workspace cards must wrap inside card bounds,
- flex-layout shrink constraints must not allow checkbox text to overflow before wrapping.
- Why: this is a visible rendering contract for one of the primary card types and should be preserved during future shared-card renderer changes.

### Version
- Bumped the app version from `2.50.0` to `2.51.0` using the documented minor-version workflow (`version.json` as the only app version source).
