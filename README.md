# NoteNest

A local-first hierarchical notes application built with React, Vite, and IndexedDB.

## Features

*   **Hierarchical Workspace**: Organize notes in a nested card tree with root and child notes.
*   **Typed Notes**: Create and switch between note, checkbox, link, image, drawing, and folder note types.
*   **Offline First**: Notes are stored locally and the installed PWA is designed to keep working offline after a successful load.
*   **Import/Export**: Backup your notes to JSON and restore them with merge or override flows.
*   **PWA**: Installable on mobile and desktop.
*   **Drag & Drop**: Reorder notes in the tree and workspace, and reorder content blocks inside notes.

## Deployment to GitHub Pages

This application is designed to be fully static and hostable on GitHub Pages.

### Step-by-Step Instructions

1.  **Build the Project**:
    Run the build command to generate the static files.
    ```bash
    npm run build
    ```
    This will create a `docs` folder at the repo root containing `index.html` and assets.

2.  **Push to GitHub**:
    Commit and push the `docs` folder to your repository.

3.  **Configure GitHub Pages**:
    *   Go to your GitHub Repository > Settings > Pages.
    *   Under "Build and deployment", select **Source** as "Deploy from a branch".
    *   Under "Branch", select your main branch (e.g., `main` or `master`) and select the `/docs` folder.
    *   Click **Save**.

4.  **Verify**:
    Visit your GitHub Pages URL (e.g., `username.github.io/repo-name/`). The app should load and persist data.

## Development

To run locally:

```bash
npm install
npm run dev
```
