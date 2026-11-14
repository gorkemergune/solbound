# Solbound — Every Decision Keeps Us Alive

**Run a Mars outpost. Balance power, life support, food, and radiation protection. Learn why every engineering decision has a cost.**

Solbound is an interactive STEM outpost management game planned for the **METU NASA Space Apps Challenge 2026**. Students become mission commanders and experience how connected engineering systems determine whether a crew survives.

> Status: planning and architecture. No playable build or application scaffold exists yet. Event context and challenge wording were supplied by the team; this is an independent project, not an official NASA product.

## The mission

Space education can hide the difficult choices that make a mission work. Solbound makes those choices visible: powering a greenhouse can reduce the energy available to life support; building a shelter uses the same crew time needed for maintenance.

The first mission is a **12-sol Mars scenario**, designed for a **5–8 minute session** and an initial **12–16-year-old audience**. These are design targets to validate through playtesting. A sol is a Martian day; the game compresses processes into turns and is not a flight engineering simulator.

## How it plays

1. Inspect the outpost, supplies, and forecast.
2. Allocate power and crew work, and select an improvement.
3. Preview expected consequences and commit the next sol.
4. Respond to a dust storm, equipment failure, or radiation warning.
5. See what changed, why it changed, and which alternative could help.
6. Complete the mission and compare a different strategy with the same seed.

**Example:** A dust storm reduces solar output. Keep the greenhouse running and consume battery reserves, or pause crop growth to protect life support? The result explains the consequences rather than merely showing a score.

## Planned MVP

- One Mars mission, four crew members, twelve turns.
- Power generation/storage, oxygen, water, food, habitat protection, and crew health.
- Six module types: solar array, battery, life support, greenhouse, shelter, workshop.
- Three event families: dust storm, equipment fault, solar particle warning.
- Deterministic simulation, decision preview, causal explanations, end-of-mission debrief.
- Browser-based play, local saves, no account required.
- English demo content; Turkish localization prepared as a follow-up.

Lunar missions, multiplayer, accounts, live NASA APIs, and runtime AI are outside the first playable scope.

## Proposed stack

React + TypeScript + Vite, SVG/CSS outpost view, a pure TypeScript simulation engine, a small application store, validated scenario JSON, localStorage, Vitest, and Playwright. This is a proposed implementation, not an installed dependency list. Versions and compatibility must be checked when scaffolding.

## Project documents

| Document | Purpose |
| --- | --- |
| [Product brief](docs/PRODUCT.md) | Audience, learning goals, game loop, and demo |
| [Architecture](docs/ARCHITECTURE.md) | System boundaries, simulation contract, and decisions |
| [Backlog](docs/BACKLOG.md) | Priorities, dependencies, estimates, acceptance criteria |
| [Claude discovery task](docs/CLAUDE_DISCOVERY_TASK.md) | Ready-to-send deep research assignment |
| [Research and assumptions](docs/RESEARCH.md) | NASA references and model limitations |
| [Tooling and automation](docs/TOOLING.md) | Candidate tools, collaboration, and CI plan |
| [GitHub setup](docs/GITHUB_SETUP.md) | Repository name, description, topics, and publication steps |

| [Examples and review workshop](docs/EXAMPLES_AND_REVIEW.md) | Curated links, experiments, and discussion notes |

## Development status

The team checkout is `/Users/gorkemparadise/Desktop/solbound`, connected to [gorkemergune/solbound](https://github.com/gorkemergune/solbound) on branch `main`. Local origin and initial commit were verified on 14 November 2026. The planning handoff does not commit or push files. No install, dev, build, or test commands are available until the application scaffold is implemented.

## Credits and licensing

Built by the hackathon team at METU. Team name and contributors are pending. The destination repository includes an MIT license; third-party asset permissions must be recorded separately; NASA references do not imply endorsement.
