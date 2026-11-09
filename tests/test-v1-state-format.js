'use strict';
// Guards the v1 Free Mode state format that duel-mode work must never break.
// Uses the repo's own board.json (a real v1 exportState() product) as fixture.
// Pure JSON checks only — simulator.js itself needs a browser (ADR-006).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(__dirname, '..', 'board.json');
const state = JSON.parse(readFileSync(fixturePath, 'utf8'));

// Required fields on every serialized card, per docs/ARCHITECTURE.md and the
// export/import sync law (legacy law 3). New duel-mode fields must not appear
// here; missing legacy fields here would break v1 imports.
const REQUIRED_CARD_FIELDS = [
    'cardId', 'uuid', 'name', 'position', 'foldState', 'switchState',
    'collection_order',
];
const REQUIRED_TOP_FIELDS = ['dateCreate', 'version', 'currentPhase', 'items', 'playLogData'];
const REQUIRED_PLAYLOG_FIELDS = ['initItems', 'steps', 'pointer'];

test('v1 export: top-level shape', () => {
    for (const f of REQUIRED_TOP_FIELDS) {
        assert.ok(f in state, `board.json fixture must contain "${f}"`);
    }
    assert.equal(state.version, '1.0', 'v1 export version must stay "1.0"');
    assert.ok(Array.isArray(state.items), 'items must be an array');
    assert.ok(state.items.length > 0, 'fixture must have at least one card');
});

test('v1 export: every card keeps the legacy fields', () => {
    for (const item of state.items) {
        for (const f of REQUIRED_CARD_FIELDS) {
            assert.ok(f in item, `card ${item.uuid ?? '?'} is missing "${f}"`);
        }
        assert.ok(['hand', 'deck', 'exdeck', 'summon', 'st', 'fz', 'graveyard', 'banish']
            .includes(item.position), `card ${item.uuid} has invalid position ${item.position}`);
        assert.ok(['normal', 'fold'].includes(item.foldState), `card ${item.uuid} bad foldState`);
        assert.ok(['attack', 'defense'].includes(item.switchState), `card ${item.uuid} bad switchState`);
    }
});

test('v1 export: playLogData shape', () => {
    for (const f of REQUIRED_PLAYLOG_FIELDS) {
        assert.ok(f in state.playLogData, `playLogData must contain "${f}"`);
    }
    assert.ok(Array.isArray(state.playLogData.steps), 'steps must be an array');
});

test('v1 import round-trip: JSON.parse(JSON.stringify(state)) is lossless', () => {
    const copy = JSON.parse(JSON.stringify(state));
    assert.deepEqual(Object.keys(copy).sort(), Object.keys(state).sort());
});
