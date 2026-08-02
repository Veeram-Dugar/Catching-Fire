# Catching Fire 🔥

Catching Fire is a two-part wildfire awareness app built for a hackathon: an
anonymous community reporting map — enriched with live official fire-weather
alerts — paired with a retro 2D top-down roguelite where you race to put out
spreading fires, earn coins, and draft upgrades between waves.

**🔗 Live demo:** https://wildfire-app-veeram-dugars-projects.vercel.app

> ⚠️ This is a community awareness tool, not an emergency service. For an
> active, immediate wildfire threat, call 911 or your local emergency number.

## Features

- **Report a Fire** (`/report`) — tap a live map to anonymously drop a pin
  with a severity level (smoke, small flame, large fire). New reports from
  anyone appear on everyone's map live via Supabase Realtime, sorted by
  distance from you. Coordinates are rounded to ~100m before storage so
  reports can't be traced to an exact address. You can delete a report you
  submitted from your own browser (click its pin); nobody else can delete
  it, since doing so requires a one-time secret token only your browser
  ever receives, enforced by a database function rather than a
  client-trusted check — see "Deleting your own reports" below. Anyone can
  click "Still burning" on any pin to corroborate it without needing to
  own it, refreshing how long it stays visible; reports otherwise
  auto-expire on a severity-based timer (smoke 4h, small flame 10h, large
  fire 24h). The page also pulls live, official fire-weather alerts (Red
  Flag Warning, Fire Weather Watch, etc.) and current wind speed/direction
  from the National Weather Service for your area, so community reports
  sit alongside real government data.
- **Play the Game** (`/game`) — fire spawns, escalates through three tiers
  (small → large → inferno, the last only after wave 12 and taking three
  hits to fully extinguish), and spreads across the grid on a timer that
  ramps up exponentially after an easy opening stretch (tune this via the
  easy/normal/hard difficulty select on the menu). Move with arrow
  keys/WASD or the on-screen touch controls, spray with spacebar or the
  touch spray button, chain kills for a coin combo multiplier, and watch
  for rare golden coins — all with procedurally synthesized sound effects
  (no audio files, same "everything is code" philosophy as the art).
  Clear a wave to draft one free upgrade from a random set of three; every
  5th wave clear opens a full paid Supply Drop shop instead, where
  saved-up coins buy any of the 9 available upgrades outright. Best wave
  reached persists across runs via `localStorage`.

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
   `reports` table, row-level security, the `insert_report`/`delete_report`/
   `confirm_report` functions, and enables Realtime for the table). If a
   function you just created comes back as "not found in the schema cache"
   even though the SQL ran with no errors, run `notify pgrst, 'reload
   schema';` — PostgREST (Supabase's API layer) doesn't always pick up new
   functions immediately.
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

### Deleting your own reports

Reports have no accounts, so "ownership" can't be a login check — it's a
one-time secret (`delete_token`) generated when you submit a report and
handed back to your browser only, then remembered in `localStorage`.
Deleting requires presenting that exact token.

This is enforced at the database level, not just hidden in the UI:

- Direct `INSERT`/`DELETE`/broad `SELECT` on the `reports` table is
  revoked from the anonymous role entirely
- All access instead goes through two `SECURITY DEFINER` Postgres
  functions (`insert_report`, `delete_report` — see `supabase/schema.sql`)
  that control exactly what's possible and what's returned
- `delete_token` is excluded from the public read grant (column-level,
  not row-level), so it can't be harvested off the map the way a report's
  `id` can be — deleting requires knowing the token, and the token is
  never exposed anywhere except to whoever just submitted that report

Verified directly against a live Supabase project: direct table
insert/delete both return `permission denied`, requesting `delete_token`
via any `select` returns `permission denied`, deleting with the wrong
token is a silent no-op (returns `false`), and deleting with the correct
token actually removes the row.

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
- Reports appear live for every visitor via Supabase Realtime (verified
  the broadcast payload correctly excludes `delete_token` — the same
  column-level restriction that protects REST reads also applies to
  Realtime, not just one or the other)
- Self-service deletion of your own reports via a secret token enforced
  by database functions (not a client-side check) — see "Deleting your
  own reports" above; nobody can delete anyone else's report
- "Still burning" corroboration on any report, from anyone, without
  needing to own it — a deliberately weaker check than delete, since
  confirming isn't destructive (see `confirm_report` in `schema.sql`)
- Reports sorted by distance from you, and reports at the same rounded
  location merge into one marker showing the highest severity and how
  many times it's been reported — see `fetchActiveReports()` in
  `src/lib/supabase.js`
- Live NWS fire-weather alerts and current wind speed/direction (free,
  keyless, no backend proxy needed — see `src/lib/nws.js`) shown
  alongside community reports on the map
- Full roguelite game loop: three-tier fire escalation, spread/spray/coin
  mechanics, water resource management, a free upgrade draft every wave
  plus a paid full shop every 5th wave, 9 total upgrades, and persistent
  best-wave tracking — see `src/game/state.js` and `src/game/scenes/`
- Easy/normal/hard difficulty select, on-screen touch controls (d-pad +
  spray button, works alongside keyboard), and procedurally synthesized
  sound effects (no audio asset files) — see `src/game/audio.js`

**Stretch goals (not yet implemented):**
- Seeding in-game fires from real, live Supabase reports instead of random
  placement — there's a hook point left for this in `src/game/scenes/Main.js`
  (`buildGrid()`), but it isn't wired up yet
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
