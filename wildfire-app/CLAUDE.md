# Project: WildfireWatch

A hackathon app combining an anonymous wildfire-reporting map with a retro
2D wildfire-fighting game.

## Stack
- React + Vite + Tailwind v4 (via `@tailwindcss/vite`)
- react-router-dom for routing (`/`, `/report`, `/game`)
- Phaser 3 for the game, mounted into a React wrapper component
- Leaflet + react-leaflet for the reporting map
- Supabase (Postgres + instant REST) for anonymous report storage
- Deployed on Vercel

## Structure
- `src/pages` — Home.jsx, ReportMap.jsx, GamePage.jsx (one per route)
- `src/components` — shared UI (Nav.jsx)
- `src/game` — all Phaser code, isolated from React
  - `config.js` — Phaser game config + grid constants
  - `state.js` — shared mutable game state (coins, wave, upgrades)
  - `scenes/` — Boot, Menu, Main (gameplay), Shop (upgrades)
- `src/lib/supabase.js` — Supabase client + report read/write helpers
- `supabase/schema.sql` — run this in the Supabase SQL editor before first use

## Conventions
- Functional React components, hooks only, no class components outside Phaser scenes
- Tailwind utility classes only — no separate CSS files beyond `index.css`
- Phaser scenes read/write game state via `this.game.registry.get('state')`,
  set once in `Boot.js`. Don't create parallel state stores.
- Placeholder art is generated procedurally in `Boot.js` via
  `this.make.graphics(...).generateTexture(...)` — no external image assets
  required to run. Swap in real spritesheets by loading them in
  `Boot.preload()` and updating the texture keys used in `Main.js`.
- Report coordinates are rounded to ~3 decimal places (~100m) before
  insert, for anonymity — see `roundForAnonymity` in `src/lib/supabase.js`.

## Environment
Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` from your Supabase project's Settings → API page.
Add the same two variables in Vercel's project settings for deploys.

## Current priority
[Update this line as you work through the hackathon — e.g. "wiring real
Supabase reports into Main.js fire seeding" — so Claude Code picks up
context fast in later sessions.]
