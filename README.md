# Query Visualizer

Visualize and explore SQL queries and ORM models in an interactive graph, built with React, TypeScript, and Vite.

## Prerequisites
- Node.js 20.19+ (recommended) and npm 10+
  - Note: Vite 7 may warn on older Node 20.x versions. Upgrade to Node 20.19+ to avoid `EBADENGINE` warnings.

## Setup
```bash
# Install dependencies (clean, reproducible)
npm ci
```

## Run (Development)
```bash
# Start the dev server on http://localhost:5173
npm run dev
```
- Change port: `npm run dev -- --port 3000`
- Expose on LAN: `npm run dev -- --host`

## Build
```bash
# Type-check and build production assets
npm run build
```

## Preview (Locally serve the production build)
```bash
npm run preview
# default: http://localhost:4173
```

## Lint
```bash
npm run lint
```

## Troubleshooting
- EBADENGINE warning from Vite: ensure Node >= 20.19.
- Port already in use: run with a different port, e.g. `npm run dev -- --port 3000`.
- LAN access not working: include `--host` when starting the dev server.
