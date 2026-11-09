# YuGi-Oh! Simulator — Claude Code Guide

## What This Project Is

A standalone, browser-based YuGi-Oh! card game simulator. No build step — open `index.html` directly in a browser. Used by players to record and share combos, practice card interactions, and create tournament demos.

**Key constraint:** No game rules are enforced. This is a visual tool only.

## Quick File Reference

| File | What it does |
|------|-------------|
| `js/simulator.js` | Core classes: `PlayLog`, `Card`, `Collection`, `Board` (2,854 lines) |
| `js/card_menu.js` | Context menus and card actions (930 lines) |
| `js/main.js` | Initializes Board, wires DOM events (65 lines) |
| `js/Function.js` | Utility functions: clipboard, localStorage, SweetAlert toasts |
| `js/combo_graph.js` | `ComboGraph` — read-only visual flow graph of a recorded combo |
| `js/theme.js` | Runtime theme switching (1,754 lines) |
| `js/example.js` | **Dead legacy data** — single-line JSON export, loaded nowhere; don't edit or reference it |
| `js/lib/state-guards.js` | Pure guards: `StateGuards.escapeHtml` (log HTML safety) + `validateBoardState` (importState hardening) |
| `js/board-state.js` | Generated from `board.json` by `tools/sync-board-state.js`; lets the board boot on `file://` (no XHR needed) |
| `css/simulator.css` | Game board and card layout |
| `css/combo_graph.css` | Combo graph nodes, arrows, zone chips |
| `css/theme.css` | CSS color variables — all colors go here |
| `index.html` | Board layout and script load order |

Full architecture: see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

Feature docs: [`docs/BASIC-ADVANCED-VIEW.md`](docs/BASIC-ADVANCED-VIEW.md) (Basic/Advanced board view + relocated controls + card-info panel) · [`docs/IMPLEMENTING-COMBO-GRAPH.md`](docs/IMPLEMENTING-COMBO-GRAPH.md) · [`docs/MIGRATION.md`](docs/MIGRATION.md) (upgrading a build to the latest version)

## The Four Core Classes (in simulator.js)

```
PlayLog   → records/replays every action
Card      → a single card: state, DOM element, animations
Collection → stacked zones (deck, graveyard, banish, extra deck)
Board     → central controller: holds all cards, delegates to Card + Collection
```

## Card Positions

`hand` | `deck` | `exdeck` | `summon` (slots 1–5) | `st` (slots 1–5) | `fz` | `graveyard` | `banish`

## The Three Laws (Don't Break These)

1. **Log every action.** Any game state change must call `board.playlog.writelog(step)` or replay will desync.
2. **Mutate through `board.updateItem()`.** Never directly set `card.property`. This syncs the DOM.
3. **Keep export/import in sync.** New card properties must be added to both `exportState()` and `importState()`.

## Agile Team Agents

This project has custom agents for each team role. Each role lives in its own folder under `.claude/agents/<role>/skill.md`. Thin OpenCode wrappers live in `.opencode/agents/` (they just point at the `.claude` role spec).

| Agent | Folder | Use When |
|-------|--------|----------|
| `product-owner` | `.claude/agents/product-owner/` | Defining features, writing user stories |
| `frontend-developer` | `.claude/agents/frontend-developer/` | Visual changes, layout, themes |
| `game-engine-developer` | `.claude/agents/game-engine-developer/` | simulator.js, card_menu.js, replay, state |
| `qa-engineer` | `.claude/agents/qa-engineer/` | Bug reports, test checklists, regression |
| `scrum-master` | `.claude/agents/scrum-master/` | Sprint planning, task breakdown, blockers |
| `data-pipeline-engineer` | `.claude/agents/data-pipeline-engineer/` | tools/, card schema, IndexedDB cache, image strategy |
| `duel-engine-developer` | `.claude/agents/duel-engine-developer/` | js/duel/engine, Worker, prompt/response protocol, replay |
| `bot-developer` | `.claude/agents/bot-developer/` | js/duel/bot — executors, selectors, battle, chain, levels |
| `browser-platform-engineer` | `.claude/agents/browser-platform-engineer/` | PWA/offline, CSP, import validation, Pointer Events, CDN pinning, budgets |

