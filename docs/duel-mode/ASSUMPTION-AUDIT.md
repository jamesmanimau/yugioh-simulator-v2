# Assumption Audit — Step 0 (Langkah 0)

Date: 2026-11-09 · Scope: read-only orientation per the bootstrap prompt, section 2.
Verdicts: ✅ true · ❌ false · ⚠️ partial (see evidence).

## Environment facts (measured)

| Fact | Value |
|------|-------|
| Node | v22.23.4 (≥ NODE_MIN 20) |
| OpenCode | v2.2.5 installed (`opencode --version`) |
| LICENSE file | none in repo root |
| Tests / CI | none (no `tests/`, no `.github/`, no `package.json`) |
| `asset/` | 1.1 MB (only 8 files in `asset/card/`) |
| `sound/` | 192 KB |
| `vendor/` | 8.5 MB (Bootstrap 5 etc., loaded from disk) |
| `js/simulator.js` | 2,956 lines |
| `js/theme.js` | 1,754 lines |
| `js/example.js` | 96,637 bytes, **0 newlines** (single-line JSON board export); **no longer loaded** — not referenced by `index.html` or any JS; startup uses local `board.json` (`js/simulator.js:2880`) |
| Static server helper | `.claude/launch.json` already defines `python -m http.server 8123` |
| Default branch | `main` (cloned from upstream) |

## Assumptions from the prompt (section 2), verified against code

| # | Assumption | Verdict | Evidence |
|---|-----------|----------|----------|
| 1 | Free Mode does not enforce rules | ✅ | `CLAUDE.md` "Key constraint: No game rules are enforced"; `js/simulator.js:604-648` `Card.canMoveTo()` only checks free-slot availability, not legality |
| 2 | Core classes `PlayLog`, `Card`, `Collection`, `Board` in `js/simulator.js` | ✅ | `js/simulator.js:6` (PlayLog), `:569` (Card), `:1292` (Collection), `:1477` (Board) |
| 3 | Every state change calls `board.playlog.writelog(step)` | ⚠️ | Actual API differs from docs: `Board.writelog(action, id, data, oldData)` at `js/simulator.js:1976` delegates to `playlog.addStep(...)` (`:1978`); `PlayLog` itself has **no** `writelog` method — callers use `this.getBoard().writelog(...)` (e.g. `:673`, `:895-908`). Rule is documented, not uniformly followed (direct mutation at `:756` `_card.position = newPosition`) |
| 4 | Mutations go through `board.updateItem()` | ⚠️ | `Board.updateItem(id, k, v)` exists at `js/simulator.js:1834` and is used (e.g. `:370`, `:409`, `:1462`), but `moveTo()` and others mutate card properties directly (`:727`, `:756`, `:768`) |
| 5 | `exportState()` / `importState()` kept in sync, state version `'1.0'` | ✅ | `Board.version = '1.0'` at `js/simulator.js:1510`; `exportState()` at `:2653-2684` includes `version`; `importState()` at `:2685-2703` restores items + phase + skill + playLogData |
| 6 | After each feature/fix: update `docs/ARCHITECTURE.md`, `.claude/app-knowledge/`, knowledge pack, bump `?v=N` | ✅ | `CLAUDE.md` "After every bug fix or feature"; mapping table at `.claude/agents/game-engine-developer/skill.md:23-25`; `?v=` present in `index.html:49-64,360-364`. **Gap:** `js/theme.js` (`index.html:368`) and `css/app.css` (`:56`) have **no** `?v=` |
| 7 | Board is single-sided | ✅ | One `#hand`/`#hand-board` (`index.html:228-229`), one set of player zones; no opponent-side markup. Note: two extra monster zone slots `exss1`/`exss2` already exist (`index.html:152,156`) |
| 8 | Minimal card data (id, name, text, image, type flags) | ✅ | `Card` defaults `js/simulator.js:572-589` + sample `board.json` fields: `cardId`, `name`, `imageURL`, `description`, `isSpell`/`isTrap`/`isMonster`/`isST`/`isExtra`, `position`, `foldState`, `switchState` |
| 9 | Card images from third-party CDN with fallback `asset/card/{cardId}.jpeg` | ⚠️ | CDN URLs in `board.json` are `https://ygovietnamcdn.azureedge.net/storage/Card/{cardId}.jpg` (by **passcode**, `.jpg`). Fallback is `imgPath + 'card/' + this.name + '.jpeg'` — by **name**, not cardId — at `js/simulator.js:923`; `combo_graph.js:262` same pattern; only 8 files present in `asset/card/` |
| 10 | jQuery 3.2.1, jQuery UI 1.12.1, Touch Punch | ✅ | Self-hosted, not CDN: `index.html:59-61`; verified in files: `jquery.min.js` "jQuery v3.2.1", `jquery-ui.min.js` `version:"1.12.1"`, Touch Punch 0.2.3 |
| 11 | SweetAlert2 and Iconify loaded from CDN `'latest'` | ❌ | Outdated: SweetAlert2 is CDN **pinned major** `sweetalert2@11` (`index.html:52`); Iconify is **self-hosted** `js/iconify.min.js?v=1.0.7` (`index.html:51`; the CDN `<script>` is commented out at `:366`). Font Awesome is CDN `pro.fontawesome.com v5.10.0` + local copy (`:47-48`) |
| 12 | PlayLog messages are HTML | ✅ | `PlayLog.addStep()` builds `<p class="log-step">…</p>` strings, `js/simulator.js:142-212`. **Risk:** `card.name` is interpolated unescaped into log HTML (e.g. `:176-212`) — imported state with a malicious name is an injection vector (chat input *is* escaped, `:101`, `:114`) |
| 13 | State export version `'1.0'` | ✅ | See #5 |
| 14 | `moveTo` uses 400 ms animation + `setTimeout`; caused ghost cards | ✅ | Nested `setTimeout(..., 400)` with `moveAnimation()` then a **second** `appendToBoard()` at `js/simulator.js:796-801` (first sync call at `:775`); stale-card guard `board.getItemById(card.uuid) !== card` at `:1012-1019`; recent fix commit `dc79026` "Guard appendToBoard against stale cards from discarded board build" |
| 15 | `js/example.js` ≈ 30k lines, do not edit manually | ❌ | Stale claim: the file is a **single-line 96 KB JSON** (0 newlines, `wc -l` = 0) and is **not loaded anywhere** — `index.html:360-370` has no `example.js`; startup loads `board.json` via `$.getJSON` (`js/simulator.js:2880`). CLAUDE.md/ARCHITECTURE.md file maps still describe the old 30,644-line version |
| 16 | `js/simulator.js` ≈ 2.9k lines | ✅ | 2,956 lines (docs say 2,854 — slightly stale but within range) |
| 17 | `js/theme.js` ≈ 1.8k lines | ✅ | 1,754 lines |
| 18 | No tests, no CI, no license | ✅ | No `LICENSE*`, no `.github/`, no `tests/`, no `package.json` in repo |
| 19 | Upstream README asks attribution if modules are reused | ✅ | `README.md`: "Please site our repo if you are planning to use our module" |
| 20 | Free Mode must keep working from `file://` | ⚠️ (not verified in browser) | All scripts/CSS are local (good), **but** startup does `$.getJSON('board.json', …)` (`js/simulator.js:2880`); XHR/fetch against `file://` is blocked in Chromium-based browsers, and the `Board` instance is only created inside that callback (`:2881-2885`) — on `file://` the board likely never initializes (error toast `:2889`). Needs a manual browser test; the `.claude/launch.json` static server exists for exactly this |

