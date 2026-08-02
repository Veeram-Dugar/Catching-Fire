# WildfireWatch 🔥

A community wildfire-reporting map paired with a retro 2D wildfire-fighting
game — built for a 9-hour hackathon.

- **Report a Fire** — anonymously drop a pin on a live map if you spot smoke
  or flames nearby. Locations are rounded before storage for privacy.
- **Play the Game** — a Phaser-powered top-down game where fire spreads
  across a grid, you spray it out before it takes over, collect coins from
  extinguished tiles, and spend them on upgrades between waves.

> ⚠️ This is a community awareness tool, not an emergency service. For an
> active, immediate wildfire threat, call 911 or your local emergency number.

## Stack

React · Vite · Tailwind CSS v4 · Phaser 3 · Leaflet · Supabase · Vercel

## Getting started

```bash
npm install
cp .env.example .env   # then fill in your Supabase project URL + anon key
npm run dev
```

Before running the reporting map, create the `reports` table in your
Supabase project by running `supabase/schema.sql` in the SQL editor.

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

## Deploying

Connect this repo to Vercel, then add `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` as environment variables in the Vercel project
settings. Every push to `main` deploys automatically.

## Screenshots

_Add screenshots here before submitting._
