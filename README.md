# Solbound — Every Decision Keeps Us Alive

**Choose your crew. Pack within the launch mass. Run a lunar or Martian outpost, and bring your people home.**

Solbound is an interactive STEM outpost game for the **METU NASA Space Apps Challenge 2026**: an educational simulation fed by NASA records. Students become mission commanders and experience how connected engineering systems determine whether a crew survives.

> Status: playable 30-day mission on both Moon and Mars (two landing sites / arrival seasons each, randomized event mix per run, countdowns for predictable big events, a shareable recap film at the end). Event context and challenge wording were supplied by the team; this is an independent project, not an official NASA product.

> **Current state:** read [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md) first; it is the single up-to-date summary. The v0.2 design ([00_START_HERE](docs/00_START_HERE.md)) and the older v0.1 proposals are kept as history.

## The mission

Space education can hide the difficult choices that make a mission work. Solbound makes those choices visible: powering a greenhouse can reduce the energy available to life support; building a shelter uses the same crew time needed for maintenance.

The current direction is a personal, story-driven 2D experience inspired by the sense of identity, passing time, and life records in [1 in 8 Billion](https://1in8b.life/). Players choose EN/TR, receive a generated astronaut, select Moon or Mars, choose three companions from a candidate pool, and pack within a launch mass budget that includes everyone's body mass and personal kit. The mission lasts 30 surface days with compressed outbound and return chapters. Predictable big events (Mars dust storms, the lunar night at the equator, meteor showers, a polar dark period, a cargo lander) are announced with a countdown so the crew can prepare.

## Live NASA data

- **Space weather (NASA DONKI):** the title screen shows the last 30 days of real records and refreshes itself (every 3 hours; cached in the browser). When a mission starts, that window is stored with it: mission day 1 is the first day of the window. CMEs that NASA's WSA-ENLIL model sends toward Mars (or Earth–Moon) become countdown events, and other records arrive as bulletins with links to the NASA record. If NASA is unreachable, the game uses the last saved copy or the bundled snapshot in `src/live/donki-fallback.json` (refresh it with `npm run donki:snapshot`).
- **Signal delay:** the Earth–Mars distance is computed in the browser from JPL's *Approximate Positions of the Planets*. Tests check it against JPL Horizons; it agrees to within 0.02%. Horizons itself cannot be called from a browser because it sends no CORS header.
- **API key (none in the browser):** the site first reads its own static `public/donki-latest.json`, written by `npm run donki:snapshot` (key from `.env` or the `NASA_API_KEY` environment variable) or by the optional GitHub Action `.github/workflows/donki-snapshot.yml` (repository secret `NASA_API_KEY`, every 6 hours). Only if that file is older than 6 hours does the browser call NASA itself, with the public `DEMO_KEY`, whose limits apply per visitor IP. Copy `.env.example` to `.env` for the script; `.env` is git-ignored.

## How it plays

1. Choose a language, name your astronaut, and discover their abilities.
2. Choose Moon or Mars and a landing site / arrival season, recruit three companions, and pack within the launch mass.
3. Launch, complete a journey task, and establish the outpost.
4. Manage resources, assign crew, research NASA-based concepts, and resolve daily events as mission time advances.
5. Prepare the return journey and see how your earlier decisions affect the way home.
6. Read your mission story and retry with a different plan.

## What is built

- Complete preparation flow in EN/TR. Generated, gender-matched profiles and a pool of 16 candidates with 15 specialties; names follow the game language.
- Moon (polar ridge or equator with the lunar night) and Mars (northern spring or southern summer) over a full 30-day mission, with a different event mix every run.
- Every decision card has at least three choices that need no kit, role or research; kits and specialists add up to six.
- Countdown events with preparation tasks, real NASA DONKI CME arrivals, a Moon-only reinforcement crew, and rotating harvest situations.
- Visible time (base time next to Earth time and signal delay), local saves, an explanatory debrief and a recap film to share.

Not built yet: the "what if I had chosen differently" comparison and the optional LLM ship computer. See [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md) and the [implementation notes](docs/IMPLEMENTATION_NOTES.md).

## Run it

Requires Node.js 20.19+ (tested with Node 24).

```sh
npm install
npm run dev        # local dev server
npm run typecheck  # TypeScript
npm test           # engine tests (Vitest)
npm run build      # production build into dist/
npx playwright install chromium   # once, for the browser playthrough
npm run e2e        # after build: plays Mars (TR, desktop) and Moon (EN, mobile) end to end
```

## Stack

React 19 + TypeScript + Vite, original SVG/CSS scenes and portraits, a pure deterministic TypeScript engine in `src/engine` (no React, no clock, no browser APIs), EN/TR dictionaries in `src/i18n`, a versioned localStorage save, Vitest and Playwright. Fonts are bundled locally (Fontsource: Inter, Space Grotesk; SIL OFL).

## Project documents

| Document | Purpose |
| --- | --- |
| [Current state](docs/CURRENT_STATE.md) | **Start here.** Single up-to-date summary of scope, values and open work |
| [Design v0.2 (history)](docs/00_START_HERE.md) | The pre-implementation design contract and reading order |
| [Implementation notes](docs/IMPLEMENTATION_NOTES.md) | What was built, engineering decisions, gameplay assumptions, test results, open work |
| [Claude Code prompt](docs/CLAUDE_CODE_PROMPT.md) | Ready-to-use implementation assignment |
| [Model workflow](docs/MODEL_WORKFLOW.md) | Opus/Fable recommendation and launch commands |
| [Product brief](docs/PRODUCT.md) | Audience, learning goals, game loop, and demo |
| [Architecture](docs/ARCHITECTURE.md) | System boundaries, simulation contract, and decisions |
| [Backlog](docs/BACKLOG.md) | Priorities, dependencies, estimates, acceptance criteria |
| [Claude discovery task](docs/CLAUDE_DISCOVERY_TASK.md) | Ready-to-send deep research assignment |
| [Research and assumptions](docs/RESEARCH.md) | NASA references and model limitations |
| [Tooling and automation](docs/TOOLING.md) | Candidate tools, collaboration, and CI plan |
| [GitHub setup](docs/GITHUB_SETUP.md) | Repository name, description, topics, and publication steps |

| [Examples and review workshop](docs/EXAMPLES_AND_REVIEW.md) | Curated links, experiments, and discussion notes |

## Development status

The repository is [gorkemergune/solbound](https://github.com/gorkemergune/solbound) on branch `main`; the team commits and pushes. Current scope and open items: [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md).

## Credits and licensing

Built by the hackathon team at METU. Team name and contributors are pending. The destination repository includes an MIT license; third-party asset permissions must be recorded separately; NASA references do not imply endorsement.
