<div align="center">

# 🔥 Catching Fire

**A wildfire reporting map backed by real weather data —**
**paired with a game that gets people to actually check it.**

**Event:** MarinHacks · **Team:** Veeram · Cal · Josh

**Live demo:** https://wildfire-app-veeram-dugars-projects.vercel.app
**Source:** https://github.com/Veeram-Dugar/Catching-Fire

</div>

---

## The problem

*Veeram*

Wildfire tools are either official or actually used. Rarely both.

- **Official alerts are broad.** A Red Flag Warning covers a whole region — not your street.
- **Reporting apps get abandoned.** People stop opening them once the novelty wears off.
- **Nobody opens a safety app for fun.** So it's not open when it actually matters.

---

## Our goal

*Veeram*

Close the gap between spotting smoke and someone knowing about it.

- **Make it fast to report** — so people do it right away, not later.
- **Make checking it a habit** — before there's ever smoke to report.
- **Remove the doubt** — no one should hesitate because they're not sure it's worth reporting.

---

## The approach

*Veeram*

One map you check before an emergency, not just during one.

| `/report` — Report a Fire | `/game` — Play the Game |
|---|---|
| Anonymous pins, live for everyone, shown next to real government weather alerts. | A quick firefighting game — the same instincts as a real response: what to hit first, when to fall back. |

> People don't open a safety app until something's wrong. A game people want to play gets opened a lot more often — so the map underneath it does too.

---

## Demo: Report a Fire

*Cal*

- **Drop a pin anonymously** — pick a severity, and the location is rounded so it can't be traced to an exact address.
- **Updates live** — new reports show up for everyone right away, no refresh needed.
- **Sorted by distance** — closest reports to you show up first.
- **Real weather data included** — official alerts and wind direction, shown right on the same map.
- **Fades out on its own** — no fire, no permanent pin. Anyone can confirm one is "still burning" to keep it visible.

---

## The hard part: trust, without accounts

*Cal*

**How do you delete your own report with no login?**

| ❌ The risky way | ✅ What we built |
|---|---|
| A delete button. Anyone can click it — including on someone else's real report. The exact abuse this app has to prevent. | A one-time secret code, given only to you when you report. The database checks it directly — the app itself can't be tricked into skipping that check. |

We tested this directly against our live database, to make sure it actually holds up — not just that it looks right in the code.

---

## How it's built

*Cal*

| Layer | Choice |
|---|---|
| Frontend | React + Vite |
| Game | Phaser 3 — all art and sound generated in code |
| Map | Leaflet |
| Data | Supabase — storage, live updates, and security rules |
| Live feeds | National Weather Service — free, public data |
| Hosting | Vercel — auto-deploys on push |

---

## Demo: Play the Game

*Josh*

A firefighting game that's really about decisions.

- **Fires get worse if you wait** — three stages, each one harder to put out than the last.
- **Earn upgrades as you go** — a free one each round, a bigger shop every 5th.
- **Rewards fast, decisive play** — combo streaks and rare bonus coins.
- **Playable on a phone** — touch controls, adjustable difficulty.

It's not trying to be a serious simulator — it's trying to be a reason to open the app again tomorrow.

---

## By the numbers

*Josh*

What actually got built today.

| | |
|---|---|
| **9** | upgrades in the game |
| **3** | fire stages to escalate through |
| **2** | live data sources combined |
| **0** | accounts needed to use it |
| **4–24h** | auto-expiry, by severity |
| **100%** | tested against the real, live systems |

---

## Where this goes next

*Josh*

Getting closer to the goal, not just adding features.

- **Connect the game to real reports** — so playing and checking real risk become one habit.
- **Add spam protection** — keep the map trustworthy as more people use it.
- **Add automated tests** — so the safety logic keeps working as this grows.

---

<div align="center">

## Thank you

Built in one day, aimed at one goal: make wildfire awareness something people keep up with — not something they scramble for after it's too late.

| Product | Trust & Engineering | Game & Future |
|---|---|---|
| Veeram | Cal | Josh |
| The problem, the goal | The report map, security | The game, what's next |

**Try it live:** https://wildfire-app-veeram-dugars-projects.vercel.app

</div>
