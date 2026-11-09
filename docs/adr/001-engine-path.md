# ADR-001 — Duel engine path

- **Status:** proposed (owner decision only; do not implement either path before approval; spike happens first — Gate B)

## Context

{{MODE_DUEL_NAME}} needs rule enforcement and card effects. Two realistic
paths exist. Hard constraints: static site, first load ≤
{{BUDGET_FIRST_LOAD_MB}} MB compressed, first prompt ≤ {{BUDGET_TTFP_SEC}} s on
a mid-range phone, no npm/bundler, bot must be deterministic and read only
public information.

## Options

**A — ocgcore (EDOPro core) compiled to WebAssembly + Project Ignis Lua card
scripts** (prebuilt artifacts only; never compiled on-device).

- Accuracy: full official rules; huge card coverage.
- License: **AGPL-3** — blocked until ADR-002 is approved by the owner.
- Browser: async variants need **JSPI** (not universal; iOS/Safari risk).
- Size: MBs of WASM + thousands of Lua scripts; likely breaches the first-load
  budget without lazy loading by archetype.
- Complexity: message protocol is battle-tested but opaque; normalized
  Prompt/Response layer still required (MESSAGE-MAP.md).

**B — mini JS engine + small effect DSL for 1–2 archetypes** (written in-repo,
data-driven effects, no `eval`).

- Accuracy: only what we implement, per supported card ({{FIRST_DECK}} +
  staples).
- License: ours, no AGPL contamination.
- Browser: plain JS in a Worker; no JSPI, no WASM.
- Size: tens of KB.
- Complexity: we own the rules code forever; risk of rule bugs is on us.

## Decision

**Proposal: B as the default v1 path; run the Tahap 2A spike with A's prebuilt
artifacts anyway** to measure download size, time-to-first-prompt, JSPI need,
and memory. Decide finally at Gate B with real numbers. Rationale: A fails two
hard gates today (AGPL license, JSPI/budget risk), while B fits every stated
constraint if we accept a narrow card pool.

## Consequences

- If B: card coverage is deliberately small and grows per archetype; the
  effect DSL must stay data-only; every added card needs a fixture test.
- If A (post-spike, post-ADR-002): repository licensing must change; JSPI-less
  browsers need a fallback or are unsupported.
- Either way the `DuelEngine` interface and Prompt/Response normalization stay
  identical, so the choice does not leak into UI or bot code.
