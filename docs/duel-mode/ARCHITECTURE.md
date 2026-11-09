# Architecture — {{MODE_DUEL_NAME}} (Duel Mode)

> Target architecture for the duel mode. Values come from `variables.md`.
> Status: draft for Gate A. Engine path depends on ADR-001.

## 1. System diagram

```
┌───────────────────────── Browser (static site, no build) ─────────────────────────┐
│                                                                                    │
│  UI LAYER                                                                          │
│  ┌──────────────────────┐          ┌────────────────────────────────────┐          │
│  │ {{MODE_FREE_NAME}}    │          │ {{MODE_DUEL_NAME}} UI              │          │
│  │ simulator.js,         │          │ (js/duel/ui)                        │          │
│  │ card_menu.js, …       │          │ mirror board · Prompt Manager ·     │          │
│  │ legacy direct-DOM     │          │ LP display · chain panel            │          │
│  └──────────┬───────────┘          └──────────────┬──────────────────────┘          │
│             │ unchanged (owns its DOM)            │ renders events only             │
│             ▼                                      ▼                                 │
│  legacy Board / PlayLog          GameState (js/duel/state) ── event bus             │
│  (v1 state, untouched)          pure data, no DOM, no timers, owner field 0/1      │
│                                                      │                             │
│                                                      │ structured postMessage     │
│                                                      ▼                             │
│                          DuelEngine interface (js/duel/engine/iface)              │
│                          init(opts) · start({decks, seed}) ·                       │
│                          onMessage(cb) · respond(resp) · destroy()                 │
│                                                      │                             │
│                                        ┌─────────────┴─────────────┐             │
│                                        │ Web Worker (js/duel/engine)│             │
│                                        │ rule engine + script loader │            │
│                                        │ + Bot (js/duel/bot)        │             │
│                                        └───────────────────────────┘             │
└────────────────────────────────────────────────────────────────────────────────────┘
     Offline data: data/ shards + manifest · IndexedDB cache · asset/card images
```

Key properties:

- **Two UIs, one page, one mode active at a time** (flag, see `variables.md` —
  off until Gate C). Free Mode code paths are not refactored.
- **GameState is pure** (ADR-003): JSON-serializable, no DOM, no `setTimeout`.
  Animation/queueing lives in the UI layer only.
- **The engine (and bot) never touch the DOM** (new rule 5) and run inside a
  Worker so the main thread never blocks.
- **Path A/B swap:** UI and bot depend only on normalized Prompts/Responses
  (see MESSAGE-MAP.md, created in Tahap 2B), never raw engine messages. This
  keeps ADR-001 option A or B swappable behind the same `DuelEngine` interface.

## 2. Message flow

```
UI ──start({decks, seed})──▶ Worker
UI ◀──event: prompt({type: 'selectCards'|'selectPlace'|'yesNo'|'option'|…})── Worker
UI ──respond(resp)──▶ Worker
UI ◀──event: state-diff / animation-hint / game-result── Worker
Bot (inside Worker) answers prompts for player 1 with the same respond() path.
```

Every prompt has a safe default (cancel/pass) so a crash or timeout can never
deadlock a duel.

## 3. Data schemas (v2, `js/duel/state`)

**Card (v2)** — extends today's minimal fields (id, name, text, image, type
flags; see ASSUMPTION-AUDIT.md #8):

```
{ cardId, name, description, imageURL,
  type: { monster|spell|trap, spellType?, trapType?,
          attribute?, race?, level?, atk?, def?, link?, linkMarkers?, scale? },
  archetype?, banlist? }
```

**Effect index** (path B, ADR-001): per-card JSON list of effects with a small
DSL: `{ trigger, condition, cost, actions[] }` — data only, interpreted by the
engine, never `eval`.

**GameState (v2)** — full serializable duel state:

```
{ version: '2.0', mode: 'duel', seed,
  players: [ { lp, deck[], hand[], extra[], field{mz[7], stz[5], fz}, gy[], banished[] } × 2 ],
  turn: { player, phase, count },
  chain: [], eventLog: [], decisionLog: [] }
```

**Replay** — minimal and deterministic:

```
{ version: '2.0', engine: {{ENGINE_PATH}}, decks: [deckA, deckB],
  seed, responses: [ {promptId, response} … ] }
```

Same seed + same decks + same responses ⇒ identical duel. Human or bot
responses are indistinguishable in the log.

## 4. Compatibility with the three legacy laws

| Legacy law | Status in Duel Mode |
|-----------|---------------------|
| 1. Log every state change to PlayLog | Stays **inside Free Mode**. Duel Mode has its own event log (`GameState.eventLog`); UI renders it. PlayLog/`board.writelog` is not called by duel code. |
| 2. Mutate via `board.updateItem()` | Stays **inside Free Mode** (note: real API is `board.writelog(action, id, data, oldData)` → `playlog.addStep`, see audit #3). Duel Mode mutates only `GameState` via engine actions. |
| 3. Keep `exportState()`/`importState()` in sync | Stays **inside Free Mode**; v1 import remains readable forever (tested). Duel Mode has separate v2 export/import. |

Free Mode and Duel Mode share only: card data (`data/`), images, css/theme.css
variables, and small pure utilities. No shared mutable state.

## 5. Folder plan

```
js/duel/{state,engine,bot,ui}/   new code (ES modules where possible)
tools/                            offline data pipeline (Node ≥ {{NODE_MIN}}, no npm)
tests/                            node --test, fixtures
data/                             card shards + manifest (versioned)
docs/duel-mode/                   all duel-mode docs
docs/adr/                         ADR-001…006
```

## 6. Risks carried into design

- `board.json` XHR at startup may already break `file://` for Free Mode (audit
  #20) — resolve in Tahap 0A before promising the `file://` constraint.
- Legacy 400 ms/`setTimeout` animation caused ghost cards (audit #14) — duel UI
  renders from events and must not reuse `Card.appendToBoard` timing.
- Card image fallback is name-based today (audit #9) — Tahap 1 migrates to
  cardId-based self-hosted images.
