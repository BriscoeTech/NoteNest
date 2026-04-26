# NoteNest Architecture

## 0. Document Scope and Authoring Standard

This document is the canonical requirements and architecture specification for NoteNest. It defines what the product must do, key constraints, and why major architectural choices were made.

### 0.1 Focus
- Define stable product behavior, data contracts, invariants, and non-functional requirements.
- Capture architecture-level rationale and tradeoffs that inform long-term design decisions.
- Serve as a reconstruction guide for re-implementing the product from scratch.

### 0.2 Tone and Style
- Use normative, implementation-independent language where possible (`must`, `should`, `may`).
- Describe required behavior and constraints, not per-session timelines or dev diary notes.
- Exclude operational procedures (release steps, scripts, runbooks); keep this document architecture-focused.

### 0.3 What Must Be Added Here
- Any new user-facing behavior contract.
- Any data model or import/export contract change.
- Any new invariant, safety rule, or architectural constraint.
- Any architecture-level rationale or tradeoff that affects design decisions.

## 1. Purpose and Scope

### 1.1 Product purpose
NoteNest is a local-first, hierarchical note workspace for organizing personal notes into a nested card tree.

### 1.2 Primary goals
- Fast note capture and organization without requiring a server.
- Reliable offline behavior with local persistence.
- Clear parent/child structure for notes and sub-notes.
- Safe deletion workflow via recycle bin before permanent delete.

### 1.3 Explicit non-goals (current version)
- No user accounts or authentication.
- No cloud sync or collaboration.
- No backend API dependency.
- No cross-device automatic data synchronization.

## 2. Canonical Feature Inventory

This section is the authoritative feature contract. Changes must be reflected here.

| Area | Feature 
|---|---
| Notes model | Hierarchical note tree (root + nested children) 
| Notes model | Card rename and inline title editing 
| Notes model | Move cards between parents 
| Notes model | Prevent invalid cyclic moves 
| Notes model | Manual reorder (up/down and drag reorder) 
| Notes model | Move picker excludes self/descendant targets; store also rejects invalid move targets as safety 
| Notes model | Explicit card type model: `note`, `checkbox`, `link`, `image`, `drawing`, `graph`, `folder` 
| Notes model | Card type changes are non-destructive UI-mode switches (existing data retained) 
| Notes model | Typed note creation uses a shared type picker dialog (workspace `New Note`) 
| Content | Card blocks: text, bullets, image, checkbox, link, drawing, graph 
| Content | Graph notes store a square-cell matrix with per-cell text and background color 
| Content | Graph editor enforces a minimum `2 x 2` grid and defaults new graph notes to `2 x 2` 
| Content | Graph editor emphasizes the divider after row 1 and column 1 with darker separator lines 
| Content | Graph editor presents column controls before row controls 
| Content | Graph editor provides `+` and `-` controls for row and column resizing in addition to numeric entry 
| Content | Graph cell text renders in black to preserve legibility across cell background colors and themes 
| Content | Shrinking a graph temporarily buffers trimmed cells for the current editor session so immediate re-expansion restores them before the editor is closed 
| Content | Graph resize and normalization rules preserve cell row/column coordinates consistently across editor interactions, load normalization, and import normalization 
| Content | Strict card-type rendering: only active type UI is shown; other block data remains stored 
| Content | Reorder blocks with drag and with move up/down 
| Content | One image block per card in current UI flows (replace existing image on add) 
| Content | Drawing tools: select, pen, line, rectangle, circle, erase-segment 
| Content | Drawing selection supports direct line-hit + marquee + move + resize 
| Content | Drawing selection supports additive selection with Ctrl/Shift click and Ctrl/Shift marquee 
| Content | Drawing supports persistent hierarchical groups with group/ungroup actions 
| Content | Selecting a grouped member selects its containing top-level group; grouped move/resize transforms all descendant objects together 
| Content | Drawing pointer-down prioritizes direct stroke/object hit-selection before marquee/bounds-drag fallback 
| Content | Drawing selection resize supports aspect-ratio lock toggle 
| Content | Selected drawing objects support color and width edits 
| Content | Drawing editor uses a fixed-aspect `3:4` viewport to avoid sidebar/stretch distortion 
| Content | Default drawing brush size is 2 
| Content | Drawing undo/redo snapshot history; reset on drawing open 
| Content | Quick checkbox toggle directly in tree/grid for checkbox-type cards 
| Search | Search by title and textual block content 
| Search | Recycle Bin search is title-only (deleted cards) 
| Search | Navigation/selection clears active search query 
| Search | Current-card block editor is hidden while search is active 
| Deletion | Soft delete into recycle bin 
| Deletion | Restore deleted card subtree 
| Deletion | Permanent delete from recycle bin 
| Deletion | Restore undeletes all descendants in subtree (recursive restore) 
| Deletion | Recycle Bin lists deleted descendants even when ancestor is deleted 
| Deletion | Recycle Bin preserves deleted hierarchy in right-panel tree view 
| Deletion | Recycle Bin supports "Empty Recycle Bin" permanent purge action 
| Data safety | Export JSON backup 
| Data safety | Export filenames include local date and hour/minute so repeated same-day exports do not collide (`notes-backup-YYYY-MM-DD_HH-MM.json`) 
| Data safety | Import JSON backup with merge/override modes 
| Data safety | Invalid import file shows error feedback and does not apply changes 
| Data safety | Import is parse-validated; payload shape validation is minimal 
| Persistence | IndexedDB persistence via `idb-keyval` 
| Persistence | Legacy migration fallback from localStorage format 
| UX | Sidebar collapse/expand 
| UX | Dark mode toggle with local preference storage 
| UX | Sidebar tree expand/collapse state persists across refresh and restores the last expanded folders 
| UX | Sidebar dark mode and Refresh actions are grouped in one shared utility row with separators above and below 
| UX | Sidebar Refresh action reloads the app without clearing service worker or Cache Storage state 
| UX | Initial theme fallback to system `prefers-color-scheme` when no saved preference exists 
| UX | Sidebar footer app version display (runtime-derived from `version.json`) 
| UX | Recycle Bin displays deleted-card count badge 
| UX | Recycle Bin view is read-only for content editing and note creation 
| UX | Card actions are context-driven through shared card action menus for normal cards, with recycle-bin action menus for deleted-card recovery/cleanup 
| UX | Normal card action menus are available from both `...` trigger and right-click in tree and workspace grid 
| UX | Grid cards open note on double-click (all card types) 
| UX | Workspace children cards use masonry packing while preserving existing responsive column counts and drag-reorder behavior 
| UX | Workspace supports `grid` and `treemap` child-view modes, with treemap reusing the same card renderer and sortable-grid behavior while only adding inline folder-child rendering 
| UX | Treemap folder cards use adaptive nested masonry columns for visible inline children instead of a fixed single-column stack 
| UX | Oversized treemap folder child regions are height-constrained and scroll internally instead of expanding without bound 
| UX | Workspace child-card grids use denser responsive column counts so cards render narrower by default than in earlier releases 
| UX | Deep nested treemap folders preserve a two-column child layout at medium-and-up widths when space is available 
| UX | Ancestor treemap folders may widen across additional parent-grid columns to preserve readable deeper child-card widths 
| UX | Long checkbox-card titles in workspace cards wrap within the card boundary and must not overflow before multiline layout engages 
| UX | Treemap view preference persists across refresh in local browser storage 
| UX | Grid image/drawing previews disable native image drag to preserve card reorder behavior 
| UX | Grid drawing previews render from current stroke data to avoid stale style/width display 
| UX | Image and drawing cards render title text in grid 
| UX | Tree icons are card-type-driven, with checkbox rows as an exception (checkbox control is the marker; no extra icon) 
| PWA | Manifest + service worker + installable static app 
| PWA | Normal refresh must render reliably (no white-screen loop) with active service worker 
| PWA | Offline startup must succeed from a previously cached app shell after at least one successful online load 
| Deploy | Static GitHub Pages build to `docs/` 

