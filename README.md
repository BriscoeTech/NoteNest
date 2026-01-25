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
    This will create a `dist` folder containing `index.html` and assets.

2.  **Configure Base Path (Important)**:
    If you are deploying to a project page (e.g., `username.github.io/repo-name/`), ensure `vite.config.ts` has the correct `base` path set to `./` or `/repo-name/`.
    *The current configuration is set to relative `./` which should work for most subpaths.*

3.  **Deploy**:
    You can deploy manually or use a GitHub Action.

    **Manual Deployment:**
    *   Push the contents of the `dist` folder to a `gh-pages` branch on your repository.
    *   Go to GitHub Repo > Settings > Pages.
    *   Select `gh-pages` branch as the source.

    **GitHub Actions (Recommended):**
    *   Create a `.github/workflows/deploy.yml` file in your repository:
    ```yaml
    name: Deploy to GitHub Pages

    on:
      push:
        branches: [ main ]

    permissions:
      contents: read
      pages: write
      id-token: write

    jobs:
      build:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
          - uses: actions/setup-node@v4
            with:
              node-version: 20
          - run: npm ci
          - run: npm run build
          - uses: actions/upload-pages-artifact@v3
            with:
              path: ./dist

      deploy:
        environment:
          name: github-pages
          url: ${{ steps.deployment.outputs.page_url }}
        runs-on: ubuntu-latest
        needs: build
        steps:
          - name: Deploy to GitHub Pages
            id: deployment
            uses: actions/deploy-pages@v4
    ```

4.  **Verify**:
    Visit your GitHub Pages URL. The app should load and persist data even after refresh.

## Development

To run locally:

```bash
npm install
npm run dev
```
