# RULES.md — Loaded every session. Read fully. Values live in variables.md.

## The five laws

Legacy ({{MODE_FREE_NAME}} code paths — still mandatory):
1. **Log every action.** Any Free Mode state change calls
   `board.writelog(action, id, data, oldData)` (→ `playlog.addStep`), or replay desyncs.
2. **Mutate via `board.updateItem()`.** Never set `card.property` directly in Free Mode code.
3. **Keep export/import in sync.** New card fields go into both
   `Board.exportState()` and `Board.importState()`; v1 imports must always load.

New ({{MODE_DUEL_NAME}}):
4. **GameState/engine is the single source of truth.** The UI only renders
   normalized events; it never mutates duel state, and the engine never touches the DOM.
5. **The bot never touches the DOM and never reads hidden information.**
   It receives a redacted public view and answers normalized Prompts only.

## Working style (summary)

- One small step per session. Never read large files whole: use `grep -n`,
   `sed -n 'a,bp'`, `head`. Files that are big: `js/jquery*.js`,
   `js/simulator.js` (~2.9k lines), `js/theme.js` (~1.8k), `js/card_menu.js`.
   (`js/example.js` is dead single-line JSON — ignore it.)
- Low on context / rate-limited: update `MEMORY.md`, commit, stop with
   `lanjut dari: <step>`.
- No C++/Emscripten compiles on device. No headless browser: QA = Node tests
   (`node --test`, no npm) + manual checklists.
- New code may be ES modules (no bundler). Legacy scripts stay global.
   Don't rewrite legacy code unless a task says so (Tahap 0 scoped changes only).
- {{MODE_FREE_NAME}} must run from `file://` (open question: `board.json` XHR — see audit #20).
   {{MODE_DUEL_NAME}} may require a local static server.
- Git: branch `{{BRANCH_PREFIX}}<stage>-<topic>`, small Conventional Commits,
   never push to main, never force-push, no PRs to upstream.
- Language: chat/reports in Indonesian; ALL repo content in English.
- Honesty: mark `(unverified)`; never invent; report failing tests as they are.

## Hard bans

- No AI in the bot: no LLM, ML, external APIs, telemetry.
- No AGPL code (EDOPro/ocgcore core, CardScripts, WindBot) before ADR-002 approval.
   Spike artifacts go to `.spike/` only (gitignored, never committed).
- No YGOPRODeck image hotlinking; pulls ≤ {{API_RATE_MAX}}; no runtime API calls.
- No secrets/tokens. No history rewriting. No destructive commands
   (`rm -rf`, `git reset --hard`, `git clean -fd`) without explicit permission.
- No new runtime dependencies without an approved ADR. No npm packages at all
   in `tools/`/`tests/` without an ADR.
- Don't break {{MODE_FREE_NAME}}: v1 export/import must stay readable.

## Definition of Done (every feature/fix)

- `node --test` green — attach real output.
- `docs/qa/REGRESSION-MODE-BEBAS.md` checklist passes when UI/engine touched.
- Docs updated: `docs/ARCHITECTURE.md` (if architecture changed),
   `docs/duel-mode/*`, matching `.claude/app-knowledge/` + knowledge-pack files,
   and bump `?v=N` in `index.html` for every changed JS/CSS file.
- `MEMORY.md` and `TASKS.md` updated.
- Local run instructions included in the step report.
- No: hotlinks, secrets, AGPL code, new runtime deps, npm packages.

## Report format (per step, ≤ 15 lines)

1) Done (files) · 2) Commands run + actual results · 3) How to run locally ·
4) Risks/findings · 5) Decisions needed · 6) Next step.

## Folders

```
js/duel/state/  pure GameState (no DOM/timers)     tools/   offline data pipeline
js/duel/engine/ DuelEngine iface + Worker          tests/   node --test + fixtures
js/duel/bot/    Executor/selector/battle/chain    data/    card shards + manifest
js/duel/ui/     event-rendered mirror board        .spike/  local only, gitignored
```

## Gates

- **A** planning docs complete · **B** engine spike results + ADR-001/002 ·
- **C** first playable duel vs basic bot · **D** release candidate.
Stop and report at every gate. Outside gates, continue autonomously except
for owner-only decisions: ADR-001, ADR-002, FIRST_DECK, asset hosting, new
third-party dependencies, budget numbers, mode names in UI, flag activation.
