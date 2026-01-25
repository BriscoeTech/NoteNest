# NoteCards App

A hierarchical notes application built with React, Vite, and IndexedDB.

## Features

*   **Hierarchical Structure**: Organize notes in a nested tree.
*   **Rich Content**: Support for text, checkboxes, links, and images in every note.
*   **Offline First**: Data is stored locally using IndexedDB, so it works without an internet connection.
*   **Import/Export**: Backup your notes to JSON and restore them anytime.
*   **PWA**: Installable on mobile and desktop.
*   **Drag & Drop**: Reorder blocks and notes easily.

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
