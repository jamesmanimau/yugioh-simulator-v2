# PRD — {{MODE_DUEL_NAME}} (Duel Mode)

> Status: draft for Gate A · Owner: product-owner · Values come from
> `variables.md` (substitute `{{PLACEHOLDER}}` tokens when reading).

## Problem

{{PROJECT_NAME}} today is {{MODE_FREE_NAME}} only: a manual combo recorder with
no rule enforcement, no opponent, and no card-effect execution. Players cannot
practice a real duel, and combo creators cannot verify that a recorded sequence
is even legal. The board is single-sided, so there is no way to represent an
opponent's field.

## Goals

1. A complete, playable duel against a bot, fully in the browser.
2. A deterministic, rule-based bot (no LLM/ML/external APIs) at three levels
   ({{BOT_LEVELS}}).
3. Engine-enforced rules for at least the supported card pool.
4. Static, offline-capable, comfortable on phones.
5. {{MODE_FREE_NAME}} keeps working exactly as before (v1 state imports stay
   readable).

## Non-goals

- No AI/ML/LLM, no telemetry, no networking at runtime.
- No online multiplayer (hot-seat is a stepping stone, not the product).
- No full Yu-Gi-Oh card-database coverage in v1 — coverage follows
  `{{FIRST_DECK}}` and a small staple set.
- No changes to {{MODE_FREE_NAME}} behavior or its `exportState()`/`importState()`
  v1 format.
- No new runtime dependencies without an approved ADR.

## Personas

- **Combo creator / content maker** — uses {{MODE_FREE_NAME}} to record and share
  combos; needs it untouched, and benefits from an optional legality check.
- **Practice player** — wants to rehearse a deck against a predictable,
  replayable opponent; plays on a phone, often offline.

## User stories & acceptance criteria

**US1 — Start a duel** *(Practice player)*
As a player, I can start a duel against a bot of a chosen level, so I can
practice my deck.
AC: (a) an entry point offers {{MODE_DUEL_NAME}} with level {{BOT_LEVELS}};
(b) a duel initializes with 8000 LP and both decks shuffled from a fixed seed;
(c) first prompt appears within {{BUDGET_TTFP_SEC}} s on a mid-range phone
(manual checklist, Gate C); (d) mode flag stays off until Gate C.

**US2 — Legal turn actions** *(Practice player)*
As a player, I can draw, summon, set, activate, attack, and end my turn, with
the engine accepting or rejecting each action, so the duel follows the rules.
AC: (a) engine accepts legal actions and rejects illegal ones — verified by
Node tests over fixtures (no browser needed); (b) every accepted action emits a
normalized event rendered by the UI (no direct DOM mutation from the engine);
(c) bot cannot read hidden information (hand/face-down) — asserted in bot
tests.

**US3 — Respond to prompts** *(Practice player)*
As a player, I receive clear prompts (select card, select zone, yes/no, chain)
and can respond, so duel flow never stalls.
AC: (a) all engine prompts surface through the Prompt Manager with touch-sized
targets; (b) a scripted fixture duel answers every prompt type at least once
and completes; (c) cancelled prompts always fall back to a safe default, never
deadlock.

**US4 — Finish a duel against a stable bot** *(Practice player)*
As a player, I can play a full duel to a win/lose result, so practice feels
real.
AC: (a) 200 seeded bot-vs-bot duels: zero crashes, illegal responses, or
infinite loops; (b) basic bot beats a random-choice bot in ≥ {{BOT_MIN_WINRATE}}
of games; (c) median bot decision time ≤ {{BOT_DECISION_MS}} ms; (d) same seed ⇒
identical decision log.

**US5 — {{MODE_FREE_NAME}} unharmed** *(Combo creator)*
As a combo creator, everything I rely on keeps working after {{MODE_DUEL_NAME}}
ships, so my content stays valid.
AC: (a) `docs/qa/REGRESSION-MODE-BEBAS.md` checklist passes (draw, summon,
flip, Xyz overlay/detach, record/replay, v1 export/import, touch drag);
(b) Node test imports a v1 `exportState()` JSON and restores all card fields;
(c) `node --test` green; (d) no new runtime dependency in the shipped app.

## Success metrics

- All 5 US acceptance criteria pass at the gates where they apply (US1/US4 at
  Gate C; US5 continuously).
- First-load budget ≤ {{BUDGET_FIRST_LOAD_MB}} MB compressed.
- {{MODE_FREE_NAME}} loads no slower than the Stage 0 baseline.

## Constraints

- Static site, no build step for the app; Node (≥ {{NODE_MIN}}) only for
  `tools/` and `tests/`.
- Data pulls ≤ {{API_RATE_MAX}} (YGOPRODeck limit is 20 req/s; no image
  hotlinking).
- No AGPL code before ADR-002 approval; engine path decided only by ADR-001.
- {{MODE_FREE_NAME}} must still work from `file://` (see ASSUMPTION-AUDIT.md
  item 20 — currently at risk because of `board.json` XHR).

## Risks

- **Rule-engine scope creep** — full card coverage is unbounded; mitigated by
  {{FIRST_DECK}}-scoped effects and a minimal-staple set.
- **Engine path (ADR-001)** — WASM/JSPI browser support and download size may
  fail the budget; spike (Gate B) decides before commitment.
- **Mirror board complexity** — the 400 ms/`setTimeout` animation system caused
  ghost cards once already; new UI must render from events, not fight it.
- **Image hosting** — name-based fallback today, CDN `{{cardId}}.jpg`; size and
  licensing to be settled in ADR-004.
- **Mobile UI overload** — a full duel on a portrait phone is dense; Prompt
  Manager must keep one-focus-per-screen.

## Open questions

1. ADR-001: engine path (WASM ocgcore vs mini JS engine)?
2. ADR-002: license/IP position before any external code or data is touched?
3. `{{FIRST_DECK}}`: which archetype is deck #1?
4. Asset hosting: where do card images live at release scale (ADR-004)?
5. When does the {{MODE_DUEL_NAME}} flag turn on for end users (Gate C or D)?
6. Does the `board.json` XHR startup block the `file://` promise, and do we fix
   it in Tahap 0A?
