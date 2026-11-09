# QA Checklist — Free Mode Regression (Mode Bebas)

> Run this after every change that touches UI, engine, platform, or data —
> until a duel-mode checklist exists, this is the whole manual suite (ADR-006).
> Environment: desktop Chromium + a real phone (or narrow window + touch
> emulation). Serve with `python3 -m http.server 8000` (or open `index.html`
> directly — but see the `file://` open question, MEMORY.md).
> Mark each item PASS/FAIL with the build (commit hash). Report failures as
> they are; never mark untested items.

## Setup

- [ ] Page loads with the sample deck from `board.json` visible on the board
- [ ] No console errors on load (F12 → Console)

## Core actions

- [ ] **Draw:** Deal button moves the top deck card to hand; deck count badge decrements
- [ ] **Summon:** hand card menu → "SS ATK" places it in a monster zone, attack position
- [ ] **Set:** hand card menu → Set places a monster face-down defense in a monster zone
- [ ] **Flip:** face-down card menu → flip turns it face-up (animation plays)
- [ ] **Position switch:** ATK ↔ DEF rotates the card 90°
- [ ] **Move:** card menu → Move relocates it to a free zone; moving to a full zone is refused
- [ ] **To GY / Banish:** card lands in the collection; the View dialog lists it

## Xyz overlay

- [ ] Overlay: select Xyz + material → material stacks beneath the Xyz monster in the slot
- [ ] Overlay count/order survives an **export → import** round-trip
  (`isOverlap`/`isOverlay`/`overlap_order` restored)
- [ ] Detach: one material leaves to the graveyard; last detach clears the overlay state

## Record / replay / log

- [ ] Start Record → do 3+ varied actions → Stop Record
- [ ] Replay reproduces every step in order, ending on the same board
- [ ] Pause + Resume works mid-replay
- [ ] Log panel shows one readable line per action (no HTML escaping artifacts)
- [ ] Chat message appears in the log and is HTML-escaped (try `<b>x</b>`)

## Export / import (v1 law)

- [ ] `board.exportState('json')` in console → copy the string
- [ ] `board.importState(<pasted>)` restores the exact board (cards, folds, phase, overlay)
- [ ] An export produced **before** any duel-mode work still imports (kept fixture)

## Touch (phone / emulation)

- [ ] Drag hand card → deck/summon/GY works with touch
- [ ] Hover menus open on first tap (touch), don't require hover
- [ ] No phantom/ghost cards appear after fast repeated drags (audit #14 guard)
- [ ] Layout usable in portrait ~360 px wide

## After the run

- [ ] Update `docs/duel-mode/MEMORY.md` (verified lessons / open items)
- [ ] Attach the PASS/FAIL list to the step report
