# QuakePulse — Contributor Guide

> **Live earthquake & flood radar** built with Next.js (App Router), React, Leaflet, Tailwind.  
> This guide explains how to set up, develop, and contribute effectively.

---

## Table of Contents
- [Project Goals](#project-goals)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Directory Structure](#directory-structure)
- [App Architecture](#app-architecture)
- [Data Sources & API Usage](#data-sources--api-usage)
- [Caching, Rate Limiting & Resilience](#caching-rate-limiting--resilience)
- [UI Components Overview](#ui-components-overview)
- [Styling & UX](#styling--ux)
- [Coding Standards](#coding-standards)
- [Git Workflow & PR Process](#git-workflow--pr-process)
- [Issue Labels](#issue-labels)
- [Performance Notes](#performance-notes)
- [Accessibility](#accessibility)
- [Local Troubleshooting](#local-troubleshooting)
- [Release & Deployment](#release--deployment)
- [Roadmap Ideas](#roadmap-ideas)
- [License](#license)

---

## Project Goals
- **Realtime map** of recent earthquakes (USGS) with pulse markers and time-based playback.
- **Flood events** overlay (GDACS) with drawers, legends, and simple presets (World, Nigeria, UK/Europe, Pacific Ring).
- Smooth **tour mode**, **date range playback**, and **historical day pick**.

---

## Tech Stack
- **Framework:** Next.js (App Router)
- **Runtime:** React 18
- **Maps:** Leaflet + react-leaflet
- **Styling:** Tailwind CSS + PostCSS + Autoprefixer
- **Utilities:** classnames
- **Build/Start Scripts:** `npm run dev`, `npm run build`, `npm run start`

---

## Quick Start
1. **Requirements**
   - Node.js **20+** recommended
   - npm **10+**
2. **Install**
   ```bash
   npm install
   ```
3. **Run Dev Server**
   ```bash
   npm run dev
   ```
   Visit http://localhost:3000
4. **Build & Start**
   ```bash
   npm run build
   npm start
   ```

> **Environment variables:** None required for basic usage. The app fetches public APIs (USGS, GDACS).

---

## Directory Structure
```
.
├─ next.config.mjs
├─ tailwind.config.js
├─ postcss.config.js
├─ eslint.config.mjs
├─ package.json
├─ src/
│  ├─ app/
│  │  ├─ layout.jsx          # Global CSS, <html> shell
│  │  └─ page.jsx            # Main UI: map, controls, drawers, timeline/tour
│  ├─ components/
│  │  ├─ QuakeMap.jsx        # Leaflet map & markers, flyTo logic
│  │  ├─ Controls.jsx        # Presets, hazard toggles, date range, tour
│  │  ├─ FloodDrawer.jsx     # Floods list/details UI
│  │  ├─ Drawer.jsx          # Generic panel/drawer shell
│  │  ├─ Legend.jsx          # Map legend
│  │  ├─ FXOverlay.jsx       # Effects overlay hooks/portals
│  │  └─ RainPortal.jsx      # Rain animation portal
│  └─ lib/
│     ├─ net.js              # fetchJsonLimited + in-memory & localStorage cache
│     ├─ time.js             # formatting, KPI helpers, default windows
│     ├─ usgs.js             # USGS earthquake feeds & range queries
│     └─ floods.js           # GDACS flood list queries
└─ public/                   # Static assets
```

---

## App Architecture
- **App router entry**: `src/app/page.jsx` hosts the main interactive experience.
- **Map isolation**: `QuakeMap` is imported via `next/dynamic` with `ssr:false` to avoid Leaflet SSR issues.
- **State shape (conceptual)**:
  - `hazard`: `"quakes" | "floods"`
  - `mode`: live vs. history (date range)
  - `flyTo`: `{ center: [lat, lng], zoom }` for quick preset navigation
  - `startISO`, `endISO`: ISO strings for USGS range queries (history mode)
  - `historyDate`: specific day picker (for floods)
  - `now`: timestamp refresh anchor
  - `tour`: play/stop and step timing
- **Effects & portals**: visual effects like rain are rendered via **portals** to avoid map layering conflicts.

---

## Data Sources & API Usage
- **USGS Earthquakes**
  - Recent windows:
    - `hour`: `https://earthquake.usgs.gov/.../summary/all_hour.geojson`
    - `day` : `https://earthquake.usgs.gov/.../summary/all_day.geojson`
  - Range query (history): `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&orderby=time&starttime=...&endtime=...`
- **GDACS Floods**
  - Search: `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=FL&fromdate=YYYY-MM-DD&todate=YYYY-MM-DD&pagesize=...`

> All remote calls go through `lib/net.js` → `fetchJsonLimited` to add:
> - **Host-level min gap** between requests
> - **In-flight de-duplication**
> - **In-memory cache** and **localStorage TTL cache**
> - **Content-type aware body reading** & safe JSON parsing

---

## Caching, Rate Limiting & Resilience
- **Memory Cache**: short-lived cache per-URL to avoid refetch storms.
- **localStorage Cache**: persisted TTL for browser reloads (`cache:${url}` keys).
- **Host Throttling**: `minGapMs` per host to be polite to public APIs.
- **Retries**: limited retries on transient failures.
- **204 / non-JSON handling**: gracefully returns empty/typed responses.

When changing fetch behavior:
- Prefer **raising TTL** before adding complex queues.
- Keep **USGS** and **GDACS** within public rate expectations.
- Never block UI: show last cached data while fetching.

---

## UI Components Overview
- **QuakeMap**
  - Uses `CircleMarker` markers with severity coloring.
  - Smooth `map.flyTo` transitions for presets.
  - Keep **marker count reasonable** for performance (cluster in future).
- **Controls**
  - Hazard switch, preset buttons, date range inputs, history-day picker, tour controls.
  - `canTour` guards tour availability based on data state.
- **FloodDrawer**
  - Lists GDACS events with level coloring (`green`, `orange`, `red`).
- **Legend**
  - Explains colors/sizes and hazard types.
- **RainPortal / FXOverlay**
  - Encapsulate visual effects so the map remains interactive.

---

## Styling & UX
- **Tailwind** with a dark theme (`bg-neutral-950 text-neutral-100`).
- Keep **panels** simple (`.panel` classes) with soft shadows (`shadow-glow`).
- **Leaflet CSS**: loaded once, attribution hidden (ensure compliance when publishing).
- Use **motion sparingly**: flyTo duration ~1.4s, pulse animations for events.

---

## Coding Standards
- **Language**: JavaScript (ES Modules) with React 18.
- **Linting**: `eslint.config.mjs` extends `next/core-web-vitals`.
- **Formatting**: follow existing Tailwind/JS style; avoid inline comments in commits; keep code self-explanatory.
- **Imports**: Use `@/` alias for `src/` (via project config).
- **State**: Prefer React state/hooks. If app grows, consider a small state library (only when necessary).
- **Network**: Always fetch via `lib/net.js` helpers; do not `fetch` directly in components.

---

## Git Workflow & PR Process
### Branching
- `main`: always deployable.
- Feature branches: `feat/<short-scope>` (e.g., `feat/tour-loop`).
- Fix branches: `fix/<short-scope>` (e.g., `fix/marker-flicker`).

### Conventional Commits (recommended)
```
feat: add tour autoplay with step delay
fix: handle 204 responses in fetchJsonLimited
chore: bump tailwind content globs for src/*
refactor: extract draw panel into Drawer
docs: add contributor guide
perf: cache USGS range responses by URL+window
test: add net.js retry tests
ci: add build check on PR
```

### Pull Requests — Checklist
- ✅ Scope is **small** and focused.
- ✅ Includes **screenshots/gifs** for UI changes.
- ✅ No direct network calls in components; uses `lib/net.js`.
- ✅ No console noise; errors handled and surfaced to UI where helpful.
- ✅ Lints cleanly (`next lint` if configured) and builds locally.
- ✅ Descriptive title & body (what/why/how, tradeoffs).
- ✅ Mentions **rate-limit impact** if touching fetch cadence.

> **Merging**: Squash & merge, keep the PR title in **Conventional Commit** format.

---

## Issue Labels
- `type:bug`, `type:feature`, `type:perf`, `type:design`, `type:docs`
- `status:help-wanted`, `status:blocked`
- `priority:p0` (hotfix), `priority:p1`, `priority:p2`

---

## Performance Notes
- **Leaflet rendering**: large marker sets can stutter; consider:
  - Filtering by magnitude or time window.
  - Future: clustering or WebGL layers if needed.
- **Memoization**: memo heavy lists and computed ranges.
- **Network cadence**: respect `minGapMs` to avoid UI stalls & API bans.
- **Animations**: keep durations modest to avoid jank on low-end GPUs.

---

## Accessibility
- **Color contrast**: ensure green/orange/red markers and legends meet contrast targets on dark background.
- **Keyboard**: drawers, buttons, and controls should be reachable & focus-styled.
- **Motion**: keep reduced-motion users in mind (future enhancement: honor `prefers-reduced-motion`).

---

## Local Troubleshooting
- **Leaflet “window / document” SSR errors**: ensure map code stays client-side (`dynamic` with `ssr:false`).
- **CORS / Rate limits**: rely on cache to avoid hammering endpoints; back off on failures.
- **Everything is red / empty lists**:
  - Confirm `from/to` dates are valid and within data coverage.
  - Check network tab for 4xx/5xx; if 204/empty, UI should degrade gracefully.
- **Dev server stuck**:
  - Kill previous process on port 3000 or `npx kill-port 3000`.
  - Clear `.next/` and restart: `rm -rf .next && npm run dev`.

---

## Release & Deployment
- **Build**: `npm run build` → Next.js production build.
- **Start**: `npm start` → Node server (or serve via hosting provider).
- **Static assets**: under `public/`.
- **Env**: none required for public APIs; for production, set `NEXT_PUBLIC_*` only when adding optional keys/features.

> **CI (suggested)**:
> - Lint & build on PR.
> - Enforce Conventional Commit titles on PRs.
> - Preview deploy per-PR if hosting allows.

---

## Roadmap Ideas
- Earthquake **clustering** and **magnitude filters**.
- **Playback timeline scrubber** with keyframes.
- **Offline cache** & stale-while-revalidate UX.
- **prefers-reduced-motion** support.
- **Tests**: unit tests for `lib/net.js`, integration snapshot for map layers.

---

## License
MIT (unless specified otherwise). Include attribution where required by map tile providers and data sources (USGS/GDACS).