## 3. User Flows

### 3.1 Create and edit note
1. User creates a new note at root or under current scope.
2. User selects note type from a type picker dialog: note, checkbox, link, image, drawing, graph, or folder.
3. New card is inserted under target parent with generated ID and timestamps.
4. Template note creation can initialize first block based on selected template.
5. Drawing and graph template creation immediately open the created note for editing.
6. User may change card type from card `...` menus via a type picker dialog.
7. Type change updates presentation immediately but keeps existing card data (blocks/children) intact.
8. User edits card title and currently visible type-specific content.
9. For `graph` type, the editor shows column controls before row controls, includes `+` and `-` resize actions, and presents a selectable square grid where each cell stores text and color.
10. During a graph editing session, trimming rows or columns must buffer hidden cells so an immediate re-expand restores them while the editor remains open.
11. When the graph editor is closed, only the currently visible matrix remains persisted; session-only buffered cells are discarded.
12. For `folder` type, the content editor is hidden and sub-note area is shown.
13. Changes are persisted to IndexedDB after state updates.
14. Normal card action menus may be opened either from the visible `...` trigger or by right-clicking the card row/card tile.

### 3.2 Navigate hierarchy
1. User selects Home, a tree card, or a grid card.
2. In workspace grid, opening cards is triggered by double-click.
3. App updates current scope (`currentCardId`) and tree selection state.
4. Workspace shows current card content and, when applicable, children grid.
5. When treemap mode is enabled, workspace still uses the same card tiles and actions, but folder cards also render visible descendants inline inside the folder card.
6. Dense treemap folders should trade horizontal space before vertical overflow by adding nested columns for visible inline children.
7. If an inline child region still becomes too tall, it should become internally scrollable rather than forcing one folder card to grow without bound.
8. In deeper nesting, the innermost visible folder should prefer a readable two-column child layout when viewport width allows, with ancestors widening first when necessary.

