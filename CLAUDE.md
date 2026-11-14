# Solbound project context

Read `docs/CURRENT_STATE.md` first (single up-to-date summary), then `bug/eksikler.md` (git-ignored) for the user's open list. `docs/00_START_HERE.md` and the v0.2 files are design history. This is a personal, story-driven 2D Moon/Mars outpost game: EN/TR, generated astronaut, three selected companions from a pool of sixteen, a launch-mass cargo budget (520 kg including crew body mass and personal kits), a 30-day surface mission with countdowns for predictable big events, visible mission and Earth time, research, consequences, return home and a shareable recap.

The user's direct instructions take priority. `docs/BRAINSTORM.md` and `docs/MAIN.md` (formerly `PROMPT.txt` and `docs/MAIN.txt`) are user context; preserve them. Older `PRODUCT.md`, `ARCHITECTURE.md`, `BACKLOG.md`, and `CLAUDE_DISCOVERY_TASK.md` describe the historical v0.1 proposal. Their Mars-only, 12-sol, research-only or turn-confirmation scope does not override v0.2 or subsequent user instructions.

The first playable slice from `docs/IMPLEMENTATION_PLAN_V2.md` has been extended at the user's request into the full 30-day mission (there is no separate demo any more); `docs/IMPLEMENTATION_NOTES.md` records what was built and what is still missing. Keep Moon and Mars selectable and meaningfully different. Keep game rules deterministic and independent of React, the clock adapter, and any future LLM. Label scientific sources and gameplay assumptions separately.

Preserve existing files and the MIT license. Do not claim tests, source verification, deployment, or features that were not completed. Read `docs/CLAUDE_CODE_PROMPT.md` for the prepared implementation assignment; reading it alone does not authorize publishing, pushing, or creating external resources.
