# ADR-003 — GameState separated from the DOM

- **Status:** accepted

## Context

The legacy stack merges state and DOM: `Card` objects own their HTML, moves
animate via `setTimeout` (400 ms), and the board can carry two sources of
truth (the ghost-card bug, audit #14). A duel against a bot needs: hidden
information (opponent hand), determinism (same seed ⇒ same duel), replay from
responses, and Node-testable rules without a browser.

## Options

1. Extend the legacy `Board`/`Card` classes with an opponent side.
2. New pure `GameState` (JSON-serializable, no DOM, no timers) with a separate
   rendering layer fed by events.

## Decision

**Option 2.** `js/duel/state` holds the only source of truth for
{{MODE_DUEL_NAME}} (new rule 4): players (LP, zones, owner 0/1), turn/phase,
chain, event log. The UI layer (`js/duel/ui`) renders normalized events and
owns all animation/timing. The engine mutates state only through engine
actions. Free Mode keeps its legacy DOM-owning classes untouched.

## Consequences

- Rules, bot, and replay are testable in Node with no browser.
- Two rendering models coexist (legacy vs event-driven); duel UI must never
  reuse `Card.appendToBoard`/`moveTo` timing.
- All duel payloads must be structured-clone-safe (no functions/DOM refs) to
  cross the Worker boundary.
- State schema is versioned (`2.0`) with a v1→v2 migration for any shared data.
