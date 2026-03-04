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
| Notes model | Typed new-note templates (Note, Checkbox, Link, Image, Drawing) 
| Content | Card blocks: text, bullets, image, checkbox, link, drawing 
| Content | Add/remove/toggle special blocks (checkbox/link/image/drawing) 
| Content | Reorder blocks with drag and with move up/down 
| Content | One image block per card in current UI flows (replace existing image on add) 
| Content | Drawing tools: select, pen, line, rectangle, circle, erase-segment 
| Content | Drawing selection supports direct line-hit + marquee + move + resize 
| Content | Drawing selection supports additive selection with Ctrl/Shift click and Ctrl/Shift marquee 
| Content | Drawing selection resize supports aspect-ratio lock toggle 
| Content | Selected drawing objects support color and width edits 
| Content | Drawing editor uses a fixed-aspect square viewport to avoid sidebar/stretch distortion 
| Content | Default drawing brush size is 2 
| Content | Drawing undo/redo snapshot history; reset on drawing open 
| Content | Quick checkbox toggle directly in tree/grid when checkbox block exists 
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
| Data safety | Import JSON backup with merge/override modes 
| Data safety | Invalid import file shows error feedback and does not apply changes 
| Data safety | Import is parse-validated; payload shape validation is minimal 
| Persistence | IndexedDB persistence via `idb-keyval` 
| Persistence | Legacy migration fallback from localStorage format 
| UX | Sidebar collapse/expand 
| UX | Dark mode toggle with local preference storage 
| UX | Initial theme fallback to system `prefers-color-scheme` when no saved preference exists 
| UX | Sidebar footer app version display (`APP_VERSION`) 
| UX | Recycle Bin displays deleted-card count badge 
| UX | Recycle Bin view is read-only for content editing and note creation 
| UX | Card actions are context-driven through `...` menus (normal vs recycle-bin) 
| UX | Grid cards show image/drawing previews and open note on preview click 
| UX | Grid drawing previews render from current stroke data to avoid stale style/width display 
| UX | Image and drawing cards render title text in grid 
| UX | Tree leaf icons are specialized for image and drawing notes 
| PWA | Manifest + service worker + installable static app 
| Deploy | Static GitHub Pages build to `docs/` 

## 3. User Flows

### 3.1 Create and edit note
1. User creates a new note at root or under current scope.
2. User may create from templates: plain note, checkbox note, link note, image note, or drawing note.
3. New card is inserted under target parent with generated ID and timestamps.
4. Template note creation can initialize first block based on selected template.
5. Drawing template creation immediately opens the created note for editing.
6. User edits card title and blocks.
7. Changes are persisted to IndexedDB after state updates.

### 3.2 Navigate hierarchy
1. User selects Home, a tree card, or a grid card.
2. App updates current scope (`currentCardId`) and tree selection state.
3. Workspace shows current card content plus children grid.

### 3.3 Move and reorder
1. User drags card in tree or uses "Move to..." picker.
2. Store validates move (`canMoveCard`) to avoid self/descendant loops.
3. Store updates parent linkage and timestamps.
4. User can reorder within siblings (up/down or drag reindex).
5. Reordering updates visible sibling order while preserving deleted siblings in current store logic.

### 3.4 Delete and recover
1. Delete marks target card and descendants `isDeleted = true`.
2. Deleted cards appear in Recycle Bin view.
3. Current UI restore action restores deleted cards to root.
4. Permanent delete removes card subtree from state.
5. Store supports restore to an arbitrary target parent, but current UI only exposes restore-to-root.
6. Restore is recursive: restoring a deleted parent restores all descendants in that subtree.

### 3.5 Import and export
1. Export serializes full tree with version metadata.
2. Import accepts JSON and prompts for mode:
- `merge`: append imported root cards to existing cards.
- `override`: replace current cards with imported cards.
3. Legacy import format with `categories` is migrated to card tree.

### 3.6 Quick task toggling
1. If a card contains a checkbox block, user can toggle it directly from tree rows.
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

Source of truth: `src/src/lib/types.ts`.

### 4.1 Core types
- `AppState`: `{ cards: Card[] }` where `cards` are root cards.
- `Card`:
- `id`, `title`, `blocks`, `parentId`, `children`, `sortOrder`, `createdAt`, `updatedAt`, `isDeleted`.
- `ContentBlock` union:
- `TextBlock`, `BulletBlock`, `ImageBlock`, `CheckboxBlock`, `LinkBlock`, `DrawingBlock`.
- Recycle bin sentinel ID: `RECYCLE_BIN_ID = "__recycle_bin__"`.