## Duel Mode (in planning)

Duel Mode = bot duels with engine-enforced rules, alongside the rule-free Free Mode. All planning docs live in **`docs/duel-mode/`** (PRD, ARCHITECTURE, DESIGN, RULES, TASKS, MEMORY, variables.md, ASSUMPTION-AUDIT.md) and decisions in `docs/adr/`. **`docs/duel-mode/RULES.md` and `MEMORY.md` are loaded every session.**

Two additional laws for Duel Mode (beyond the Three Laws below):
4. **GameState/engine is the single source of truth** — the UI only renders events; the engine never touches the DOM.
5. **The bot never touches the DOM and never reads hidden information** — it answers normalized prompts from a redacted public view.

## App Knowledge

Focused design reference files live in `.claude/app-knowledge/`:

| File | Covers |
|------|--------|
| `overview.md` | What the app is, tech stack, personas, file roles |
| `core-classes.md` | PlayLog / Card / Collection / Board responsibilities |
| `card-model.md` | Card properties, positions, CSS classes, image loading |
| `game-mechanics.md` | Phase system, move lifecycle, Xyz overlay, shuffle |
| `replay-design.md` | PlayLog recording/replay algorithm, step types, combo-graph hooks |
| `ui-layout.md` | DOM structure, CSS files, animation system, theme |
| `context-menu-design.md` | Hover-open menus, lifecycle/detach, data-target format, overlay-select cancel |
| `combo-graph.md` | Combo graph: data source, `ComboGraph` API, step→visual mapping, auto-refresh + replay sync |

> **Two doc homes — keep them in sync.** There is also a *portable* knowledge pack in [`docs/combo-knowledge-pack/`](docs/combo-knowledge-pack/) (written for an agent in a different repo). When you update an `.claude/app-knowledge/` file, update the matching pack file too. The mapping lives in [`.claude/agents/game-engine-developer/skill.md`](.claude/agents/game-engine-developer/skill.md).

## Common Tasks

**Add a new card action:**
1. Add menu item in `card_menu.js` → `CardMenu.renderMenu()`
2. Add handler in action switch
3. Add the action method to `Card` class in `simulator.js`
4. Call `board.playlog.writelog()` inside the handler
5. Handle the action type in `PlayLog.playStep()` for replay

**Add a new card property:**
1. Add to `Card` constructor defaults
2. Add to `Board.exportState()` serialization
3. Add to `Board.importState()` restoration
4. Update CSS class in `Card.updateHtml()` if it has a visual state

**Change card visual:**
1. Check `Card.drawHtml()` for initial render
2. Check `Card.updateHtml()` for state-change updates
3. CSS classes live in `css/simulator.css`

**Debug a replay bug:**
- Check `PlayLog.writelog()` is called for the action
- Check `PlayLog.playStep()` handles that action's type
- Check `board.exportState()` captures the relevant card state in `initItems`

**After every bug fix or feature:**
1. Update `docs/ARCHITECTURE.md` if the change affects architecture or event flow
2. Update the relevant `.claude/app-knowledge/` file(s)
3. Update the matching `docs/combo-knowledge-pack/` file(s) (see mapping in `.claude/agents/game-engine-developer/skill.md`)
4. Bump the `?v=N` cache-bust in `index.html` for any changed JS/CSS file

## Script Load Order (matters!)

```
jQuery → jQuery UI → Touch Punch → card_menu.js → simulator.js → main.js → Function.js → combo_graph.js
```

## No Build Step

Edit files, reload browser. That's it. No npm, no webpack, no transpilation.

**Cache-bust gotcha:** assets are loaded with `?v=N` query strings. When you edit a JS/CSS file, bump its `?v=` in `index.html` or the browser may serve a stale cached copy.
