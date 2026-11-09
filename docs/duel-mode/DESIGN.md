# Design — {{MODE_DUEL_NAME}} UI/UX

> Draft for Gate A. Colors/typography reuse `css/theme.css` variables only.
> Mobile portrait is the primary layout; desktop is the secondary.

## 1. Layout: mirror board

- One board, two halves. Opponent's field is rendered **rotated 180°** above
  the player's field, like a real table; a **flip button** (⇅) swaps which
  side sits at the bottom for one-handed play on phones.
- Zones per side: monster (5) + spell/trap (5) + field (1) + deck, extra deck,
  graveyard, banish. **EMZ (extra monster zones, `exss1`/`exss2` — markup
  already exists) are shared** between players, drawn between the two halves.
- **Opponent hand is hidden**: card backs with a count badge; tapping the hand
  fan does nothing (no reveal leak through hover/info panel).
- **LP counters** per player, top corners; damage animates the number
  (CSS only).
- **Chain panel**: a collapsible strip listing the current chain (newest
  first) with card thumbnails; the active chain link is highlighted.
- Phase indicator and turn owner are always visible in the top bar.

## 2. Prompt Manager

One modal-ish overlay at a time — never more than one question on screen.

- Prompt types: `selectCards` (1..N, with confirm), `selectPlace` (zone grid),
  `selectPosition` (attack/defense/face-down), `yesNo`, `option` (list),
  `chain` (respond or pass), plus `idle` ("your turn" bar with End Phase
  button).
- Every prompt has a visible **Cancel/Pass** that resolves to the safe
  default the engine defines — no prompt can be unanswerable.
- Touch targets ≥ 48×48 px; card thumbnails in prompts are ≥ 96 px wide.
- Prompt shows *why* when known (e.g., "Select material for Xyz Summon").
- Bot prompts for player 1 are answered without UI; the UI may show a
  "bot thinking" shimmer capped at the actual decision time.

## 3. Portrait phone layout

- Vertical stack: opponent info (LP, hand count) → opponent field → EMZ row →
  player field → hand fan (scrollable, horizontally draggable) → prompt/turn
  bar at the bottom, always reachable by thumb.
- The log panel is a slide-in drawer (button in top bar), not a column.
- Cards scale via the existing `--slot-size` variable; text never below 12 px.
- Flip button swaps top/bottom orientation.

## 4. Accessibility basics

- `prefers-reduced-motion`: skip move animations and lightbox effects; render
  instantly (the engine already emits final state in the event).
- All controls keyboard-focusable; prompt actions are real `<button>`s.
- `aria-live="polite"` on the log drawer and prompt title.
- Color contrast ≥ 4.5:1 using theme.css variables; state is never color-only
  (face-down shows the card back, defense is rotated + labeled).

## 5. Theming

- No hard-coded colors in duel UI: everything reads `css/theme.css` variables
  (existing `--` custom properties), so all legacy themes apply for free.
- New variables, if needed, are added to `css/theme.css` (and the SCSS source
  rule from MIGRATION.md: edit both `simulator.css`/`simulator.scss` if duel
  styles land there — prefer a separate `css/duel.css`).

## 6. Out of scope for v1 UI

- 3D/parallax boards, sound design beyond existing `sound/` assets,
  spectating, chat.
- Any Free Mode visual change.