### 3.9 Refresh and recovery behavior
1. Normal browser refresh must reload and render app shell reliably with service worker enabled.
2. Sidebar Refresh action must reload the app without unregistering service workers or clearing Cache Storage.
3. Sidebar tree expand/collapse state must survive normal browser refresh and sidebar Refresh action reloads.
4. On startup, the tree must restore the last persisted expanded-folder state for cards that still exist.
5. Offline startup must succeed from a previously cached app shell even when navigation requests cannot reach the network.
6. Sidebar utility controls must present dark mode and Refresh adjacent in a shared row, visually separated from import/export above and version display below.

### 3.3 Move and reorder
1. User uses "Move to..." picker to move a card to another parent or to root.
2. Store validates move (`canMoveCard`) to avoid self/descendant loops.
3. Store updates parent linkage and timestamps.
4. User can reorder within siblings from the tree (up/down or drag reindex) and from the workspace grid (drag reindex).
5. Tree and workspace drag-reorder UI show an insertion line indicating the before/after drop position.
6. Reordering updates visible sibling order while preserving deleted siblings in current store logic.
7. In treemap mode, drag-reorder is scoped per visible sibling group:
- top-level visible cards reorder among top-level siblings,
- cards rendered inside a folder reorder only within that folder's visible children.

### 3.4 Delete and recover
1. Delete marks target card and descendants `isDeleted = true`.
2. Deleted cards appear in Recycle Bin view.
3. Current UI restore action restores deleted cards to root.
4. Permanent delete removes card subtree from state.
5. Store supports restore to an arbitrary target parent, but current UI only exposes restore-to-root.
6. Restore is recursive: restoring a deleted parent restores all descendants in that subtree.

### 3.5 Import and export
1. Export serializes full tree with version metadata.
2. Export filename includes local date plus hour/minute so repeated exports on the same day produce distinct files: `notes-backup-YYYY-MM-DD_HH-MM.json`.
3. Import accepts JSON and prompts for mode:
- `merge`: append imported root cards to existing cards.
- `override`: replace current cards with imported cards.
4. Legacy import format with `categories` is migrated to card tree.

### 3.6 Quick task toggling
1. If a card is checkbox-type and contains a checkbox block, user can toggle it directly from tree rows.
2. The same checkbox can be toggled from workspace grid cards.
3. Toggle updates the underlying checkbox block on that card.

### 3.7 Search-mode behavior
1. Entering search switches workspace into search-results browsing.
2. Current-card block editor is hidden while search is active.
3. Card navigation and tree selection actions clear active search query.

### 3.8 Recycle Bin interaction mode
1. Recycle Bin is a recovery/cleanup view for deleted cards.
2. Content blocks are non-editable in recycle-bin mode.
3. New note creation actions are hidden in recycle-bin mode.
4. Available actions are restore-to-root and permanent delete.
5. Deleted descendants are listed in Recycle Bin even if a deleted ancestor is also present.
6. Right-panel Recycle Bin view preserves tree hierarchy (nested deleted items).
7. `Empty Recycle Bin` permanently purges all deleted items.

## 4. Data Model and Invariants

Source of truth for stored data shape: `src/src/lib/types.ts`.
Source of truth for card-type behavior: `src/src/lib/card-types.tsx`.

### 4.1 Core types
- `AppState`: `{ cards: Card[] }` where `cards` are root cards.
- `Card`:
- `id`, `title`, `cardType`, `blocks`, `parentId`, `children`, `sortOrder`, `createdAt`, `updatedAt`, `isDeleted`.
- `ContentBlock` union:
- `TextBlock`, `BulletBlock`, `ImageBlock`, `CheckboxBlock`, `LinkBlock`, `DrawingBlock`, `GraphBlock`.
- `DrawingBlock` scene data:
- `strokes` plus persistent `groups`, with undo/redo snapshot history storing both.
- `GraphBlock` matrix data:
- `rows`, `columns`, and `cells` where each cell stores `text` and `color`.
- Recycle bin sentinel ID: `RECYCLE_BIN_ID = "__recycle_bin__"`.

### 4.2 Invariants
- Card IDs are unique.
- `state.cards` contains only root nodes; descendants are nested in `children`.
- `parentId` of root cards is `null`.
- A card cannot be moved under itself or under any descendant.
- `cardType` controls visible UI/edit surface; it does not delete hidden blocks or children.
- Graph notes must keep `rows >= 2` and `columns >= 2`.
- Graph blocks must persist exactly `rows * columns` cells after normalization/import.
- Graph cell text must render in black in current UI flows.
- Graph session-only resize buffering must not be persisted to the stored block model.
- Graph normalization logic must be shared across editor and persistence paths so cell coordinates are preserved consistently during resize, load normalization, and import normalization.
- Children are allowed under any card in data model; UI gating controls when sub-note area is shown.
- Soft delete marks whole subtree deleted.
- Restore restores whole subtree deleted flags.
- Restore rebuilds subtree parent links consistently under the chosen restore target.
- Sorting uses `sortOrder` (higher value renders earlier).
- Reordering operates on non-deleted sibling sets while preserving deleted siblings in the resulting list.
- Search results exclude deleted cards except in recycle bin workflows.
- Recycle bin search matching is title-only.
- Recycle Bin collection includes deleted descendants, not only top-level deleted roots.
- Recycle Bin right-panel presentation uses deleted roots with nested deleted descendants.
- Current image creation/edit flows keep at most one image block per card by replacing existing image block on add.
- Drawing editor opens with Select as default tool.
- Drawing session undo/redo history is reset when opening a drawing note.
- Drawing groups may be nested.
- Selecting any stroke inside a grouped hierarchy resolves to the containing top-level selected group in the current interaction scope.
- Group transforms operate on descendant strokes while preserving persisted group membership.
- Ungroup dissolves only the selected group node and promotes its direct children to the removed group's parent.

