# ADR-002 — License and IP

- **Status:** proposed (owner decision only; blocks any AGPL code or data entering the repo)

## Context

The repository ships **no LICENSE file** (audit #18) — under GitHub's default
terms that means all rights reserved; nobody may legally reuse the code, and we
cannot add code with an incompatible license without consequences. Candidate
engine (ADR-001 option A) is **AGPL-3**: EDOPro/ocgcore, Project Ignis
CardScripts, WindBot (Ignite fork). Card names, texts, and artwork are
**Konami IP**; data comes from YGOPRODeck's API; images currently load from a
third-party CDN with a tiny local fallback. The upstream README asks for
attribution when modules are reused.

## Options

1. Keep repo license-less and avoid all AGPL code/data; attribute upstream.
2. Adopt AGPL dependencies (engine path A) and relicense/commit accordingly.
3. Pick an OSI license for our code now (MIT/Apache-2.0/GPL).

## Decision (proposed)

- **Do not merge any AGPL-licensed code, scripts, or data into this repo** for
  v1. WindBot is used as an *architecture pattern only* (never copied code).
  If ADR-001 lands on path A, this ADR must be re-approved first and the
  license question resolved by the owner.
- **Licensing the repo itself is explicitly the owner's decision** — not taken
  here (see NOTICE.md for attribution and third-party notes in the meantime).
- **Konami IP:** NOTICE.md carries a non-affiliation disclaimer; we self-host
  only card images actually used (ADR-004), never hotlink; no card art is
  committed to the repo.

## Consequences

- v1 stays clean-room: our own engine code (path B) or no ship.
- Attributions live in NOTICE.md and must be updated with every new vendored
  asset.
- If the owner later chooses path A, expect relicensing work and a hard fork of
  the project's distribution model.
