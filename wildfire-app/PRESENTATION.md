<div align="center">

# 🔥 Catching Fire

**A community wildfire-reporting map fused with official government data —**
**and a roguelite that makes checking it something you actually want to do.**

**Event:** MarinHacks · **Team:** Veeram · Cal · Josh

**Live demo:** https://wildfire-app-veeram-dugars-projects.vercel.app
**Source:** https://github.com/Veeram-Dugar/Catching-Fire

</div>

---

## The problem

*Presenter 1 — Product*

Wildfire tools are either official or engaging. Rarely both.

- **Official alerts lag reality.** A Red Flag Warning covers a whole forecast zone — not the specific hillside you can smell burning right now.
- **Community reporting apps get abandoned.** Nothing brings people back once the novelty of "report a hazard" wears off.
- **Safety tools compete with everything else on your phone.** If it's not something you'd open voluntarily, it won't be open when it matters.

---

## The idea

*Presenter 1 — Product*

Two products. One reason to keep coming back.

| | `/report` — Report a Fire | `/game` — Play the Game |
|---|---|---|
| | Anonymous, live, and fused with real National Weather Service alerts and wind data — community reports sit next to government data, not instead of it. | A retro roguelite where fire spreads, escalates, and has to be caught early — the same instincts the reporting map needs, taught by making them fun. |

> The game is the hook. The map is the point. Built on the same stack, in the same hackathon window, so the habit of opening the app transfers from one to the other.

---

## Demo: Report a Fire

*Presenter 1 — Product*

Built like a dispatch board, not a form.

- **Anonymous pin drop** — severity level (smoke / small flame / large fire), coordinates rounded to ~100m so a report can't be traced to an exact address.
- **Live for everyone** — new reports appear on every open map via Supabase Realtime, no refresh needed.
- **Sorted by distance from you** — the most relevant reports surface first.
- **Fused with official data** — live NWS Red Flag Warnings, Fire Weather Watches, and current wind direction, layered on the same map as community pins.
- **Expires on its own** — by severity (4h / 10h / 24h), or gets refreshed when anyone confirms it's "still burning."

---

## The hard part: trust without accounts

*Presenter 2 — Trust & Engineering*

**No accounts. No logins. So how do you let someone delete their own report?**

| ❌ The obvious answer | ✅ What we shipped |
|---|---|
| Add a delete button. Anyone can click it — which means anyone can click it on someone else's real fire report. The exact abuse this app exists to prevent. | Submitting a report returns a one-time secret `delete_token`, handed back only to your browser. It's checked inside a Postgres `SECURITY DEFINER` function — not a client-side check anyone could bypass. |

Verified end-to-end against the **live database**: direct table access returns `permission denied`; the wrong token is a silent no-op; the right token works.

The same "no ownership required" idea powers **"Still burning"** — anyone can corroborate a report, but only the reporter can remove it.

---

## Demo: Play the Game

*Presenter 3 — Game & Future*

A roguelite that teaches wildfire instincts without feeling like homework.

- **Fire escalates through 3 tiers** — small → large → inferno, each stage taking one more spray to fully put out.
- **A free upgrade every wave, a full shop every 5th** — 9 upgrades total, drafted or bought outright with coins earned in-run.
- **Combo streaks and rare golden coins** — reward fast, decisive play over button-mashing.
- **Easy / normal / hard, and touch controls** — playable one-handed on a phone, not just at a keyboard.
- **Every sprite and every sound is generated in code** — zero image or audio asset files.

---

## How it's built

*Presenter 2 — Trust & Engineering*

One stack, two products.

| Layer | Choice |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS v4 |
| Game | Phaser 3 — procedural art + audio, no asset files |
| Map | Leaflet + react-leaflet |
| Data | Supabase — Postgres, Row-Level Security, Realtime, `SECURITY DEFINER` functions |
| Live feeds | National Weather Service API — free, keyless, zero backend proxy |
| Hosting | Vercel — auto-deploy on push |

---

## By the numbers

*Presenter 2 — Trust & Engineering*

| | |
|---|---|
| **9** | upgrades in the game's roguelite draft |
| **3** | fire severity tiers, each harder to extinguish |
| **2** | free external data sources fused into one map |
| **0** | accounts required to report, confirm, or play |
| **4h / 10h / 24h** | auto-expiry window, by severity |
| **100%** | tested against the live database and live NWS API — not mocked |

---

## What's next

*Presenter 3 — Game & Future*

What we'd build with one more week.

- **Seed in-game fires from real, live reports** — close the loop between the two halves of the app instead of random placement.
- **Rate limiting on report submission** — auto-expiry limits how long spam stays visible, but doesn't stop a burst of it up front.
- **Automated test suite** — everything so far has been verified by hand against the live services; that doesn't scale forever.

---

<div align="center">

## Thank you

**Catching Fire** — a live map, a live game, one team, one weekend.

| Product | Trust & Engineering | Game & Future |
|---|---|---|
| Veeram | Cal | Josh |
| Problem framing, the report map | Security model, data architecture | The roguelite, what's next |

**Try it live:** https://wildfire-app-veeram-dugars-projects.vercel.app

</div>
