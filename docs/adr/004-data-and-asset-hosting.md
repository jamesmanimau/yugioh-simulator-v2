# ADR-004 — Card data and asset hosting

- **Status:** accepted for data pipeline; image hosting proposal pending owner sign-off

## Context

{{MODE_DUEL_NAME}} needs card metadata (stats, types, archetype, banlist) the
legacy board never stored. YGOPRODeck API v7 allows 20 req/s (we cap at
{{API_RATE_MAX}}) and forbids image hotlinking. Today images load from a
third-party CDN keyed by cardId, with a **name-based** local fallback (audit
#9) and only 8 local images. Free Mode must stay light; the first-load budget
is {{BUDGET_FIRST_LOAD_MB}} MB compressed.

## Options

1. Ship the full YGOPRODeck database + all images in-repo.
2. Offline pipeline → sharded JSON + versioned manifest; images only for cards
   actually used, fetched on demand and cached.
3. Hotlink images (forbidden by YGOPRODeck terms — rejected outright).

## Decision

**Option 2.** `tools/` (Node ≥ {{NODE_MIN}}, no npm packages) pulls YGOPRODeck
v7 idempotently and resumable, producing versioned shards + a manifest (source
version + hash) in `data/`. Cards used by {{FIRST_DECK}} and staples get
self-hosted images under `asset/card/{cardId}.jpeg` (cardId-keyed, replacing
the name-keyed fallback for duel mode). Everything else loads on demand into
IndexedDB with a card-back placeholder when offline. Runtime never calls
YGOPRODeck; images are never hotlinked.

## Consequences

- Repo stays small; used-cards-only self-hosting bounds the size.
- Name-keyed fallback images for Free Mode must keep working during migration
  (Tahap 1 handles both lookups).
- Manifest hash lets tests detect stale/corrupt shards.
- Total hosting size for the "used cards" set must be measured before Gate C
  and reported against the budget.
