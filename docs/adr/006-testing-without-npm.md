# ADR-006 — Testing strategy without npm

- **Status:** accepted

## Context

No browser headless available on the target device; no npm packages allowed
without an ADR; Node ≥ {{NODE_MIN}} is present (v22.23.4 measured). Legacy
code (simulator.js) requires jQuery/DOM, so it cannot run under plain Node.

## Options

1. Introduce a test framework + jsdom via npm.
2. `node --test` (built-in runner, zero dependencies) over pure modules and
   fixture files, plus a manual browser checklist for what Node cannot cover.

## Decision

**Option 2.**

- `tests/` uses only `node --test` + `node:assert` + fixture JSON. No npm
  packages, ever, without a new ADR.
- New duel code (`js/duel/state`, `engine`, `bot`) is written DOM-free so it is
  Node-testable: rules, seeded bot-vs-bot duels (200 games, crash/illegal-move/
  loop assertions), v1-state import compatibility, data-shard schema checks.
- UI behavior and legacy features are covered by the manual checklist
  `docs/qa/REGRESSION-MODE-BEBAS.md` (Free Mode) and a duel-mode checklist
  added at Gate C, executed on a real phone and desktop browser.
- CI (`.github/workflows/test.yml`) runs `node --test` on Node 20 and 22 to
  enforce NODE_MIN.

## Consequences

- Rules and bot correctness are machine-checked; UI correctness is honest
  manual work — the checklist must be kept short enough to actually run.
- Any DOM-dependent logic someone sneaks into `js/duel/` will fail tests, which
  is the point (ADR-003 guard).
- Reports must attach real `node --test` output (no "should pass").