### 4.3 Generated fields
- IDs generated via `generateId()`.
- `updatedAt` is refreshed on updates through tree update utilities.

## 5. State and Persistence Architecture

Source of truth: `src/src/hooks/use-notes-store.ts`.

### 5.1 Store responsibilities
- Owns full card tree state and all mutations.
- Exposes note operations to UI:
- add/update/updateBlocks/move/reorder/delete/restore/permanentDelete/search/import/export.

### 5.2 Persistence contract
- Storage key: `notecards_data`.
- Primary store: IndexedDB via `idb-keyval`.
- Save behavior: serialize whole `AppState` JSON on each post-load state change.
- Load behavior:
- Try IndexedDB first.
- If missing, check legacy localStorage key and migrate.

### 5.3 Migration behavior
- Supports legacy `categories + cards` schema.
- Converts categories into card nodes and maps legacy card fields into blocks.
- Normalizes loaded/imported cards to ensure `cardType` exists (inferred from existing card data when missing).
- Persists migrated result back into IndexedDB.

### 5.4 Theme preference persistence
- Theme key: `notenest-theme`.
- Values: `dark` or `light`.
- Applied by toggling `document.documentElement.classList` with `dark`.
- If no saved preference exists, initial theme follows system `prefers-color-scheme`.

### 5.4.1 Tree expansion persistence
- Tree expansion state is persisted locally in browser storage.
- Persisted value records expanded card IDs only.
- Expanded tree restoration must wait until the card tree has finished loading from IndexedDB.
- On load, the tree restores expanded state only for card IDs that still exist in the current tree.
- Removed/import-replaced card IDs must be pruned from persisted expansion state.

### 5.4.2 Left-panel UI persistence
- Sidebar UI state is persisted locally in browser storage.

### 5.4.3 Right-panel view preference persistence
- Workspace child-view mode is persisted locally in browser storage.
- Persisted values are currently `grid` and `treemap`.
- On refresh/startup, the workspace must restore the last selected child-view mode.
- Persisted left-panel state includes current navigation scope, selected tree item, search query, sidebar open/closed state, and tree expansion state.
- Scope and selection restoration must wait until the card tree has finished loading from IndexedDB so startup does not clear saved values.
- Saved scope and selection IDs that no longer exist in the loaded tree must be cleared.

### 5.5 Versioning Contract
- App version source is runtime `version.json`.
- Version must be controlled in one place only: `version.json` (`version` field).
- Runtime/UI/export/service-worker version consumers must read from `version.json`.
- If live runtime version retrieval fails, UI/export may fall back to the last successfully loaded runtime version cached locally.
- If neither live nor cached runtime version is available, version display/export may degrade to an explicit unknown value rather than fabricating a version.
- `package.json`'s npm `version` field is not used as an application version source and may remain an inert placeholder value.
- Required source version format (`version.json`): semver `MAJOR.MINOR.PATCH` (e.g., `2.19.0`).
- Display format in UI is normalized to `vMAJOR.MINOR` (e.g., `v2.9`).
- Version is shown in sidebar footer and included in export metadata.
- Service worker cache versioning derives from `version.json`.

## 6. UI Architecture

### 6.1 Top-level composition
- `src/src/pages/NotesApp.tsx`:
- Bridges store to UI components.
- Owns current navigation scope, selection, search query, sidebar visibility, and dark mode state.
- Restores persisted left-panel UI state after store load and prunes stale saved IDs.

### 6.2 Sidebar tree
- `src/src/components/CategoryTree.tsx`:
- Displays Home, card tree, and Recycle Bin.
- Tree supports:
- expand/collapse + recursive expand/collapse,
- persisted expand/collapse restoration across refresh,
- persisted expansion restoration only after store load completes,
- inline rename,
- move/reorder/delete,
- drag-and-drop sibling/root reordering with before/after insertion indicator.
- parent reassignment via `Move to...` picker.
- card checkbox quick toggle when card includes checkbox block.
- normal tree card action menus are available from both `...` and right-click.
- Below the Recycle Bin row (inside the scrollable tree), a divider separates the "utility" section:
- utility section supports export/import plus a shared row containing dark mode and Refresh actions.
- utility section uses dividers to separate import/export, dark-mode/refresh actions, and version display.
- utility section displays current app version derived from runtime `version.json`.
- Recycle Bin row shows a count badge for deleted cards when count > 0.

### 6.2.1 Tree Visual Semantics

- Tree row icon behavior is card-type-driven and part of the UI contract:
- `folder`: folder/open-folder icon based on expanded state.
- `checkbox`: no separate type icon in tree rows; the checkbox control is the leading visual marker.
- `link`: link icon.
- `image`: image icon.
- `drawing`: brush icon.
- `note`: file icon.

