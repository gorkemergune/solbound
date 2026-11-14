# Solbound — Every Decision Keeps Us Alive

**Choose your crew. Pack 100V of supplies. Run a lunar or Martian outpost, and bring your people home.**

Solbound is an interactive STEM outpost management game planned for the **METU NASA Space Apps Challenge 2026**. Students become mission commanders and experience how connected engineering systems determine whether a crew survives.

> Status: planning and architecture. No playable build or application scaffold exists yet. Event context and challenge wording were supplied by the team; this is an independent project, not an official NASA product.

> Current design: v0.2. Start with [the current product and flow documents](docs/00_START_HERE.md). Older v0.1 proposals are retained with historical notices.

## The mission

Space education can hide the difficult choices that make a mission work. Solbound makes those choices visible: powering a greenhouse can reduce the energy available to life support; building a shelter uses the same crew time needed for maintenance.

The current direction is a personal, story-driven 2D experience inspired by the sense of identity, passing time, and life records in [1 in 8 Billion](https://1in8b.life/). Players choose EN/TR, receive a generated astronaut, select Moon or Mars, choose three companions from a candidate pool, and pack within 100V. The full campaign targets about 30 surface mission days plus separate outbound and return chapters. The first implementation slice is an explicitly labeled three-day demo for both destinations; it is not the complete campaign.

## How it plays

1. Choose a language, name your astronaut, and discover their abilities.
2. Choose Moon or Mars, recruit three companions, and pack a 100V cargo bay.
3. Launch, complete a journey task, and establish the outpost.
4. Manage resources, assign crew, research NASA-based concepts, and resolve daily events as mission time advances.
5. Prepare the return journey and see how your earlier decisions affect the way home.
6. Read your mission story and retry with a different plan.

## First playable target

- Complete preparation flow, EN/TR throughout, generated profiles and a default pool of 12 candidates.
- Meaningfully different Moon/Mars scenarios with a three-day demo each.
- One outbound task, three main and two small surface events per destination, and two return decisions.
- Visible time and pause state; resources, crew consequences, local saves, and an explanatory ending.
- Original 2D scenes, character portraits, cargo view, and a responsive outpost interface.

These are planned features, not a claim that the application exists. The 30-day content expansion and optional LLM ship computer follow the first playable slice.

## Proposed stack

React + TypeScript + Vite, SVG/CSS outpost view, a pure TypeScript simulation engine, a small application store, validated scenario JSON, localStorage, Vitest, and Playwright. This is a proposed implementation, not an installed dependency list. Versions and compatibility must be checked when scaffolding.

## Project documents

| Document | Purpose |
| --- | --- |
| [Current design v0.2](docs/00_START_HERE.md) | Current scope, flow, systems, story, visual direction, and implementation plan |
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

The team checkout is `/Users/gorkemparadise/Desktop/solbound`, connected to [gorkemergune/solbound](https://github.com/gorkemergune/solbound) on branch `main`. Local origin and initial commit were verified on 14 November 2026. The planning handoff does not commit or push files. No install, dev, build, or test commands are available until the application scaffold is implemented.

## Credits and licensing

Built by the hackathon team at METU. Team name and contributors are pending. The destination repository includes an MIT license; third-party asset permissions must be recorded separately; NASA references do not imply endorsement.
