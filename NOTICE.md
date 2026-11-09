# NOTICE

This project is a browser-based Yu-Gi-Oh! practice/combo simulator. It is a
fan practice tool.

## Not affiliated with Konami

Yu-Gi-Oh! and all related card names, card texts, and artwork are trademarks
and copyrights of Konami and/or their respective owners. This project is
**not affiliated with, endorsed by, or sponsored by Konami**. Card data and
images are used for personal, non-commercial practice and demonstration.

## Upstream attribution

This repository is a clone/fork of
[arthastheking113/yugioh-simulator](https://github.com/arthastheking113/yugioh-simulator),
whose README asks: *"Please site our repo if you are planning to use our
module."* All original code and design from that project is theirs. The
upstream project credits ygovietnam.com and metaduelist.com as the sites it
powers.

## Licensing status

The upstream repository ships **no license file**, so its code remains
all-rights-reserved by its authors. No license decision has been made for
this fork's additions — that is deliberately left to the repository owner
(see `docs/adr/002-license-and-ip.md`). Nothing here may be assumed to be
redistributable.

## Third-party components (as vendored or loaded)

| Component | License |
|-----------|---------|
| jQuery 3.2.1 (`js/jquery.min.js`) | MIT — jquery.org/license |
| jQuery UI 1.12.1 (`js/jquery-ui.min.js`) | MIT |
| jQuery UI Touch Punch 0.2.3 | MIT |
| Bootstrap 5 (CSS, `vendor/`) | MIT |
| Font Awesome **Pro** 5.10 (local css + webfonts/, vendored upstream) | Commercial license — flagged as an IP risk for the owner (ADR-002) |
| Animate.css 4.1.1 | MIT |
| SweetAlert2 11.26.25 (`vendor/sweetalert2/`) | MIT |
| Iconify (`js/iconify.min.js`) | Apache-2.0 / GPL dual — see file header |

Intentionally **not** used (AGPL-3, blocked by ADR-002 until owner approval):
EDOPro / ocgcore, Project Ignis CardScripts, WindBot (used as an architecture
pattern only — no code copied).

Card images are loaded from a third-party CDN at runtime with a local
fallback in `asset/card/`; only a handful of images are committed. No
YGOPRODeck images are hotlinked (per their API terms).