### 6.3 Workspace panel
- `src/src/components/WorkspacePanel.tsx`:
- Header for current context and parent navigation.
- Workspace-level view toggles such as the treemap on/off control belong in this top header area, not inside the child-content toolbar.
- Current card editor for title and type-gated block list.
- Title row includes current card type icon.
- Children displayed as a masonry-packed card grid with create/move/reorder/delete actions.
- Workspace child-card grids should use dense responsive column counts so note cards render narrower than earlier wider-grid layouts.
- The child-content toolbar contains section-local actions such as `New Note` and recycle-bin purge, but not workspace-shell view-mode toggles.
- Uses `@dnd-kit` for block and child-card drag sorting.
- `New Note` opens a shared type picker dialog (note/checkbox/link/image/drawing/folder).
- Grid cards open on double-click (all types).
- Grid-card action menus are available from both `...` and right-click.
- Masonry layout must preserve the existing responsive column-count rules; it changes vertical packing only.
- Child-card drag reorder semantics and store reorder logic must remain unchanged under masonry layout.
- Child-card drag reorder UI shows a before/after insertion indicator while dragging.
- Grid cards render image/drawing previews with native image drag disabled to preserve card drag-reorder.
- Folder cards in grid use folder-style shape while keeping standard card color theme.
- In treemap mode, folder-card inline children use adaptive nested masonry columns rather than a fixed single-column stack.
- Treemap folder inline-child regions may become internally scrollable once they exceed a practical height budget.
- In deeper nested treemap levels, inline child grids should stabilize around a two-column layout on medium-and-up widths when practical.
- Parent treemap folders may widen across additional parent-grid columns to preserve readable child width for deeper visible folders.
- Checkbox-card title rows must preserve `min-w-0` shrink behavior so long titles wrap inside the card instead of overflowing past the card edge first.
- Non-folder cards hide sub-note area in workspace.
- Drawing editor in workspace supports tool-based drawing, persistent group selection, transform, and style updates.

### 6.4 Dialogs
- `CategoryPickerDialog` for move target selection.
- Import mode dialog for merge/override choice.
- Card type picker dialog used for:
- creating new notes from workspace `New Note`,
- changing existing note type from card `...` menus.
- Move target picker excludes self and descendants for the selected moving card.
- Store validation (`canMoveCard`) remains the final safety guard for invalid targets.

### 6.5 Card Action Menu Contract

- Normal card actions in the tree and workspace grid are defined by a shared action-menu contract.
- For normal cards, the same action set must be available from both the visible `...` trigger and right-click.
- Recycle Bin actions remain menu-based and are intentionally narrower than normal-card actions.
- Menu visibility pattern:
- desktop layouts may reveal the `...` trigger on hover to preserve compact card layouts,
- right-click must still expose the same normal-card action set without requiring the trigger.

### 6.5.1 Normal Card Action Matrix

This table is the canonical source for subtle action/menu/card-type combinations. Future menu changes must update this matrix and the shared menu implementation together.

| Action Type | Menu / Surface | Card Type Applicability |
|---|---|---|
| Add Note | Tree normal card menu | `folder` only |
| Add Note | Workspace grid normal card menu | `folder` only |
| Open | Workspace grid normal card menu | all card types |
| Rename | Tree normal card menu | all card types |
| Rename | Workspace grid normal card menu | all card types |
| Move to... | Tree normal card menu | all card types |
| Move to... | Workspace grid normal card menu | all card types |
| Move Up | Tree normal card menu | all card types |
| Move Up | Workspace grid normal card menu | all card types |
| Move Down | Tree normal card menu | all card types |
| Move Down | Workspace grid normal card menu | all card types |
| Change type... | Tree normal card menu | all card types |
| Change type... | Workspace grid normal card menu | all card types |
| Expand All | Tree normal card menu | cards with visible non-deleted children only |
| Collapse All | Tree normal card menu | cards with visible non-deleted children only |
| Delete | Tree normal card menu | all card types |
| Delete | Workspace grid normal card menu | all card types |

### 6.5.2 Folder Menu Ordering Contract

- In normal-card menus, folder cards must place `Add Note` first.
- `Add Note` must be followed immediately by a divider before the remaining folder actions.
- Tree and workspace grid folder menus must preserve this ordering consistently.

### 6.5.3 Recycle Bin Menu Matrix

| Action Type | Menu / Surface | Card Type Applicability |
|---|---|---|
| Restore | Recycle Bin right-panel item menu | deleted cards of any card type |
| Delete Forever | Recycle Bin right-panel item menu | deleted cards of any card type |

### 6.5.4 Current Shared-Implementation Boundary

- The shared normal-card action menu implementation currently governs tree normal-card menus and workspace grid normal-card menus.
- Recycle Bin item menus are still menu-based but are a separate implementation path with their own narrower recovery/cleanup contract.

### 6.6 Shared Renderer and Interaction Reuse Contract

