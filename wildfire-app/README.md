# Catching Fire 🔥

Catching Fire is a two-part wildfire awareness app built for a hackathon: an
anonymous community reporting map — enriched with live official fire-weather
alerts — paired with a retro 2D top-down roguelite where you race to put out
spreading fires, earn coins, and draft upgrades between waves.

**🔗 Live demo:** https://wildfire-app-git-feature-shop-polish-veeram-dugars-projects.vercel.app

> ⚠️ This is a community awareness tool, not an emergency service. For an
> active, immediate wildfire threat, call 911 or your local emergency number.

## Features

- **Report a Fire** (`/report`) — tap a live map to anonymously drop a pin
  with a severity level (smoke, small flame, large fire). Coordinates are
  rounded to ~100m before storage so reports can't be traced to an exact
  address. Reports have no owner and no delete/edit capability — nothing
  for a bad actor to abuse — so they auto-expire on a severity-based timer
  instead (smoke 4h, small flame 10h, large fire 24h); a spot that keeps
  getting reported just stays visible longer. The page also pulls live,
  official fire-weather alerts (Red Flag Warning, Fire Weather Watch, etc.)
  from the National Weather Service for your area, so community reports
  sit alongside real government data.
- **Play the Game** (`/game`) — fire spawns, escalates through three tiers
  (small → large → inferno, the last only after wave 12 and taking three
  hits to fully extinguish), and spreads across the grid on a timer that
  ramps up exponentially after wave 5. Move with arrow keys/WASD, spray
  with spacebar, chain kills for a coin combo multiplier, and watch for
  rare golden coins. Clear a wave to draft one free upgrade from a
  random set of three; every 5th wave clear opens a full paid Supply Drop
  shop instead, where saved-up coins buy any of the 9 available upgrades
  outright. Best wave reached persists across runs via `localStorage`.

## Tech stack

| Layer | Choice |
|---|---|
| UI | React 19 + React Router (`/`, `/report`, `/game`) |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite`) |
| Build tool | Vite |
| Game engine | Phaser 3, mounted into a React wrapper component |
| Map | Leaflet + react-leaflet |
| Backend | Supabase (Postgres + REST) for anonymous report storage |
| Live data | National Weather Service API (api.weather.gov) for fire-weather alerts |
| Hosting | Vercel |

## Quick start

> **Note:** the app lives in this repo's `wildfire-app/` subdirectory, not
> the repo root — the `cd wildfire-app` step below is required, not optional.

```bash
git clone https://github.com/Veeram-Dugar/Catching-Fire.git
cd Catching-Fire/wildfire-app
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173` — the game (`/game`) works immediately, no
setup needed. To make the reporting map (`/report`) work too, keep reading.

### Setting up Supabase (only needed for `/report`)

1. Create a free project at [supabase.com](https://supabase.com)
2. In the SQL Editor, run `supabase/schema.sql` from this repo (creates the
   `reports` table with row-level security)
3. In your Supabase project's **Settings → API**, copy the **Project URL**
   and the **anon / publishable key**
4. Paste them into `.env`:
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
5. Restart `npm run dev` (Vite only reads `.env` at startup)

The homepage's live report count and the `/report` page will show a clear
"Supabase is not configured" message instead of crashing if you skip this —
everything else works fine without it.

Other scripts: `npm run build` (production build), `npm run preview`
(preview the build), `npm run lint` (oxlint).

## Project structure

```
wildfire-app/            <- the actual app lives here, not the repo root
  src/
    pages/                Home, ReportMap, GamePage — one per route
    components/            Nav
    game/                   all Phaser code (config, shared state, scenes)
    lib/                    Supabase client, NWS alerts client
  supabase/
    schema.sql              run this once in your Supabase project
```

See `CLAUDE.md` for conventions if you're building this out further with
Claude Code.

## What's built vs. stretch goals

**Built:**
- Anonymous fire reporting with click-to-place pins, severity selection,
  geolocation centering, and privacy-rounded coordinates
- Row-level-security policies allowing anonymous insert/read on `reports`
  (no update/delete policy exists at all — reports can't be tampered with)
- Reports auto-expire per severity, and reports at the same rounded
  location merge into one marker showing the highest severity and how
  many times it's been reported — see `fetchActiveReports()` in
  `src/lib/supabase.js`
- Live NWS fire-weather alerts (free, keyless, no backend proxy needed —
  see `src/lib/nws.js`) shown alongside community reports on the map
- Full roguelite game loop: three-tier fire escalation, spread/spray/coin
  mechanics, water resource management, a free upgrade draft every wave
  plus a paid full shop every 5th wave, 9 total upgrades, and persistent
  best-wave tracking — see `src/game/state.js` and `src/game/scenes/`

**Stretch goals (not yet implemented):**
- Seeding in-game fires from real, live Supabase reports instead of random
  placement — there's a hook point left for this in `src/game/scenes/Main.js`
  (`buildGrid()`), but it isn't wired up yet
- Real-time report updates on the map (currently reloads only after your own
  submission, no live subscription to other users' reports)
- Rate limiting or spam prevention on report submission (auto-expiry limits
  how long spam stays visible, but doesn't stop someone from submitting a
  burst of fake reports in the first place)
- Automated tests
- Screenshots in this README

## Deploying

Connect this repo to Vercel, then:

1. **Settings → General → Root Directory** — set to `wildfire-app`. This is
   easy to miss and the build will silently "succeed" while serving nothing
   (a 404 for every page) if it's left blank, since Vercel won't find
   `package.json` at the repo root.
2. **Settings → Environment Variables** — add `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` for both Production and Preview. Vite bakes
   these in at build time, so changing them requires a fresh deploy to
   take effect, not just a save.
3. If you want the deployment publicly viewable without a Vercel login,
   check **Settings → Deployment Protection** — it's enabled by default.

Every push to a connected branch deploys automatically.

## Screenshots

_Add screenshots here before submitting._