## Extra findings (not in the assumption list)

- `importState()` performs no size limits and only structural validation (`js/simulator.js:2715-2745`); `checkStateType` calls `JSON.parse` on strings (`:2709`). Untrusted-import hardening (prompt Tahap 0A) is genuinely needed.
- `asset/` total is only 1.1 MB but `vendor/` is 8.5 MB — relevant for the first-load budget.
- Docs (CLAUDE.md, docs/ARCHITECTURE.md) describe `appendToBoard` lifecycle and zone structure accurately; the `isOverlap` (material) / `isOverlay` (Xyz monster) naming is as counterintuitive as documented.
- Script load order in `index.html:59-64,360-370` matches CLAUDE.md's documented order (with `theme.js`, `removeBackDrop.js` loaded last without `?v`).

## Consequences for the plan

1. `js/example.js` is dead data — ignore it; do not plan lazy-loading work around it (CLAUDE.md needs a fix in a later step).
2. Card image fallback path is **name-based**, not cardId-based — affects the Tahap 1 image strategy (name collisions, missing files).
3. CDN pinning/self-hosting (Tahap 0A) is half-done already: jQuery stack is local; SweetAlert2 is `@11` (not `latest`); Iconify is local. Remaining: SweetAlert2 pin/self-host, Font Awesome, cache-bust gaps for `theme.js`/`app.css`.
4. The `board.writelog(action, id, data, oldData)` signature (not `playlog.writelog(step)`) must be respected by the docs we write in later steps.
5. `file://` viability of Free Mode is doubtful since `board.json` loads via XHR — must be resolved (manual test) before Tahap 0A can promise "checklist regression passes".
