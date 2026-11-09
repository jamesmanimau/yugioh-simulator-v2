# YuGi-Oh! Simulator — Architecture & Code Guide

> Authoritative reference for how the simulator works. Read this before touching any core file.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [File Map](#file-map)
3. [Script Load Order](#script-load-order)
4. [Core Classes](#core-classes)
   - [PlayLog](#1-playlog)
   - [Card](#2-card)
   - [Collection](#3-collection)
   - [Board](#4-board)
5. [Game Positions & Zones](#game-positions--zones)
6. [Card States](#card-states)
7. [Xyz Overlay Mechanics](#xyz-overlay-mechanics)
8. [Phase System](#phase-system)
9. [Replay System](#replay-system)
10. [State Export / Import](#state-export--import)
11. [Context Menu System](#context-menu-system)
12. [Animation System](#animation-system)
13. [DOM Structure](#dom-structure)
14. [Event Flow Diagrams](#event-flow-diagrams)
15. [External Dependencies](#external-dependencies)
16. [Development Notes](#development-notes)

---

## Project Overview

A standalone, browser-based YuGi-Oh! card game simulator. No build step, no server required — open `index.html` directly.

**Purpose:** Visual tool for recording combos, creating tournament coverage demos, and sharing board states. It does **not** enforce card legality or game rules.

**Tech stack:** HTML5 + CSS3 + Vanilla JS + jQuery 3.7.1 + jQuery UI 1.12.1

---

## File Map

```
yugioh-simulator/
├── index.html              ← Board HTML structure (374 lines)
├── js/
│   ├── simulator.js        ← Core classes: PlayLog, Card, Collection, Board (2,854 lines)
│   ├── card_menu.js        ← Context menus: MenuBase, CardMenu, CollectionMenu (930 lines)
│   ├── main.js             ← DOM ready + Board initialization (65 lines)
│   ├── Function.js         ← Utility functions: clipboard, localStorage, toasts (449 lines)
│   ├── theme.js            ← Runtime theme switching (1,754 lines)
│   ├── example.js          ← DEAD legacy data: single-line JSON, loaded nowhere (see docs/duel-mode/ASSUMPTION-AUDIT.md #15)
│   ├── lib/state-guards.js ← Pure escapeHtml + importState validation (Node-testable)
│   └── board-state.js      ← Generated from board.json (tools/sync-board-state.js); board boots on file://
├── tools/                  ← Node scripts (no npm): sync-board-state.js, future data pipeline
├── tests/                  ← node --test suites (no npm, ADR-006)
├── css/
│   ├── simulator.css       ← Game board and card layout
│   ├── theme.css           ← CSS variables for color theming
│   ├── app.css             ← Application chrome layout
│   └── tournamentStyle.css ← Tournament overlay styles
├── asset/
│   ├── back_card.png       ← Card back image
│   ├── coin.png            ← Coin flip asset
│   ├── dice*.png           ← Dice assets
│   └── icon/               ← UI icons
└── sound/                  ← Phase/declare sound effects
```

---

## Script Load Order

`index.html` loads scripts in this exact sequence:

```
1. jQuery 3.2.1
2. jQuery UI 1.12.1
3. jQuery UI Touch Punch  ← enables mobile drag-drop
4. card_menu.js           ← MenuBase, CardMenu, CollectionMenu
5. simulator.js           ← PlayLog, Card, Collection, Board
6. main.js                ← instantiates Board, wires up events
7. Function.js            ← utility functions (clipboard, localStorage)
```

`card_menu.js` must load before `simulator.js` because `Board` references `CardMenu`.

---

## Core Classes

### 1. PlayLog

**File:** `js/simulator.js` — top of file (Line ~6)

Records every game action as a step and replays them in order.

```javascript
// Internal state
{
  initItems: Card[],      // board snapshot at time recording started
  steps: Step[],          // ordered list of recorded actions
  isPausing: false,       // replay is paused mid-playback
  isRePlaying: false,     // replay is currently running
  isStarted: false,       // recording has started
  pointer: 0              // index of next step to replay
}

// Step shape
{
  action: ActionType,     // see Action Types below
  uuid: string,           // which card this affects
  data: object,           // new state values
  oldData: object,        // previous state values (for undo potential)
  message: string,        // HTML log message shown to user
  isLastStep: boolean
}
```

**Action Types:**

| Action | Trigger |
|--------|---------|
| `update` | Any card property change (position, foldState, switchState) |
| `overlay` | Xyz material attached |
| `detach` | Xyz material removed |
| `target` | Card targeted |
| `declare` | Card declared |
| `reveal` | Card revealed from collection |
| `shuffle` | Generic shuffle |
| `shuffle_deck` | Deck shuffled |
| `update-phase` | Phase changed |
| `active-skill` | Player skill activated |
| `chat` | Player typed a message |
| `startRecord` / `stopRecord` | Recording markers |

**Key methods:**
- `writelog(step)` — appends step to `steps[]`
- `replay()` — resets pointer, calls `playStep()` in loop
- `playStep(step)` — applies one step's changes to the board
- `pause()` / `resume()` — toggle `isPausing`
- `stop()` — resets replay state

---

### 2. Card

**File:** `js/simulator.js` — Line ~560

Represents a single card. Each card manages its own DOM element and animations.

#### Full Property Reference

| Property | Type | Values | Meaning |
|----------|------|--------|---------|
| `cardId` | Number | e.g. `48130397` | Card database ID |
| `uuid` | String | custom (not RFC-4122) | Unique instance ID; template `'xyxy-xxyy-0510-xyyy-xxxx'` |
| `name` | String | card name | Display name |
| `position` | String | see Positions | Current zone |
| `foldState` | String | `normal`, `fold` | Face-up / face-down |
| `switchState` | String | `attack`, `defense` | Battle position |
| `collection_order` | Number or String | `"ss3"` / `7` | Slot token in individual zones; numeric index in collections |
| `isSpell` | Boolean | | Is a spell card |
| `isTrap` | Boolean | | Is a trap card |
| `isMonster` | Boolean | | Is a monster card |
| `isST` | Boolean | | Is spell or trap (either) |
| `isExtra` | Boolean | | Belongs to extra deck |
| `imageURL` | String | URL or `''` | Card art source |
| `description` | String | card text | Shown in info panel |
| `isOverlap` | Boolean | | True if this card IS an Xyz material (beneath) |
| `isOverlay` | Boolean | | True if this card IS the Xyz monster carrying materials (on top) |
| `overlap_order` | Number | 0, 1, 2, 3… | Stacking position: materials `1..N`, the Xyz monster gets `max + 1` |

#### Lifecycle: `moveTo(newPosition, isTop, order, fireEvent)`

```
1. beforeMove()           ← store old position/state
2. canMoveTo(newPos)      ← validate; return false to abort
3. startMoveAnimation()   ← clone card at current screen coords
4. Update card.position, card.collection_order
5. moveAnimation()        ← animate clone from old → new coords (400ms)
6. appendToBoard()        ← insert DOM element into new slot
7. afterMove()            ← writelog() + redraw source collection
8. setTimeout(~405ms)     ← finish animation; calls appendToBoard() AGAIN
```

`appendToBoard()` runs once synchronously (step 6) and once in the deferred
animation-finish callback (step 8). It guards against stale cards —
`if (board.getItemById(card.uuid) !== card) return false;` — so a `Card` from a
discarded board build (e.g. the constructor's opening-hand draw, torn down by a
following `importState()`) cannot re-insert orphan DOM when its deferred callback
fires after the rebuild. See [Context Menu System](#context-menu-system).

#### Card Action Methods

| Method | Visual Effect | Logged |
|--------|--------------|--------|
| `fold(state, anim, dur)` | Flip animation | Yes |
| `attack()` | Set attack stance | Yes |
| `defense()` | Rotate 90° to defense | Yes |
| `target()` | Target animation | Yes |
| `declare()` | Declare animation | Yes |
| `reveal()` | Reveal animation | Yes |

#### Validation Gates

- `canMoveTo(position)` — prevents illegal moves
- `canFlip(state)` — prevents invalid fold transitions
- `canSwitch(state)` — prevents invalid stance transitions

---

### 3. Collection

**File:** `js/simulator.js` — Line ~1287

Manages stacked zones where cards pile up. Used for: `deck`, `exdeck`, `graveyard`, `banish`.

```javascript
// Collections are passed a position string and a reference to board
const graveyard = new Collection('graveyard', board);

// Key methods
collection.getCards()               // returns Card[] filtered from board.items
collection.getTopCard()             // returns highest collection_order card
collection.appendCard(card, reDraw) // add card; reDraw repaints stack
collection.shuffleCollectionCards() // Fisher-Yates shuffle + renumber orders
collection.drawOnBoard()            // re-renders stack visual (count badge)
collection.showDialog()             // opens browsable card list modal
```

---

### 4. Board

**File:** `js/simulator.js` — Line ~1472

Singleton. Central game controller — holds all state, delegates to Card and Collection.

```javascript
// Instantiated in main.js
const board = new Board({
  backImageSrc: 'asset/back_card.png',
  imgPath: 'asset/',
  cardUUIdkey: 'uuid',
  defaultPhase: 'm1',
  player: 'Player',
  skill: ''
});
```

#### Key State Properties

| Property | Type | Meaning |
|----------|------|---------|
| `items` | `Card[]` | All cards currently on the board |
| `currentPhase` | String | Active phase abbreviation |
| `phases` | Object | Phase abbreviation → display name map |
| `deck` | `Collection` | Main deck |
| `exdeck` | `Collection` | Extra deck |
| `graveyard` | `Collection` | Graveyard |
| `banish` | `Collection` | Banished zone |
| `playlog` | `PlayLog` | Recording/replay instance |
| `skill` | Object | `{name, activated}` |

#### Critical Board Methods

```javascript
board.addItem(item, order)
// Adds a Card to board.items[]. Sets uuid if missing. Calls card.drawHtml().

board.updateItem(uuid, key, value)
// Mutates a card property. ALWAYS use this instead of direct mutation.
// Triggers card.updateHtml() to sync visual.

board.moveTo(newPosition, isTop, order, fireEvent)
// Delegates to the focused card's moveTo(). Used by menu actions.

board.setPhase(phase)
// Changes currentPhase, highlights button, plays sound, shows announcement.

board.getItemsByPosition(position)
// Returns board.items filtered to a specific zone.

board.overlayCard(uuid, new_order)
// Xyz summon: attaches materials to Xyz monster (see Xyz section).

board.detachOverlay(uuid)
// Removes one Xyz material and sends it to graveyard.

board.deckToHand(count, from)
// Draws N cards from deck (or 'exdeck') to hand.

board.emptyBoard()
// Removes ALL cards from board.items[] and from DOM. Used before import/replay.

board.exportState(type)
// Returns current full board state as object ('array') or JSON string ('json').

board.importState(state)
// Clears board, parses state, restores all cards, phase, skill, playlog.
```

---

## Game Positions & Zones

| Position Key | Zone | Count | Notes |
|-------------|------|-------|-------|
| `hand` | Player hand | Unlimited | Displayed at bottom |
| `deck` | Main deck | Unlimited | Collection (stacked) |
| `exdeck` | Extra deck | Unlimited | Collection (stacked) |
| `summon` | Monster zones | 5 slots | `collection_order` = slot token `ss1`–`ss5` (+ `exss1`/`exss2`) |
| `st` | Spell/trap zones | 5 slots | `collection_order` = slot token `st1`–`st5` |
| `fz` | Field zone | 1 slot | |
| `graveyard` | Graveyard | Unlimited | Collection (stacked) |
| `banish` | Banished zone | Unlimited | Collection (stacked) |

**Individual zones** (`summon`, `st`, `fz`) display each card in its own numbered slot.  
**Collection zones** (`deck`, `exdeck`, `graveyard`, `banish`) show only the top card + a count badge.

---

## Card States

### Fold State (visibility)

| `foldState` | CSS Class | Meaning |
|-------------|-----------|---------|
| `normal` | `.normal` | Face-up (card art visible) |
| `fold` | `.fold` | Face-down (card back shown) |

### Switch State (battle position)

| `switchState` | CSS Class | Visual |
|---------------|-----------|--------|
| `attack` | `.attack` | Upright |
| `defense` | `.defense` | Rotated 90° |

> The card element itself is `.simulator-card` (not `.card-item`); position adds a bare class like `.summon`/`.hand`, and Xyz cards add `.overlap` (material) / `.overlay` (monster). No `.fold-state-*`/`.switch-state-*`/`.position-*` classes exist.

---

## Xyz Overlay Mechanics

The most complex mechanic. An Xyz monster in the `summon` zone can have "material" cards stacked beneath it.

### How It Works

```
Before overlay:
  summon slot 2: [Monster A]

Player selects Monster A + Material B, triggers Overlay:

board.overlayCard(uuid_A, 2)
  → Move Monster A and Material B to slot 2
  → Monster A:   isOverlay = true  (it is the Xyz monster carrying materials), overlap_order = max+1
  → Material B:  isOverlap = true  (it is a material), overlap_order = 1
  → DOM slot 2 gets class .overlay-slot

After overlay:
  summon slot 2: [Monster A (top)] ← [Material B (hidden beneath)]
```

### Detach Flow

```
board.detachOverlay(uuid_material)
  → Move material to graveyard
  → Decrement overlap_order of remaining materials
  → If no materials left: Monster A.isOverlay = false
```

### State Properties

| Property | On main Xyz card (on top) | On material card (beneath) |
|----------|:-------------------------:|:--------------------------:|
| `isOverlap` | `false` | `true` |
| `isOverlay` | `true` | `false` |
| `overlap_order` | `max + 1` (highest) | `1`, `2`, `3`… |

> Verified: **`isOverlap === true` is a MATERIAL**; **`isOverlay === true` is the XYZ MONSTER** carrying materials (the flag names read backwards from intuition). Set by `setDataOverlap`/`setDataOverlay` in `simulator.js`.

---

## Phase System

```javascript
board.phases = {
  dp: 'Draw Phase',
  sp: 'Stand By',
  m1: 'Main Phase 1',
  bp: 'Battle Phase',
  m2: 'Main Phase 2',
  ep: 'End Phase'
}
```

`board.setPhase('bp')`:
1. Sets `board.currentPhase = 'bp'`
2. Highlights the BP button in the UI
3. Plays a sound from `sound/`
4. Shows full-screen phase announcement for ~1 second
5. Writes `update-phase` step to PlayLog

---

## Replay System

### Recording

1. User clicks "Start Record"
2. `board.exportState('array')` snapshots all current cards → `playlog.initItems`
3. Every subsequent action calls `playlog.writelog(step)`
4. User clicks "Stop Record"

### Playback

```
board.playlog.replay()
  → board.emptyBoard()              ← clear current state
  → load playlog.initItems          ← restore starting cards
  → pointer = 0
  → loop: playStep(steps[pointer++])
       ← apply action from step.data
       ← wait 1500ms
       ← update pointer
  → when pointer >= steps.length: done
```

### Pause / Resume

`isPausing` flag stops the `playStep` loop. On resume, loop continues from current `pointer`.

### Replay Invariant

**Every user action that changes game state must call `playlog.writelog()`** — if an action is skipped, replay will desync from the original sequence.

---

## State Export / Import

### Export

```javascript
const state = board.exportState('json');
// Returns JSON string:
{
  dateCreate: "2024-07-13T08:21:18.151Z",
  version: "1.0",
  currentPhase: "m1",
  skill: { name: "", activated: false },
  items: [ ...Card objects... ],
  playLogData: {
    initItems: [ ...Card objects... ],
    steps: [ ...Step objects... ],
    isPausing: false,
    isRePlaying: false,
    isStarted: false,
    pointer: 0
  }
}
```

### Import

```javascript
board.importState(jsonStringOrObject)
// 0. StateGuards.validateBoardState() gate: size (<=10MB), item count (<=2000),
//    required fields + enum checks (position/foldState/switchState). Throws on violation.
// 1. board.emptyBoard()
// 2. Parse JSON if string
// 3. Validate items[]
// 4. Re-create all Card instances
// 5. Restore phase, skill
// 6. Restore playLogData
```

**Critical:** All Card properties — including `isOverlay`, `isOverlap`, `overlap_order` — must be preserved in export and restored in import.

---

## Context Menu System

**File:** `js/card_menu.js` — Three classes: `MenuBase`, `CardMenu`, `CollectionMenu`

### Hover Events (Delegated)

Card hover menus use **event delegation** (`Board.cardHoverEvents()` in `simulator.js`). A single `mouseenter`/`mouseleave` listener (namespaced `.cardHover`) matches `.simulator-card` descendants and looks up the `Card` instance by `data-id`. This ensures every card gets a hover menu regardless of how it entered the DOM (initial load, `importState`, replay, `deckToHand`, context-menu moves).

The delegation is bound to **`board.elm` *and* the four collection "View" dialogs** (`#deckmenu`, `#extradeckmenu`, `#graveyardmenu`, `#banishmenu`). This matters: jQuery UI `.dialog()` defaults to `appendTo: 'body'`, so when a collection dialog opens it (and the `.simulator-card`s inside its `.collection-container`) is **relocated under `<body>`, outside `board.elm`**. A board-only listener never sees those cards, so hovering a card in a View popup would show no menu. Binding the same delegation to each dialog element (which still holds its cards after the move) fixes it. Handlers are `.off()`'d (by the `.cardHover` namespace) before re-binding so re-constructing the `Board` (import/replay) rebinds cleanly instead of stacking duplicates.

Because the menu list is chosen from the resolved card's `position`, any **stale** `.simulator-card` left in the DOM (whose `data-id` resolves to a *different* live card) shows the wrong menu. This happened on startup: `new Board(state.items)` draws an opening hand (`deckToHand(5)`) whose `moveTo` animations finish on a `setTimeout`; those deferred `appendToBoard()` calls fired *after* `importState()` rebuilt the board, leaving phantom hand cards that resolved to the rebuilt **deck** card (deck menu). The fix: `appendToBoard()` bails when `board.getItemById(card.uuid) !== card`, so a discarded build's leftover cards can't re-inject DOM. See the import flow below and `core-classes.md`.

For hand cards, the dialog width is constrained to match the card width (preventing the menu from overlapping adjacent overlapping cards). For other zones the dialog uses the full ST-slot width.

`CardMenu.renderMenu(card)` generates HTML based on `card.position` and `card.foldState`. Each menu item has a `data-target` attribute:

```html
<a data-target="summon,attack,normal">SS ATK</a>
```

Parsed as: `[destination_position, switchState, foldState]`

### Menus by Position

| Position | Available Actions |
|----------|-----------------|
| `hand` | Reveal, Declare, Target, To Deck, To Summon, Set, Activate |
| `summon` | Declare, Target, Move, Overlay, Detach, ATK↔DEF, To Hand, To GY, To Banish |
| `st` | Declare, Move, Flip, Activate, Detach |
| `graveyard` (dialog) | To Hand, To Summon, To Banish, Declare, Target |
| `banish` (dialog) | To Hand, To Summon, Declare, Target |
| `exdeck` (dialog) | To Summon, To Banish, Reveal |

---

## Animation System

### Card Movement (400ms)

```
startMoveAnimation()
  → capture current screen coordinates via getBoundingClientRect()
  → clone card element
  → position clone absolutely at captured coords
  → append clone to document.body

moveAnimation(clone)
  → calculate destination coords
  → jQuery .animate() clone from old → new position (400ms)
  → on complete: remove clone, card is already in new DOM slot
```

### Effect Animations (target / declare / reveal)

Uses Animate.css class injection:

```javascript
doAnimation('target')
  → add '.animate__animated .animate__flash' to card element
  → remove classes after animation completes
```

### Phase Announcement

```
setPhase(phase)
  → create overlay element with phase name
  → CSS: position fixed, full screen, large text
  → animate in with zoom effect
  → display for 1000ms
  → fade out and remove
```

---

## DOM Structure

```html
body
└── .play-board-container
    ├── #playtest.play-board > #game-board.game-board
    │   ├── .game-resource.hidden        ← <audio> sound effects (declare/reveal/target/phase)
    │   ├── .row.actions                 ← #new button, coin/dice tools
    │   ├── .card-slot-row > .phase-container
    │   │       └── input.phase-btn[value="dp|sp|m1|bp|m2|ep"] × 6   ← phase key is the `value`
    │   ├── .card-slot-row               ← extra monster zones + banish:
    │   │       .summon-slot.summonex-slot[data-order="exss1"|"exss2"], #banish-slot.card-collection-slot
    │   ├── #field.card-slot-row         ← field + main monster zones + graveyard:
    │   │       .fz-slot[data-order="fz1"], .summon-slot[data-order="ss1".."ss5"], #graveyard-slot.card-collection-slot
    │   ├── .card-slot-row               ← extra deck + S/T zones + deck:
    │   │       #extra-deck-slot.card-collection-slot, .st-slot[data-order="st1".."st5"], #deck-slot.card-collection-slot
    │   └── #hand > .hand-board#hand-board   ← hand cards (each wrapped in .hand-card-container)
    ├── aside.play-board-side > .log-message-container   ← record/replay controls, #log-message, chat
    ├── aside.play-board-side.lcard-informations         ← card info panel (hover)
    └── #cardMenu / #collectionMenu / #deckmenu / #extradeckmenu / #graveyardmenu / #banishmenu
```

Each card's DOM element (`<div class="simulator-card card-id-{uuid}" ...>` — NOT `.card-item`) is inserted into the appropriate slot by `card.appendToBoard()`; individual-zone slots are matched via `.card-slot[data-order="<collection_order>"]`.

---

## Event Flow Diagrams

### Draw Card

```
User clicks "Draw" button
  → board.deckToHand(1, 'deck')
    → deck.getTopCard() → card
    → card.moveTo('hand', false, null, true)
      → canMoveTo('hand') ✓
      → startMoveAnimation()
      → card.position = 'hand'
      → moveAnimation() [400ms]
      → appendToBoard() → inserts into #hand-board
      → afterMove() → writelog({action:'update', ...}) + deck.drawOnBoard()
```

### Summon Monster

```
User right-clicks hand card → context menu appears
User selects "SS ATK"
  → CardMenu action handler
  → card.moveTo('summon', false, selectedSlot, true)
    → card.switchState = 'attack'
    → card.foldState = 'normal'
    → [move lifecycle as above]
    → appendToBoard() → inserts into .summon-slot[data-order=selectedSlot]
```

### Xyz Overlay

```
User right-clicks Xyz monster → selects "Overlay"
  → prompt: select material cards
  → prompt: select destination slot
  → board.overlayCard(xyz_uuid, target_order)
    → update all material cards: isOverlap=true, overlap_order=N
    → update Xyz card: isOverlay=true
    → move all to target slot (collection_order = target_order)
    → DOM slot gets .overlay-slot class
    → writelog steps for each card moved
```

---

## External Dependencies

| Library | Version | Purpose | Load Location |
|---------|---------|---------|--------------|
| jQuery | 3.7.1 | DOM, events, animation | `js/jquery.min.js` (self-hosted) |
| jQuery UI | 1.12.1 | Drag-drop, dialogs | `js/jquery-ui.min.js` (self-hosted) |
| jQuery UI Touch Punch | 0.2.3 | Mobile touch drag | `js/jquery.ui.touch-punch.min.js` (self-hosted) |
| Bootstrap | 5 | Grid layout (CSS only) | `vendor/` (self-hosted) |
| Font Awesome | Pro 5.10 | Icons | `css/fontawesome.css` + `webfonts/` (self-hosted; see NOTICE.md re: Pro license) |
| Animate.css | 4.1.1 | Card effect animations | `css/animate.min.css` (self-hosted) |
| SweetAlert2 | 11.26.25 | Toast notifications | `vendor/sweetalert2/` (pinned, self-hosted) |
| Iconify | 1.0.7 (v2 lib) | Icon library | `js/iconify.min.js` (self-hosted) |
| Google Fonts (Poppins/Rubik) | latest | Typography | CDN — **documented exception**, deferred to Tahap 5 PWA work |

Card images load from external CDN: `ygovietnamcdn.azureedge.net` (cardId-keyed `.jpg`)  
Local fallback: `asset/card/{card name}.jpeg` — **name-keyed**, not cardId (audit #9), only 8 files present.

---

## Development Notes

### Rule: Always Log to PlayLog

Any function that changes game state must call `board.playlog.writelog(step)`. Missing logs cause replay desync.

### Rule: Use `board.updateItem()` for Mutations

Never directly mutate `card.someProperty`. Always go through `board.updateItem(uuid, key, value)` — it triggers `card.updateHtml()` to keep the DOM in sync.

### Rule: Keep `exportState` / `importState` in Sync

Adding a new card property? Update both `exportState()` (to serialize it) and `importState()` (to restore it). Otherwise imported/replayed states will be missing the field.

### Rule: `collection_order` = slot token for individual zones

For `summon`, `st`, and `fz`, `collection_order` is the target slot's `data-order` **token string** (`ss1`–`ss5`, `exss1`/`exss2`, `st1`–`st5`, `fz1`) — verified in `index.html` and the sample data. For collections (deck, graveyard, etc.), it's a numeric index (new tops get `previousTop + 2`). Don't mix these up.

### Card UUID

Generated by `ygoUUID()` — a custom implementation using `Date.now()` + `performance.now()` microseconds. It is **not** standard UUID v4; the actual template is `'xyxy-xxyy-0510-xyyy-xxxx'`. Auto-assigned in the `Card` constructor (and defensively in `board.addItem()`) when `uuid` is `0`.

### No Build Step

This project has zero build tooling. Changes to JS/CSS are immediately reflected on page reload. There is no transpilation, bundling, or minification in the development workflow.
