'use strict';
// Regression tests for bugs found in the Nov-2026 review. simulator.js is a browser
// script, so it is loaded into a vm sandbox with a permissive jQuery stub; only the
// pure logic under test runs. Source-level checks cover the rest (HTML/CSS/loader).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');

function loadSimulator() {
    const chain = new Proxy(function () { }, { get: () => chain, apply: () => chain });
    const $ = new Proxy(function () { return chain; }, {
        get: (t, k) => {
            if (k === 'each') return (obj, fn) => Object.entries(obj).forEach(([key, val]) => fn(key, val));
            if (k === 'extend') return Object.assign;
            return chain;
        },
    });
    const timers = [];
    const sandbox = {
        $, jQuery: $, console, StateGuards: { escapeHtml: String },
        ygoUUID: () => 'uuid', setTimeout: (fn) => { timers.push(fn); return 0; },
        window: {}, performance, document: chain, location: {}, localStorage: {},
    };
    const ctx = vm.createContext(sandbox);
    vm.runInContext(read('js/simulator.js'), ctx, { filename: 'simulator.js' });
    return { ctx, timers, Card: vm.runInContext('Card', ctx) };
}

function fakeCard(Card, { canMove, position = 'hand' }) {
    const calls = { removed: 0, afterMove: 0, startMove: 0 };
    const card = Object.create(Card.prototype);
    Object.assign(card, {
        position, collection_order: 3, switchState: 'attack', foldState: 'normal',
        itemBefore: {}, uuid: 'u1',
        html: { parent: () => ({ length: 1, remove: () => { calls.removed++; } }) },
        getBoard: () => ({}),
        beforeMove() { this.itemBefore = { ...this }; return true; },
        canMoveTo: () => canMove,
        startMoveAnimation: () => { calls.startMove++; return {}; },
        afterMove: () => { calls.afterMove++; },
    });
    return { card, calls };
}

test('Card.moveTo: a blocked move (canMoveTo=false) has no side effects', () => {
    const { Card, timers } = loadSimulator();
    const { card, calls } = fakeCard(Card, { canMove: false });
    assert.equal(card.moveTo('fz'), false);
    assert.equal(calls.removed, 0, 'hand wrapper must not be detached');
    assert.equal(calls.afterMove, 0, 'afterMove() must not log a phantom step');
    assert.equal(calls.startMove, 0);
    assert.equal(timers.length, 0, 'no moveAnimation(undefined) may be scheduled');
    assert.equal(card.position, 'hand');
    assert.equal(card.collection_order, 3);
});

test('Card.moveTo: failed appendToBoard() restores position and collection_order', () => {
    const { Card } = loadSimulator();
    const { card } = fakeCard(Card, { canMove: true, position: 'summon' });
    Object.assign(card, {
        getBoard: () => ({ getCollectionByPosition: () => null }),
        startBoardAnimation() { }, endBoardAnimation() { }, updateHtml() { },
        appendToBoard: () => false,
    });
    assert.equal(card.moveTo('banish'), false);
    assert.equal(card.position, 'summon');
    assert.equal(card.collection_order, 3);
});

test('parseDataFromOther: sets cardId from id when cardId is missing', () => {
    const { ctx } = loadSimulator();
    const out = vm.runInContext('parseDataFromOther', ctx)({
        mainDeck: [{ id: 46986414, name: 'Dark Magician', type: 'Normal Monster', image: 'x.jpg' }],
        extraDeck: [],
    });
    assert.equal(out[0].cardId, 46986414);
    assert.equal(out[0].orgID, 46986414);
});

test('parseDataFromOther: keeps an existing cardId', () => {
    const { ctx } = loadSimulator();
    const out = vm.runInContext('parseDataFromOther', ctx)({
        mainDeck: [{ id: 1, cardId: 99, name: 'X', type: 'Spell Card', image: '' }],
        extraDeck: [],
    });
    assert.equal(out[0].cardId, 99);
});

test('replay fallback message no longer references undefined key/value', () => {
    assert.doesNotMatch(read('js/simulator.js'), /card\[action\]\(\);\s*log\.writeStep\(step\.message \|\| `Update \$\{key\}/);
});

test('audio play() promises are never left unhandled', () => {
    assert.doesNotMatch(read('js/simulator.js'), /^\s*soundElm\[0\]\.play\(\);/m);
});

test('Function.js does not shadow window.scrollTo', () => {
    assert.doesNotMatch(read('js/Function.js'), /^\s*function scrollTo\s*\(/m);
});

test('local assets use relative paths (file:// and sub-folder hosting)', () => {
    assert.doesNotMatch(read('index.html'), /<link[^>]+href="\/(?!\/)/);
    assert.doesNotMatch(read('index.html'), /<link[^>]+href="css\/[^"]*"[^>]*crossorigin/);
    assert.doesNotMatch(read('css/simulator.css'), /url\(\s*["']?\/(?!\/)/);
    assert.doesNotMatch(read('css/simulator.scss'), /url\(\s*["']?\/(?!\/)/);
});
