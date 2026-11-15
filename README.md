<div align="center">
  <img src="public/favicon.svg" width="72" alt="Solbound logo" />
  <h1>Solbound</h1>
  <p><strong>Choose your crew. Pack every kilo. Bring everyone home.</strong></p>
  <p>
    <a href="https://solbound.vercel.app"><strong>▶ Play now</strong></a> ·
    <a href="https://www.youtube.com/watch?v=k4y-1OFfU08">Watch the trailer</a> ·
    English / Türkçe
  </p>
  <a href="https://www.youtube.com/watch?v=k4y-1OFfU08">
    <img src="docs/media/trailer-poster.jpg" width="820" alt="Solbound trailer on YouTube — click to watch (30 s)" />
  </a>
</div>

## About

Solbound is a story-driven survival game set on the **Moon or Mars**. You lead a four-person crew through a 30-day surface mission, keeping **oxygen, water, power, food and radiation shielding** in balance. Every decision has a cost.

The solar storms are real: solar eruptions recorded in **NASA DONKI** become radiation events in your mission, with the real dates and speeds shown in the game.

## How it plays

| | |
| --- | --- |
| **1. Choose your crew** | Pick three companions from sixteen. Each has different skills and a different personality. |
| **2. Pack for launch** | You have 520 kg, and that includes the crew's own body mass. |
| **3. Survive 30 days** | Deal with dust storms, meteor showers, quakes, failing systems and arguments in the crew. Big events come with a countdown, so you can prepare. |
| **4. Bring them home** | Book the return window, get everyone off the surface and share a recap film of your mission. |

|                        Build your crew                        |                     Pack for survival                     |
| :-----------------------------------------------------------: | :-------------------------------------------------------: |
| ![Choosing companions with different skills](docs/media/crew.png) | ![Packing within the 520 kg launch budget](docs/media/cargo.png) |

## Why we built it

Running a base on the Moon or Mars means you can't do everything at once. Power, oxygen, water, food and shielding all compete for the same mass, time and people. Solbound lets students feel that trade-off and see *why* a decision worked or failed. It runs free in any browser, in English or Turkish, on a laptop or a phone, with no install and no account.

## Fit with the challenge

| The challenge asks for | In Solbound |
| --- | --- |
| Life support: oxygen and water | O₂ and water stocks with daily use, MOXIE and electrolysis, water recovery, leaks and emergency reserves |
| Energy: production, use and storage | Solar output that depends on the landing site, day and night, dust and storms; a battery; greenhouse modes and crew routines that change power use |
| Food: stock versus future harvest | Packed food against greenhouse growth; harvest events; the greenhouse costs power |
| Radiation protection | A shelter that costs crew time and work. Real NASA DONKI solar eruptions arrive as radiation events |
| Learning why a decision worked | Every decision shows its chance and cost. Research cards explain the science behind it, and the debrief lists the lessons from your run |

## What is real and what is a game rule

- **NASA DONKI:** space-weather events recorded by NASA in the last 30 days, such as coronal mass ejections (CMEs), happen in the game on the same days, with their real dates and speeds.
- **Signal delay:** computed from the planets' real positions using JPL's approximate-position formulas.
- **Research cards:** 31 cards that cite 25 NASA and JPL sources.
- **Game rules:** landing-site multipliers, success chances and consumption values are game-design assumptions. The cards keep sourced facts, derived values and game rules on separate lines. See [`docs/RESEARCH.md`](docs/RESEARCH.md).

## In the classroom

One 40-minute lesson, in pairs:

1. **Intro (5 min):** each pair picks the Moon or Mars and reads the mission briefing.
2. **Play (25 min):** at 16× speed. Before each decision the pair agrees on a choice and says why.
3. **Discuss (10 min):**
   - Why does a battery store energy but never make it?
   - Should you go home at the goal, or stay as long as the estimate?
   - Which preparation made the biggest difference?

## Cost and sustainability

Solbound is a static web page with no server, no database and no paid service. It runs at no cost on Vercel's free Hobby plan, which is for non-commercial use; a school can move it to any static host. NASA's open APIs are free.

The NASA data is downloaded with the team's own key by a script, which a scheduled GitHub Action can run, and served as a static file, so the browser never needs a key. If that copy is more than two days old, the browser asks NASA directly with the public `DEMO_KEY`, which NASA rate-limits per visitor; when that fails, the game uses the saved copy.

There are no accounts and no analytics: game progress is saved only in the player's browser. The code is MIT-licensed, so teachers or other teams can host or adapt it.

## Run locally

Requires Node.js 20.19+.

```sh
npm install
npm run dev     # start the game
npm test        # engine tests
```

Built with React, TypeScript and Vite. Design notes and science sources are in [`docs/`](docs/README.md).

---

<div align="center">
  Built by <strong>LoversGG</strong> for the <strong>METU NASA Space Apps Challenge 2026</strong>. An independent student project, not an official NASA product.<br />
  <a href="LICENSE">MIT License</a> · <a href="docs/media/CREDITS.md">Media credits</a>
</div>
