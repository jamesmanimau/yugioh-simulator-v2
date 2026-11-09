# MEMORY.md — loaded every session; update at the end of every step

> Rules: read at session start, update at step end, compact past 120 lines
> (archive to `docs/duel-mode/archive/`), no secrets, mark `(unverified)`.

## Status

- **Stage / step:** bootstrap complete (Langkah 0–7) · **Gate:** A — awaiting owner approval
- **Branch:** `main` (local only; nothing pushed, per RULES.md)
- **Last commit:** see `git log --oneline -1` (Gate A commit series: c557cbc → step 7)
- **Duel Mode flag:** OFF (`js/duel/config.js`, off until Gate C)

## Decisions (ADR index)

| ADR | Topic | Status |
|-----|-------|--------|
| 001 | Engine path (WASM ocgcore vs mini JS engine) | **proposed** — owner decision; recommendation: B default + spike A (Gate B) |
| 002 | License & IP (AGPL ban for v1, Konami disclaimer) | **proposed** — owner decision |
| 003 | GameState separated from DOM | accepted |
| 004 | Data pipeline + used-cards image hosting | accepted (image hosting numbers pending) |
| 005 | Bot architecture (WindBot pattern, no AI) | accepted |
| 006 | Testing without npm (`node --test` + checklists) | accepted |

## Verified lessons (date + evidence)

- 2026-11-09 — `js/example.js` is dead: 96 KB single-line JSON, loaded nowhere;
  startup uses `board.json` (`js/simulator.js:2880`). Docs fixed in Langkah 4/5. (ASSUMPTION-AUDIT #15)
- 2026-11-09 — Legacy logging API is `board.writelog(action, id, data, oldData)`
  → `playlog.addStep`; there is no `playlog.writelog(step)`. (audit #3, `js/simulator.js:1976-1978`)
- 2026-11-09 — Card image fallback is **name-based**
  (`js/simulator.js:923`), CDN URLs are cardId-based `.jpg`. (audit #9)
- 2026-11-09 — `card.name` is injected unescaped into log HTML — hardening
  task 0A-3. (audit #12, `js/simulator.js:176-212`)
- 2026-11-09 — `moveTo` = 400 ms nested `setTimeout` + double
  `appendToBoard`; stale-card guard exists (`js/simulator.js:796-801`, `:1012-1019`). (audit #14)
- 2026-11-09 — `board.json` loads via XHR and the Board is built only in its
  callback ⇒ Free Mode likely fails to initialize on `file://` — task 0A-4,
  manual browser test still needed. (audit #20) **(unverified)**

## Open items

- Owner: approve Gate A; ADR-001/ADR-002; FIRST_DECK (candidates to be
  proposed in Tahap 4 prep); asset hosting; budget numbers; UI mode names;
  flag activation timing.
- OpenCode wiring (`opencode.json`, `.opencode/agents/*.md`) takes effect only
  after an OpenCode restart — test in a fresh session: ask "sebutkan aturan
  nomor 1 di RULES.md". **(unverified)**
- First-load budget must be measured (Tahap 5-2) — vendor/ is 8.5 MB on disk
  today.

## Handoff notes

- All Gate A docs in `docs/duel-mode/`: ASSUMPTION-AUDIT, variables, PRD,
  ARCHITECTURE, DESIGN, RULES, TASKS, MEMORY (this file). ADRs in `docs/adr/`.
- Next session per TASKS.md "Next": 0A-1 (CDN pin + `?v=` gaps) on branch
  `{{BRANCH_PREFIX}}stage0-foundation`.
- When editing `index.html`, remember cache-bust `?v=` for every changed JS/CSS.