- Workspace `grid` mode and workspace `treemap` mode must reuse the same base card renderer for normal cards.
- The `grid`/`treemap` mode toggle is a workspace-shell control and must remain in the top workspace header rather than inside the child-card content section.
- Treemap mode must not introduce a separate note/checkbox/link/image/drawing card implementation with divergent layout, spacing, menu, or interaction behavior.
- The only intended rendering difference between workspace `grid` and workspace `treemap` is that treemap folder cards may render visible descendant cards inline inside the same folder card shell.
- Shared card-grid layout decisions such as masonry row behavior, responsive column rules, and shared spacing constants should come from shared code paths/constants rather than duplicated per-mode values.
- Treemap folder inline-child layout should adapt column count to visible child density so the UI consumes available width before creating extreme vertical growth.
- When inline folder content still exceeds a practical height, the folder should constrain that region and allow internal scrolling rather than expanding indefinitely.
- Width propagation across nested treemap folders is intentional: ancestor folders may claim additional parent-grid width so the deepest visible folder can maintain usable child-card widths.
- Shared interactions such as right-click menus, `...` menus, rename, double-click open, and drag-reorder should be implemented through shared controller/render paths wherever the behavior contract is the same.
- When a feature applies to both workspace modes, implementation should extend the shared path rather than copy the feature into a second mode-specific renderer.

### 6.7 Card Type Registry Contract

- Card-type metadata and shared behavior must be centralized in a card-type registry based on `Cardbase`.
- The registry is the source of truth for card type order, labels, picker icons, tree icons, default block creation, type-change block initialization, visible block filtering, import/load type inference, media-card behavior, create-and-open behavior, grid presentation policy, and child-container capability.
- Persisted cards must remain plain JSON objects; class instances must not be serialized into IndexedDB, import/export files, or sync payloads.
- UI components and store normalization should consume the registry instead of duplicating `cardType` switch statements for shared behavior.
- Type-specific rendering and editing controls may remain in component code when they are genuinely unique to a card type, but shared applicability decisions should come from the registry.
- Folder cards are normal registered card types with `canHaveChildren = true`.

### 6.8 Block Type Registry Contract

- Block-type metadata and shared behavior must be centralized in a block-type registry based on `Blockbase`.
- The registry is the source of truth for block normalization and block-level search matching.
- Persisted blocks must remain plain JSON objects; class instances must not be serialized into IndexedDB, import/export files, or sync payloads.
- Editor dispatch may use polymorphic block editor definitions in component code when the renderer needs React state, refs, or callbacks.
- Shared menu surfaces should render from action descriptors instead of hard-coded repeated menu branches.

## 7. Search Architecture

- Search input control is in the sidebar tree.
- Workspace participates by rendering scoped search results from shared query state.
- Store search (`searchCards`) scans:
- card title,
- text block content,
- bullet item text.
- Search respects current scope when provided (root or selected subtree).
- Deleted cards are excluded from normal search and shown via recycle bin flow.
- Recycle Bin search behavior is separate: it filters deleted cards by title only.
- While search is active, current-card block editing view is not shown.
- Selecting/navigating cards clears search query and returns to normal scope view.

## 7.1 Block Interaction Rules

- Bullet block keyboard behavior:
- `Tab`: increase indent (max 5).
- `Shift+Tab`: decrease indent (min 0).
- `Enter` (without Shift): add new bullet at same indent below current item.
- `Backspace` on empty item:
- remove item if multiple items exist,
- otherwise reset indent to 0 when possible.
- Link behavior:
- In grid cards, links are opened with `https://` prepended when missing scheme.
- Image behavior:
- Adding an image in current card editor or grid-card quick actions replaces any existing image block on that card.
- Drawing behavior:
- Default drawing tool on open: `Select`.
- Available tools: `Select`, `Pen`, `Line`, `Rectangle`, `Circle`, `Erase Segment`.
- Tools are selected from a compact `Tools` dropdown in drawing editor.
- Default brush size is `2`.
- Eraser removes whole stroke objects by rendered-line hit.
- Circle tool behavior:
- with aspect lock on, circle draw is constrained to true circles,
- with aspect lock off, circle draw allows ovals.
- Selection supports marquee and direct click-hit on rendered lines.
- Pointer-down behavior prioritizes direct stroke/object hit-selection before marquee/bounds-drag fallback.
- If pointer-down starts on an unselected stroke/object and drag movement exceeds threshold, interaction transitions to marquee selection.
- `Ctrl`/`Shift` + click adds stroke/object to current selection.
- `Ctrl`/`Shift` + marquee adds intersecting strokes/objects to current selection.
- Drawing toolbar exposes `Group` and `Ungroup` actions for current selection.
- Groups may contain other groups and are persisted in drawing note data.
- Clicking any grouped member selects the containing top-level group in scope.
- Selected strokes/groups support move and corner-handle resize.
- Resize supports aspect-ratio lock toggle.
- Color swatches and width slider apply to all descendant strokes in the current selection.
- Marquee selects only when region touches/crosses rendered geometry, not bbox-only overlap.
- Drawing surface is rendered in a fixed-aspect viewport (`3:4`) so resizing surrounding layout does not distort drawing geometry.