### 4.2 Invariants
- Card IDs are unique.
- `state.cards` contains only root nodes; descendants are nested in `children`.
- `parentId` of root cards is `null`.
- A card cannot be moved under itself or under any descendant.
- Soft delete marks whole subtree deleted.
- Restore restores whole subtree deleted flags.
- Restore rebuilds subtree parent links consistently under the chosen restore target.
- Sorting uses `sortOrder` (higher value renders earlier).
- Reordering operates on non-deleted sibling sets while preserving deleted siblings in the resulting list.
- Search results exclude deleted cards except in recycle bin workflows.
- Recycle bin search matching is title-only.
- Recycle Bin collection includes deleted descendants, not only top-level deleted roots.
- Recycle Bin right-panel presentation uses deleted roots with nested deleted descendants.
- Current image UX keeps at most one image block per card by replacing existing image block on add.
- Drawing editor opens with Select as default tool.
- Drawing session undo/redo history is reset when opening a drawing note.

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
- Persists migrated result back into IndexedDB.

### 5.4 Theme preference persistence
- Theme key: `notenest-theme`.
- Values: `dark` or `light`.
- Applied by toggling `document.documentElement.classList` with `dark`.
- If no saved preference exists, initial theme follows system `prefers-color-scheme`.

### 5.5 Versioning Contract
- App version source is `package.json` version injected at build time.
- Version must be controlled in one place only: `package.json` (`version` field).
- Do not hardcode version strings in source/HTML/config; derive from `package.json` during build.
- Required package version format: semver `MAJOR.MINOR.PATCH` (e.g., `2.19.0`).
- Display format in UI is normalized to `vMAJOR.MINOR` (e.g., `v2.9`).
- Version is shown in sidebar footer and included in export metadata.
- Cache-busting uses `__APP_VERSION__` in `src/index.html` for the manifest link and service worker registration so browser caches update when app version changes. The service worker derives its cache version from the `v` query string.

## 6. UI Architecture

### 6.1 Top-level composition
- `src/src/pages/NotesApp.tsx`:
- Bridges store to UI components.
- Owns current navigation scope, selection, search query, sidebar visibility, and dark mode state.

### 6.2 Sidebar tree
- `src/src/components/CategoryTree.tsx`:
- Displays Home, card tree, and Recycle Bin.
- Tree supports:
- expand/collapse + recursive expand/collapse,
- inline rename,
- move/reorder/delete,
- native drag-and-drop parent reassignment.
- card checkbox quick toggle when card includes checkbox block.
- Below the Recycle Bin row (inside the scrollable tree), a divider separates the "utility" section:
- utility section supports export/import and dark mode toggle.
- utility section displays current app version (`APP_VERSION`).
- Recycle Bin row shows a count badge for deleted cards when count > 0.

### 6.2.1 Tree Visual Semantics

- Tree row icon behavior is content/state-driven and part of the UI contract:
- If card has visible non-deleted children:
- show folder icon,
- show open folder when expanded, closed folder when collapsed.
- If card has no visible children and has a checkbox block:
- do not show file icon; checkbox acts as the leading visual marker.
- If card has no visible children and no checkbox block:
- if image block exists, show image icon,
- else if drawing block exists, show drawing icon,
- else show file icon.

### 6.3 Workspace panel
- `src/src/components/WorkspacePanel.tsx`:
- Header for current context and parent navigation.
- Current card editor for title and block list.
- Children displayed as card grid with create/move/reorder/delete actions.
- Uses `@dnd-kit` for block and child-card drag sorting.
- New-note dropdown provides typed creation templates (note/checkbox/link/image/drawing).
- Grid cards allow quick checkbox toggle and link open behavior.
- Grid cards render image/drawing previews and open note on preview click.
- Drawing editor in workspace supports tool-based drawing, stroke selection, transform, and style updates.

### 6.4 Dialogs
- `CategoryPickerDialog` for move target selection.
- Import mode dialog for merge/override choice.
- Move target picker excludes self and descendants for the selected moving card.
- Store validation (`canMoveCard`) remains the final safety guard for invalid targets.

### 6.5 Card Action Menu Contract (`...`)

