# Solbound project context

Read `docs/00_START_HERE.md` first, then the v0.2 files linked there. This is a personal, story-driven 2D Moon/Mars outpost game: EN/TR, generated astronaut, three selected companions, 100V cargo, visible mission time, research, consequences, and return home.

The user's direct instructions take priority. `PROMPT.txt` and `docs/MAIN.txt` are user context; preserve them. Older `PRODUCT.md`, `ARCHITECTURE.md`, `BACKLOG.md`, and `CLAUDE_DISCOVERY_TASK.md` describe the historical v0.1 proposal. Their Mars-only, 12-sol, research-only or turn-confirmation scope does not override v0.2 or subsequent user instructions.

Implement the first playable slice defined in `docs/IMPLEMENTATION_PLAN_V2.md`; distinguish the 3-day demo from the 30-day campaign target. Keep Moon and Mars selectable and meaningfully different. Keep game rules deterministic and independent of React, the clock adapter, and any future LLM. Label scientific sources and gameplay assumptions separately.

Preserve existing files and the MIT license. Do not claim tests, source verification, deployment, or features that were not completed. Read `docs/CLAUDE_CODE_PROMPT.md` for the prepared implementation assignment; reading it alone does not authorize publishing, pushing, or creating external resources.