## 7.2 Card Type UI Semantics (Current UI Contract)

- Cards have explicit `cardType` and UI is strict by active type.
- Type change is non-destructive:
- hidden blocks/children remain in stored data and can reappear when switching back.
- Visible editor surface by type:
- `note`: text/bullet blocks,
- `checkbox`: checkbox block UI,
- `link`: link block UI,
- `image`: image block UI,
- `drawing`: drawing block UI,
- `folder`: no block editor.
- Sub-note management UI in workspace is shown for Home and folder-type cards.

## 8. Import/Export Data Contract

### 8.1 Export payload
- Export formatting is centralized in `src/src/lib/import-export.ts` and covered by `script/import-export-contract.test.ts`.
- Shape:
- Top-level key order is `version`, `exportedAt`, `cards`.
- `version`: app version derived from runtime `version.json`, with last-known cached runtime fallback and explicit unknown fallback when unavailable,
- `exportedAt`: ISO timestamp,
- `cards`: full root card array including nested children.
- Export JSON is pretty-printed with two-space indentation.
- Download filename format: `notes-backup-YYYY-MM-DD_HH-MM.json` using the local device time at export.

### 8.2 Import accepted formats
- Current format: `{ cards: Card[] }` optionally with metadata.
- Legacy format: `{ categories: any[], cards: any[] }` migrated to current tree.

### 8.3 Merge vs override semantics
- `merge`: root-level concatenation `[...existing.cards, ...imported.cards]`.
- `override`: `state.cards = imported.cards`.
- Validation note:
- current UI enforces JSON parse validity for import, while payload structure validation remains minimal.

## 9. Offline, PWA, and Deployment

### 9.1 PWA
- Manifest: `public/manifest.json`.
- Service worker: `public/sw.js`, registered in `src/index.html`.
- Caching model:
- install precaches the root app shell plus build output assets required for offline boot,
- navigation requests use network-first with cache fallback so the last working shell still loads offline,
- `version.json` uses network-first with cache fallback,
- GET assets are served cache-first with runtime cache fill.
- App shell startup should not depend on third-party font CDNs.

### 9.2 Build and deploy
- The build pipeline is static-site oriented and produces deploy artifacts in `docs/`.
- Build script (`script/build.ts`) outputs to repo `docs/` with `base: "./"` for GitHub Pages compatibility.
- `docs/` is a required tracked deploy artifact for GitHub Pages branch-folder publishing and must not be removed as an "orphaned" directory.

## 10. Technology Choices and Rationale

- React 19 + TypeScript:
- predictable component composition with typed contracts.
- Vite:
- fast local iteration and static output.
- Tailwind CSS + Radix UI primitives:
- rapid consistent UI and accessible base components.
- `idb-keyval`:
- simple IndexedDB wrapper for local-first persistence.
- `@dnd-kit`:
- robust drag-and-drop for block and grid sorting.
- No backend:
- lower operational complexity, true offline-first behavior.

## 11. Non-Functional Requirements

### 11.1 Reliability
- User edits must persist locally without explicit save action.
- App must remain usable offline after first load.

### 11.2 Performance
- Typical operations (edit, move, search in normal note sets) should feel immediate.
- Full-state serialization is acceptable at current scale; revisit if note volume grows substantially.

### 11.3 Responsiveness
- Layout must support desktop and mobile viewport widths.
- Sidebar can be collapsed for narrow or focused workspace usage.
- Grid column count adapts when sidebar is open vs collapsed.

### 11.4 Accessibility baseline
- Interactive controls should remain keyboard focusable.
- Buttons/menus/dialogs should preserve usable focus behavior.

## 12. Known Limitations and Tradeoffs

- No account sync or conflict resolution across devices.
- Search only inspects text and bullet content, not link URL text metadata beyond explicit URL field.
- Recycle bin search currently only inspects deleted card titles.
- Import merge does not deduplicate by ID/content.
- Tree drag UI prevents common invalid drops, while hard correctness is enforced in store move validation.
- Whole-state JSON persistence may become heavy at very large dataset sizes.

## 13. Product Regression Checklist

Verify the product behavior items below:

