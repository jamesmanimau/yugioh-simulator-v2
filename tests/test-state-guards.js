'use strict';
// Task 0A-3: pure guards for importState hardening + log HTML escaping.
// js/lib/state-guards.js is a global script guarded for Node (globalThis), so
// requiring it works without a browser (ADR-006).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

require(path.join(__dirname, '..', 'js', 'lib', 'state-guards.js'));
const SG = globalThis.StateGuards;

const goodItem = {
    cardId: 48130397, uuid: 'abcd-1234', name: 'Super Polymerization',
    position: 'hand', foldState: 'normal', switchState: 'attack', collection_order: 1
};
const goodState = { version: '1.0', dateCreate: 'x', currentPhase: 'm1', items: [goodItem] };

test('escapeHtml neutralizes XSS payloads in text and attributes', () => {
    assert.equal(SG.escapeHtml('<img src=x onerror=alert(1)>'),
        '&lt;img src=x onerror=alert(1)&gt;');
    assert.equal(SG.escapeHtml('" onmouseover="alert(1)'),
        '&quot; onmouseover=&quot;alert(1)');
    assert.equal(SG.escapeHtml(null), '');
    assert.equal(SG.escapeHtml(undefined), '');
    assert.equal(SG.escapeHtml(123), '123');
    assert.equal(SG.escapeHtml('a`b=c'), 'a&#96;b=c');
});

test('validateBoardState accepts a clean v1 state (object or JSON string)', () => {
    assert.deepEqual(SG.validateBoardState(goodState), { ok: true });
    assert.equal(SG.validateBoardState(JSON.stringify(goodState)).ok, true);
});

test('validateBoardState rejects malformed payloads', () => {
    assert.equal(SG.validateBoardState(null).ok, false);
    assert.equal(SG.validateBoardState('').ok, false);
    assert.equal(SG.validateBoardState('{not json').ok, false);
    assert.equal(SG.validateBoardState({ items: 'nope' }).ok, false);
    assert.equal(SG.validateBoardState({ items: [] , version: 1.0 }).ok, false); // version must be string
});

test('validateBoardState enforces per-item schema (position/fold/switch/name)', () => {
    const badPos = { ...goodState, items: [{ ...goodItem, position: 'pocket' }] };
    assert.match(SG.validateBoardState(badPos).error, /invalid position/);
    const badFold = { ...goodState, items: [{ ...goodItem, foldState: 'sideways' }] };
    assert.match(SG.validateBoardState(badFold).error, /invalid foldState/);
    const badSwitch = { ...goodState, items: [{ ...goodItem, switchState: 'attacky' }] };
    assert.match(SG.validateBoardState(badSwitch).error, /invalid switchState/);
    const noName = { ...goodState, items: [{ ...goodItem, name: undefined }] };
    assert.equal(SG.validateBoardState(noName).ok, false); // missing/typed check
    const missingField = { ...goodState, items: [{ ...goodItem } ] };
    delete missingField.items[0].uuid;
    assert.match(SG.validateBoardState(missingField).error, /missing "uuid"/);
});

test('validateBoardState enforces size and count limits', () => {
    const many = { ...goodState, items: Array.from({ length: SG.MAX_ITEMS + 1 }, () => ({ ...goodItem })) };
    assert.match(SG.validateBoardState(many).error, /exceeds/);

    const bigString = JSON.stringify(goodState) + ' '.repeat(SG.MAX_STATE_BYTES);
    assert.match(SG.validateBoardState(bigString).error, /exceeds/);

    const hugeObject = { ...goodState, items: [{ ...goodItem, name: 'x'.repeat(SG.MAX_STATE_BYTES) }] };
    assert.equal(SG.validateBoardState(hugeObject).ok, false);
});

test('guards are frozen and complete', () => {
    assert.ok(Object.isFrozen(SG));
    for (const fn of ['escapeHtml', 'validateBoardState', 'stateBytes']) {
        assert.equal(typeof SG[fn], 'function', `${fn} must be a function`);
    }
});
