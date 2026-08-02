# Catching Fire 🔥

Catching Fire is a two-part wildfire awareness app built for a 9-hour
hackathon: an anonymous community reporting map for spotting real smoke and
flames, paired with a retro 2D top-down game where you race to put out
spreading fires, earn coins, and upgrade your gear between waves.

- **Report a Fire** — tap a live map to anonymously drop a pin with a
  severity level (smoke, small flame, large fire). Coordinates are rounded
  to ~100m before storage so reports can't be traced to an exact address.
- **Play the Game** — a Phaser-powered grid where fire spawns, escalates,
  and spreads to neighboring tiles on a timer. Move with arrow keys/WASD,
  spray with spacebar to knock down fires and collect coins, then spend
  them in the shop on hose range, water capacity, and move speed upgrades
  before the next wave.

> ⚠️ This is a community awareness tool, not an emergency service. For an
> active, immediate wildfire threat, call 911 or your local emergency number.

## Tech stack

| Layer | Choice |
|---|---|
| UI | React 19 + React Router (`/`, `/report`, `/game`) |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite`) |
| Build tool | Vite |
| Game engine | Phaser 3, mounted into a React wrapper component |
| Map | Leaflet + react-leaflet |
| Backend | Supabase (Postgres + REST) for anonymous report storage |
| Hosting | Vercel |

## Running it locally

```bash
npm install
cp .env.example .env   # then fill in your Supabase project URL + anon key
npm run dev
```

The app will be available at `http://localhost:5173`.

Before using the reporting map, create the `reports` table in your Supabase
project by running `supabase/schema.sql` in the SQL editor. You'll need a
free [Supabase](https://supabase.com) project — grab the URL and anon key
from Settings → API and put them in `.env`:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

The game itself (`/game`) works fully offline with no Supabase connection —
only the reporting map (`/report`) and the homepage's live report count need it.

Other scripts: `npm run build` (production build), `npm run preview`
(preview the build), `npm run lint` (oxlint).

## Project structure

```
src/
  pages/         Home, ReportMap, GamePage — one per route
  components/    Nav
  game/          all Phaser code (config, shared state, scenes)
  lib/           Supabase client + helpers
supabase/
  schema.sql     run this once in your Supabase project
```

See `CLAUDE.md` for conventions if you're building this out further with
Claude Code.

## What's built vs. stretch goals

**Built:**
- Anonymous fire reporting: click-to-place pin, severity selector, geolocation
  centering, live markers pulled from Supabase, and privacy-rounded coordinates
- Row-level-security policies allowing anonymous insert/read on `reports`
- Full game loop: fire spawning + spreading + escalation, spray/extinguish,
  coin collection, water resource with regen and refill tiles, win/lose states,
  and wave progression with a shop between waves
- Three shop upgrades (hose range, water capacity, move speed) with sub-linear
  level scaling so a maxed-out loadout stays strong without trivializing later
  waves — see `src/game/state.js`

**Stretch goals (not yet implemented):**
- Seeding in-game fires from real, live Supabase reports instead of random
  placement — there's a hook point left for this in `src/game/scenes/Main.js`
  (`buildGrid()`), but it isn't wired up yet
- Real-time report updates on the map (currently reloads only after your own
  submission, no live subscription to other users' reports)
- Any report moderation, rate limiting, or spam prevention
- Automated tests
- Screenshots in this README

## Deploying

Connect this repo to Vercel, then add `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` as environment variables in the Vercel project
settings. Every push to `main` deploys automatically.

## Screenshots

_Add screenshots here before submitting._
