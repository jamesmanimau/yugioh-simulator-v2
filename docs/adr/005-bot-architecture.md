# ADR-005 — Bot architecture (no AI)

- **Status:** accepted

## Context

The bot must be deterministic, offline, rule-following, and read only public
information (new rule 5). No LLM/ML/external APIs allowed. WindBot (C#,
AGPL) is the reference *pattern* — never copied code (ADR-002).

## Options

1. Monolithic decision function per prompt.
2. WindBot-style layered executor: legal-action list from engine → per-deck
   `Executor` (prioritized rules) → `DefaultExecutor` for staples →
   selectors for target/material/position/zone → battle module → chain
   responder, with a safe fallback (pass/cancel).

## Decision

**Option 2**, implemented in plain JS inside the Worker (`js/duel/bot`):

- Rules are data: `{ id, cardType, condition, choice, reason }`, evaluated in
  priority order.
- Unknown cards are **never** activated proactively.
- Only public information is read (no opponent hand, no face-down identity);
  enforced by giving the bot a redacted view, not by convention.
- RNG is seeded (same seed ⇒ same decision log); every decision appends
  `{ rule, candidates, choice, reason }` to the decision log.
- Levels {{BOT_LEVELS}} = subsets of rules enabled; **no lookahead in v1**.
- The bot consumes only normalized Prompt/Response objects — never raw engine
  messages and never the DOM.

## Consequences

- Behavior is auditable and replayable from the decision log.
- Per-deck logic stays optional; `DefaultExecutor` alone must beat a random bot
  in ≥ {{BOT_MIN_WINRATE}} of 200 seeded duels (Gate C) with median decision
  ≤ {{BOT_DECISION_MS}} ms.
- Adding a deck = writing an `Executor` + fixture tests, not touching the core.
- Rule subsets per level must be explicitly listed (no hidden heuristics).
