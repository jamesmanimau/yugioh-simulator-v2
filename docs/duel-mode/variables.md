# variables.md — Single source of changeable values

> Rules: every other project doc uses `{{PLACEHOLDER}}` tokens; the value is
> written **only** in this file. When reading a doc, substitute placeholders
> with the values here. Change a value here, not in the doc that references it.
> Numbers marked *(proposed)* are initial proposals from the bootstrap prompt;
> the product owner (the human) has final say on all budget/decision numbers.

| Variable | Value | Used in | Notes |
|----------|-------|---------|-------|
| `PROJECT_NAME` | yugioh-simulator | all docs | Upstream repo: arthastheking113/yugioh-simulator |
| `MODE_FREE_NAME` | Mode Bebas | PRD, DESIGN, UI copy | Existing manual combo recorder (no rules enforced) |
| `MODE_DUEL_NAME` | Mode Duel | PRD, DESIGN, UI copy | New bot-duel mode; UI name pending owner approval |
| `NODE_MIN` | 20 | RULES, CI, tooling | Node only for `tools/` + `tests/`; no runtime use. Measured: v22.23.4 |
| `API_RATE_MAX` | 10 req/s | tools/ scripts, RULES | YGOPRODeck allows 20 req/s; we stay at half |
| `BRANCH_PREFIX` | duel/ | git workflow | e.g. `duel/stage0-foundation` |
| `BOT_LEVELS` | Easy / Normal / Hard | bot, DESIGN | Level = subset of executor rules enabled, no lookahead in v1 |
| `BUDGET_FIRST_LOAD_MB` | 15 MB *(proposed)* | browser budget, Gate C/D | Compressed first load of Duel Mode. Current baseline: vendor/ is 8.5 MB on disk, but served compressed is far smaller; 15 MB leaves room for engine + card images. Kept as proposed. |
| `BUDGET_TTFP_SEC` | 5 s *(proposed)* | browser budget, Gate C | Time to first prompt on a mid-range phone over a local server. Kept as proposed. |
| `BOT_MIN_WINRATE` | 70% *(proposed)* | bot tests, Gate C | DefaultExecutor vs random-choice bot, 200 seeded duels. Kept as proposed. |
| `BOT_DECISION_MS` | 200 ms *(proposed)* | bot tests, Gate C | Median decision time per prompt. Kept as proposed. |
| `ENGINE_PATH` | (empty — pending ADR-001) | ARCHITECTURE, roadmap | Option A: ocgcore WASM + Lua scripts. Option B: mini JS engine + effect DSL for 1–2 archetypes. Owner decision only. |
| `FIRST_DECK` | (empty — owner picks) | roadmap Tahap 4, bot | Three candidates will be proposed from example data; owner chooses. |
