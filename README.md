# PIKE Rush — Sigma Chapter, Vanderbilt

A desktop rush-management app for **Pi Kappa Alpha (ΠΚΑ), Sigma Chapter at Vanderbilt University**.
Track rush events, collect & manage PNMs, run real-time bid-night voting on the big screen, and
blast iMessages from a Mac — all from one installable desktop app.

Built from the RushManager technical design doc, but re-architected to run **fully locally** (no
Cloudflare account required): the Cloudflare Workers/D1/R2 stack is replaced by an **embedded
Express + SQLite server** inside the Electron app, with photos stored on the local filesystem.

## Features

| Area | What it does |
|------|--------------|
| **Dashboard** | Live stats, PNM growth, attendance & status charts |
| **Rush Calendar** | Month/week calendar of all rush events, color-coded by type |
| **Sign-In** | Open a QR sign-in for any event — PNMs sign in from their phones over Wi-Fi |
| **PNM Dashboard** | Photo-card grid + table, search/filter/sort, full profiles, notes, ratings |
| **Import** | CSV / Google Sheets import with dedup preview |
| **Bid Room** | Big-screen voting with live tallies; brothers vote from their phones |
| **Mass Texting** | Queue iMessage blasts; a local Mac bridge sends them via Messages.app |
| **Auto-update** | A **Check for Updates** button downloads & installs new releases |

## Architecture

```
Electron (desktop app)
├── Main process
│   ├── Embedded Express API   (src/main/server)  ← replaces Cloudflare Workers
│   ├── SQLite via better-sqlite3 (userData/pike-rush.db)  ← replaces D1
│   ├── Local photo storage   (userData/pnm-photos)  ← replaces R2
│   └── electron-updater       (GitHub Releases feed)
└── Renderer (React 18 + Vite + Tailwind + React Query + Zustand)
```

The embedded server binds to the LAN so PNM phones can reach the public sign-in page via QR code.

## Develop

```bash
npm install        # also rebuilds better-sqlite3 for Electron
npm run dev         # launch the app with hot reload
npm run typecheck   # TS project references for main + renderer
npm test            # vitest
```

### Default accounts (seeded on first run)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@pikesigma.vanderbilt.edu` | `pike1868` |
| Rush Chair | `rush@pikesigma.vanderbilt.edu` | `rush2026` |

## Build installers

```bash
npm run build:mac     # .dmg   (run on macOS)
npm run build:win     # .exe   (NSIS installer, run on Windows)
npm run build:linux   # .AppImage
```

Cross-platform installers are produced by CI — see below.

## Releasing (.exe + .dmg)

Pushing a tag like `v1.0.0` triggers `.github/workflows/release.yml`, which builds on
macOS, Windows and Linux runners and publishes the `.dmg`, `.exe` and `.AppImage` to a
GitHub Release. The in-app **Check for Updates** button reads that same release feed.

```bash
git tag v1.0.0
git push origin v1.0.0
```

## Mac iMessage Bridge

The `bridge/` folder contains a small Node.js script a Rush Chair runs on their MacBook. It
polls the app for queued messages and sends them through Messages.app via AppleScript. See
`bridge/README.md`.

---

*Once a Pike, Always a Pike.* 🤙
