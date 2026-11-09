'use strict';
// Guard: the Duel Mode flag must stay OFF until Gate C is approved.
// Verified by reading the file (no browser/eval needed) — see ADR-006.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const configPath = path.join(__dirname, '..', 'js', 'duel', 'config.js');
const src = readFileSync(configPath, 'utf8');

test('Duel Mode flag is off (pre-Gate C)', () => {
    assert.match(src, /enabled:\s*false/, 'DUEL_MODE.enabled must be false until Gate C');
    assert.doesNotMatch(src, /enabled:\s*true/, 'flag must never be true in committed code before Gate C');
});

test('flag file is a plain global script (no imports/exports)', () => {
    assert.doesNotMatch(src, /\brequire\(|\bimport\b|module\.exports/, 'config.js must stay loader-free');
});