- Can create root and nested notes.
- Can create typed notes from type picker: Note, Checkbox, Link, Image, Drawing, Folder.
- Can rename notes from tree and workspace.
- Tree and workspace normal-card menus can be opened from both `...` and right-click.
- Folder menus place `Add Note` first, followed by a divider, in both tree and workspace.
- Can move note to another parent and to root.
- Cannot move note into itself/descendants.
- Move picker excludes invalid self/descendant targets and store validation still rejects invalid targets as safety.
- Can reorder siblings (up/down) in tree and grid drag reorder in workspace.
- Tree drag reorder does not nest into cards/folders; parent changes use `Move to...`.
- Drag reorder shows insertion line feedback in both tree and workspace grid.
- Reorder behavior preserves deleted siblings while reordering visible siblings.
- Workspace `grid` and `treemap` modes use the same card/menu behavior for shared features; only folder inline-child rendering differs in treemap.
- The treemap toggle appears in the top workspace header, not in the sub-notes content toolbar.
- Treemap restores the previously selected mode after refresh.
- Treemap drag-reorder works per visible sibling group, including inside expanded folders.
- Treemap folder inline children expand into additional masonry columns as density grows instead of remaining a single tall column.
- Very large treemap folder child regions become internally scrollable instead of forcing unbounded card height.
- Workspace grid and treemap both use denser responsive column counts than earlier releases, so cards render narrower by default.
- Deep nested treemap folders preserve a two-column child layout on medium-and-up widths when available, with ancestor folders widening to support that layout.
- Card type can be changed from `...` -> `Change type...` in tree and grid.
- Tree and workspace normal-card menu ordering stays in sync for shared actions (`Add Note`, `Rename`, `Move to...`, `Move Up`, `Move Down`, `Change type...`, `Delete`).
- Type-change dialog appears and selecting a new type updates icon/UI immediately.
- Type change is non-destructive: switching type does not delete hidden blocks/children.
- Tree icons match card type (`note`, `link`, `image`, `drawing`, `folder`) with checkbox rows as explicit exception (no extra icon).
- Checkbox quick toggle works in tree/grid for checkbox-type cards.
- Long checkbox-card titles in workspace wrap inside the card boundary instead of overflowing before multiline wrapping engages.
- Can reorder blocks via drag and up/down actions.
- Bullet keyboard controls work:
- Tab/Shift+Tab indent, Enter add bullet, Backspace empty-item behavior.
- Search returns expected notes for title/text/bullet terms.
- Recycle bin search filters deleted cards by title.
- Navigating/selecting cards clears active search query.
- Current-card block editor is hidden during active search.
- Link in grid opens correctly with scheme normalization.
- Adding an image replaces prior image block on the same card.
- Drawing behavior checks:
- drawing template opens created note immediately,
- drawing opens with `Select` tool by default,
- tools available: select/pen/line/rectangle/circle/erase-segment,
- default brush width is 2 on drawing open,
- direct click-hit and marquee selection both work on rendered geometry,
- pointer-down prioritizes direct stroke/object hit-selection before marquee/bounds-drag fallback,
- dragging from hit-target transitions to marquee when drag exceeds threshold on unselected objects,
- ctrl/shift click adds objects to selection,
- ctrl/shift marquee adds objects to selection,
- selected strokes can move/resize,
- aspect toggle affects resize constraints,
- selected stroke color and width updates apply via toolbar,
- undo/redo works across draw/erase/style/transform operations,
- opening drawing resets undo/redo history session baseline.
- drawing viewport remains fixed-aspect and does not stretch when sidebar/layout width changes.
- drawing viewport uses fixed `3:4` aspect and does not stretch when sidebar/layout width changes.
- with aspect lock on, circle tool produces true circles (not ovals).
- Card preview checks:
- image and drawing previews are visible in grid cards,
- all grid cards open via double-click,
- image/drawing previews do not trigger native browser image drag-copy behavior while dragging cards,
- image and drawing cards display title text,
- drawing and image previews scale without stretch/crop; card height expands to fit preview aspect.
- drawing preview stroke widths/colors match live stroke data without requiring entering edit mode.
- Delete moves note subtree to recycle bin.
- Recycle Bin includes deleted descendants even when parent is deleted.
- Recycle Bin right-panel preserves deleted parent/child hierarchy.
- Restore restores note subtree.
- Restore action in current UI restores deleted card subtree to root.
- Store restore API supports target parent even though UI currently restores to root only.
- Restoring a deleted parent undeletes all nested descendants recursively.
- Permanent delete removes note permanently.
- Empty Recycle Bin permanently deletes all deleted items.
- Export downloads valid JSON with version and timestamps.
- Import merge adds without wiping existing notes.
- Import override replaces notes.
- Invalid import file shows error feedback and does not import.
- Import path is parse-validated; structurally weak but parseable payloads are minimally validated in current implementation.
- App reload preserves data from IndexedDB.
- Dark mode persists after refresh.
- Sidebar open/closed state persists after refresh.
- Sidebar scope and tree selection persist after refresh when the referenced cards still exist.
- Sidebar search query persists after refresh.
- Expanded tree state persists after refresh.
- Initial theme follows system preference when no saved theme exists.
- Recycle Bin shows deleted-item count badge when non-zero.
- Recycle Bin mode is read-only for block editing and hides new-note creation.
- App version is visible in sidebar footer.
- App version display format in UI is `vMAJOR.MINOR`.
- Normal refresh renders app without white-screen failure when service worker is active.
- Local dev origins unregister existing app service workers and clear Cache Storage before boot so localhost does not reuse the production offline shell.
- Sidebar Refresh button reloads without clearing SW/cache state.
- Previously cached PWA startup succeeds with no internet connection.
- Card `...` menu actions are correct by context:
- tree normal cards expose rename/move/change-type/reorder/delete (+expand/collapse when applicable),
- grid normal cards expose open/move/change-type/reorder/delete,
- recycle-bin cards/rows expose restore and delete-forever via `...` menu.
- Recycle Bin row restore/delete actions are menu-based, not always-visible buttons.
- PWA install prompt/behavior and service worker registration still function.
