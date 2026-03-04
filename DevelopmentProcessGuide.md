# NoteNest Development Process Guide

This file contains operational runbooks and command workflows.
Architecture requirements belong in `Architecture.md`.

## 0. Documentation File Conventions

- Markdown guide files must be stored in the project root directory.
- Markdown guide filenames must use PascalCase (for example: `Architecture.md`, `SessionChangeLog.md`, `DevelopmentProcessGuide.md`).

## 0.1 Markdown Guide Purposes

- `Architecture.md`
- What goes here: product requirements, feature contracts, data contracts/invariants, non-functional requirements, and architecture rationale/tradeoffs.
- Why: this is the canonical specification used to understand or rebuild the system correctly.

- `DevelopmentProcessGuide.md`
- What goes here: operational runbooks (version bumping, build/release commands, local dev server workflows), and documentation conventions.
- Why: keeps execution procedures in one place so work is consistent and repeatable.

- `SessionChangeLog.md`
- What goes here: chronological session-level change history (what changed, when, and brief implementation notes).
- Why: preserves historical context without polluting the architecture specification.

- `README.md`
- What goes here: project overview, core capabilities, and quick-start usage/build/deploy basics for contributors and users.
- Why: provides the first entry point for understanding and running the project.

## 1. Versioning Workflow

### Policy
- Use semver in `package.json` as `MAJOR.MINOR.PATCH`.
- For this project, user-facing behavior changes use a MINOR bump.
- Keep PATCH at `0` by convention for normal releases.
- Never manually edit lockfile version fields.

### Convention and Rationale
- `package.json` is the single source of truth for app version.
- Build-time injection (`__APP_VERSION__`) propagates version into UI display, export metadata, and cache-busting query params for manifest/service-worker URLs.
- Minor-only release flow keeps versioning predictable for a local-first app where each user-visible change should produce a clearly distinct release.
- Avoiding manual lockfile edits prevents version drift between `package.json` and `package-lock.json`.

### Commands
- Minor bump:
```bash
npm run version:minor
```
- Minor bump + production rebuild:
```bash
npm run release:minor
```

### Windows PowerShell Note
- If `npm` script execution is blocked by policy, use:
```powershell
npm.cmd run version:minor
npm.cmd run build
```

## 2. Build and Release Artifacts

- Production build command:
```bash
npm run build
```
- Build script: `script/build.ts`
- Output location: `docs/`
- `docs/` is a required tracked deploy artifact for GitHub Pages.

## 3. Local Dev Server Workflow

### Required Scripts
- Always use vetted scripts for start/stop to reduce environment and process-management errors.
- Available scripts:
- `script/dev-server-start.sh`
- `script/dev-server-stop.sh`
- `script/dev-server-start.bat`
- `script/dev-server-stop.bat`

### Windows Usage
- Start:
```powershell
script\dev-server-start.bat
```
- Stop:
```powershell
script\dev-server-stop.bat
```

### Unix-like Usage
- Start:
```bash
./script/dev-server-start.sh
```
- Stop:
```bash
./script/dev-server-stop.sh
```

## 4. Recommended Pre-Commit Checks

- Type check:
```bash
npm run check
```
- Rebuild docs when releasing:
```bash
npm run build
```

## 5. Release Verification Checklist

- Version was bumped using npm version scripts (prefer `npm run version:minor` / `npm run release:minor`).
- `package.json` and `package-lock.json` version fields are synchronized after bump.
- Type check passes:
```bash
npm run check
```
- Production build succeeds and generates deployable `docs/` artifacts:
```bash
npm run build
```
