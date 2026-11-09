#!/usr/bin/env node
'use strict';
/**
 * Regenerate js/board-state.js from board.json (task 0A-4).
 *
 * Why: Board startup reads board.json via $.getJSON (XHR), which browsers
 * block on file:// — and the Board is only constructed inside that callback,
 * so Free Mode would never initialize when opened directly (audit item 20).
 * A <script>-loaded copy of the same state works everywhere, including
 * file://. This tool keeps the two files in sync; run it after editing
 * board.json. No npm dependencies (ADR-006).
 *
 * Usage: node tools/sync-board-state.js
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'board.json');
const dst = path.join(root, 'js', 'board-state.js');

const state = JSON.parse(fs.readFileSync(src, 'utf8'));

// Sanity: the embedded state must pass the same guards importState uses.
require(path.join(root, 'js', 'lib', 'state-guards.js'));
const guard = globalThis.StateGuards.validateBoardState(state);
if (!guard.ok) {
    console.error('board.json failed validation: ' + guard.error);
    process.exit(1);
}

const out = [
    '/**',
    ' * Generated from board.json by tools/sync-board-state.js — DO NOT EDIT BY HAND.',
    ' * Lets the board initialize on file:// where XHR/JSON loading is blocked.',
    ' * Regenerate after changing board.json.',
    ' */',
    'window.__BOARD_STATE__ = ' + JSON.stringify(state) + ';',
    ''
].join('\n');

fs.writeFileSync(dst, out);
console.log('wrote ' + path.relative(root, dst) + ' (' + out.length + ' bytes)');
