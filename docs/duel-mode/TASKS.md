# TASKS.md — Duel Mode Roadmap

> Format: ID · description · owner · size (S/M/L) · deps · testable acceptance
> criteria · status. Gates: **A** (docs) → **B** (spike + ADR-001/002) →
> **C** (playable duel) → **D** (release candidate). Values from `variables.md`.

## Stage 0 — Foundation

- **0A-1** (M) Pin + self-host remaining CDN libs (SweetAlert2 `@11`, Font
  Awesome), add missing `?v=` (`js/theme.js`, `css/app.css`). · browser-platform-engineer · deps: none ·
  AC: `index.html` has zero unpinned CDN references; Free Mode checklist passes.
- **0A-2** (M) Upgrade jQuery ≥ 3.5 (CVE-2020-11022/11023) and verify jQuery
  UI 1.12.1 + Touch Punch compatibility. · browser-platform-engineer · deps: 0A-1 ·
  AC: drag/flip/overlay all work on desktop + touch; checklist green.
- **0A-3** (S) Harden `importState()`: schema + size limits, escape `card.name`
  in log HTML (audit #12). · game-engine-developer + qa-engineer · deps: none ·
  AC: malicious fixture (oversized/HTML-in-name) is rejected or escaped —
  `node --test` (pure validation part) + manual check; v1 clean imports still load.
- **0A-4** (S) Resolve `board.json` XHR vs `file://` (audit #20); decide fix or
  documented limitation. · browser-platform-engineer · deps: none ·
  AC: manual test on `file://` in Chromium + Firefox recorded in MEMORY.md.
- **0A-5** (S) Remove dead `js/example.js` reference from docs; confirm no
  load path uses it (audit #15). · scrum-master · deps: none ·
  AC: grep shows no runtime reference; CLAUDE.md file map corrected.
- **0B-1** (L) Pure `GameState` (no DOM/timers), field owner (0/1), animation
  queue owned by UI. · duel-engine-developer + game-engine-developer · deps: none ·
  AC: `node --test` over state fixtures green.
- **0B-2** (M) State v2 schema + v1→v2 migration + mode flag. · duel-engine-developer · deps: 0B-1 ·
  AC: Free Mode identical (checklist); v1 import loads (test); v2 round-trip (test).

## Stage 1 — Card data

- **1-1** (L) `tools/` pipeline: YGOPRODeck v7 → sharded JSON + versioned
  manifest (idempotent, resumable, ≤ {{API_RATE_MAX}}). · data-pipeline-engineer · deps: 0A-5 ·
  AC: rerun produces identical shards; manifest hash verified by test.
- **1-2** (M) Card schema v2 fields + `Card` loads new fields + IndexedDB
  cache. · data-pipeline-engineer · deps: 1-1 ·
  AC: schema fixture tests green; Free Mode untouched.
- **1-3** (M) Image strategy: self-host `asset/card/{cardId}.jpeg` for used
  cards; keep name-based fallback working; on-demand cache. · data-pipeline-engineer · deps: 1-2 ·
  AC: no hotlinks in runtime; used-cards size measured and reported vs budget.

## Stage 2 — Engine (spike first) — **Gate B**

- **2-1** (S) Spike on a separate branch, not merged: run a 2-deck duel in a
  Worker with prebuilt ocgcore WASM artifacts; measure download size,
  time-to-first-prompt, JSPI need, memory. · duel-engine-developer · deps: 0B-2 ·
  AC: numbers + go/no-go recommendation recorded for ADR-001/002. Artifacts in `.spike/` only.
- **2-2** (L) `DuelEngine` interface + Worker + on-demand script loader +
  `MESSAGE-MAP.md` (engine→UI events, UI→engine responses). · duel-engine-developer · deps: 2-1, ADR-001 approved ·
  AC: scripted 2-deck fixture duel runs to completion in `node --test`.
- **2-3** (M) Effect index (lightweight) + replay = seed + decks + responses. · duel-engine-developer · deps: 2-2 ·
  AC: same seed ⇒ identical event log (test).

## Stage 3 — Opponent field + prompt UI

- **3-1** (L) Mirror board UI (shared EMZ, hidden opponent hand, LP, chain
  panel), event-rendered per DESIGN.md. · frontend-developer · deps: 2-2 ·
  AC: two humans hot-seat can finish a basic duel (draw, summon, attack, chain) — manual checklist.
- **3-2** (M) Prompt Manager (selectCards/place/position/yesNo/option/chain),
  safe defaults, portrait layout + flip button, reduced motion. · frontend-developer · deps: 3-1 ·
  AC: every prompt type answered at least once in a scripted duel; no deadlocks.

## Stage 4 — Bot (no AI) — **Gate C**

- **4-1** (L) Bot skeleton: Executor framework, DefaultExecutor, selectors,
  battle module, chain responder, seeded RNG, decision log, levels. · bot-developer · deps: 2-3, 3-2 ·
  AC: 200 seeded bot-vs-bot duels — no crash/illegal response/loop.
- **4-2** (M) First deck Executor for `{{FIRST_DECK}}` (3 candidates proposed
  from example data — owner picks). · bot-developer + game-engine-developer · deps: 4-1 ·
  AC: DefaultExecutor ≥ {{BOT_MIN_WINRATE}} vs random bot; median decision
  ≤ {{BOT_DECISION_MS}} ms.
- **4-3** (S) Human-vs-bot duel end-to-end on phone + desktop. · qa-engineer · deps: 4-2 ·
  AC: full duel to win/lose on both; first prompt ≤ {{BUDGET_TTFP_SEC}} s (mid-range phone).

## Stage 5 — Browser class + release — **Gate D**

- **5-1** (M) Engine+bot in one Worker; PWA offline; Pointer Events replace
  Touch Punch (Free Mode drag still works). · browser-platform-engineer · deps: 4-3 ·
  AC: duel playable fully offline; Free Mode checklist green.
- **5-2** (S) CSP (verify WASM need — likely `wasm-unsafe-eval` only for path
  A), budgets measured, a11y basics, i18n ID/EN, docs, full regression. · browser-platform-engineer + qa-engineer · deps: 5-1 ·
  AC: first load ≤ {{BUDGET_FIRST_LOAD_MB}} MB compressed (measured); all checklists pass.

## Next (max 8)

1. 0A-1 · 2. 0A-3 · 3. 0A-4 · 4. 0A-5 · 5. 0A-2 (after 0A-1) ·
6. 0B-1 · 7. 0B-2 (after 0B-1) · 8. 1-1 (after 0A-5)

**Gate A** is this planning set (steps 0–7). Owner decisions pending before
Stage 2 can start: ADR-001, ADR-002, FIRST_DECK candidates.