- Tree card `...` menu (normal cards):
- `Rename`, `Move to...`, `Move Up`, `Move Down`, optional `Expand All`/`Collapse All` (when card has visible children), `Delete`.
- Workspace grid card `...` menu (normal cards):
- `Open`, `Move to...`, `Move Up`, `Move Down`, modifier toggles (`Add/Remove checkbox`, `Add/Remove link`, `Add/Remove image`, `Add/Remove drawing`), `Delete`.
- Recycle Bin right-panel tree row `...` menu:
- `Restore`, `Delete Forever`.
- Recycle Bin right-panel tree rows:
- actions are menu-based under `...` (not always-visible action buttons),
- menu provides `Restore` and `Delete Forever`.
- Menu visibility pattern:
- context actions are revealed via `...` trigger (typically hover-revealed on desktop), preserving compact card layout.

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
- Default brush size is `2`.
- Eraser removes whole stroke objects by rendered-line hit.
- Selection supports marquee and direct click-hit on rendered lines.
- `Ctrl`/`Shift` + click adds stroke/object to current selection.
- `Ctrl`/`Shift` + marquee adds intersecting strokes/objects to current selection.
- Selected strokes support move and corner-handle resize.
- Resize supports aspect-ratio lock toggle.
- Color swatches and width slider apply to selected strokes when selection exists.
- Marquee selects only when region touches/crosses rendered geometry, not bbox-only overlap.
- Drawing surface is rendered in a fixed square viewport so resizing surrounding layout does not distort drawing geometry.

## 7.2 Modifier Semantics (Current UI Contract)

- Although blocks are modeled as a list, current UX treats `checkbox`, `link`, `image`, and `drawing` as card-level toggles in normal flows.
- Modifier behavior in current UI:
- `checkbox`: toggle add/remove; quick toggle checked state is available from tree/grid when present.
- `link`: toggle add/remove; edited inline in card/grid contexts.
- `image`: toggle add/remove; adding image replaces existing image block on the same card.
- `drawing`: toggle add/remove; drawing notes open immediately when created from drawing template.
- Template note creation can initialize a card with one modifier/content block (`checkbox`, `link`, `image`, or `drawing`).
- Regression note:
- UI semantics above are contract-level behavior even though the data model can technically hold multiple blocks of the same type.

## 8. Import/Export Data Contract

### 8.1 Export payload
- Shape:
- `version`: app version (from `APP_VERSION`),
- `exportedAt`: ISO timestamp,
- `cards`: full root card array including nested children.

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
- navigation requests fetched with `no-store` to avoid stale shell,
- GET assets served cache-first with runtime cache fill.

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
- Can create typed notes from templates: Note, Checkbox, Link, Image, Drawing.
- Can rename notes from tree and workspace.
- Can move note to another parent and to root.
- Cannot move note into itself/descendants.
- Move picker excludes invalid self/descendant targets and store validation still rejects invalid targets as safety.
- Can reorder siblings (up/down) in tree and grid drag reorder in workspace.
- Reorder behavior preserves deleted siblings while reordering visible siblings.
- Can add/edit/remove each block type:
- text, bullets, image, checkbox, link, drawing.
- Card modifier semantics are preserved:
- checkbox is singleton toggle-style in normal UI flows.
- link is singleton toggle-style in normal UI flows.
- image is singleton toggle-style in normal UI flows.
- drawing is singleton toggle-style in normal UI flows.
- Checkbox can be toggled directly from tree and grid cards when present.
- Tree icon rules are preserved:
- folder open/closed for parents with visible children,
- checkbox-leading rows omit file icon,
- leaf cards without checkbox show icon by priority:
- image icon when image block exists,
- drawing icon when drawing block exists and no image block,
- otherwise file icon.
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
- ctrl/shift click adds objects to selection,
- ctrl/shift marquee adds objects to selection,
- selected strokes can move/resize,
- aspect toggle affects resize constraints,
- selected stroke color and width updates apply via toolbar,
- undo/redo works across draw/erase/style/transform operations,
- opening drawing resets undo/redo history session baseline.
- drawing viewport remains fixed-aspect and does not stretch when sidebar/layout width changes.
- Card preview checks:
- image and drawing previews are visible in grid cards,
- clicking image/drawing preview opens the note,
- image and drawing cards display title text,
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
- Initial theme follows system preference when no saved theme exists.
- Recycle Bin shows deleted-item count badge when non-zero.
- Recycle Bin mode is read-only for block editing and hides new-note creation.
- App version is visible in sidebar footer.
- App version display format in UI is `vMAJOR.MINOR`.
- Card `...` menu actions are correct by context:
- tree normal cards expose rename/move/reorder/delete (+expand/collapse when applicable),
- grid normal cards expose open/move/reorder/modifier toggles/delete,
- recycle-bin cards/rows expose restore and delete-forever via `...` menu.
- Recycle Bin row restore/delete actions are menu-based, not always-visible buttons.
- PWA install prompt/behavior and service worker registration still function.
