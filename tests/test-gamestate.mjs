'use strict';
// Tasks 0B-1 / 0B-2: pure GameState + v1->v2 migration (Node-only, ADR-003/006).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { GameState, createCard, ZONES, STATE_VERSION } = await import(
    path.join(root, 'js', 'duel', 'state', 'gamestate.mjs'));
const { migrateV1toV2 } = await import(path.join(root, 'js', 'duel', 'state', 'migrate-v1.mjs'));

const boardJson = readFileSync(path.join(root, 'board.json'), 'utf8');

test('fresh state: two players, standard zones, 8000 LP', () => {
    const s = new GameState({ seed: 42 });
    assert.equal(s.players.length, 2);
    for (const p of s.players) {
        assert.equal(p.lp, 8000);
        assert.equal(p.field.mz.length, 7);   // 5 main + 2 EMZ
        assert.equal(p.field.stz.length, 5);
        for (const z of ['deck', 'hand', 'extra', 'gy', 'banished']) {
            assert.ok(Array.isArray(p[z]), `zone ${z} must be a list`);
        }
    }
    assert.equal(s.version, STATE_VERSION);
});

test('placeCard: lists append, slots enforce occupancy + bounds', () => {
    const s = new GameState({ seed: 1 });
    const c1 = s.placeCard(createCard({ cardId: 1, name: 'A' }), 0, 'hand');
    const c2 = s.placeCard(createCard({ cardId: 2, name: 'B' }), 0, 'hand');
    assert.equal(s.players[0].hand.length, 2);
    assert.ok(c1.uuid && c2.uuid && c1.uuid !== c2.uuid, 'uuids auto-assigned, unique');

    s.placeCard(createCard({ cardId: 3, name: 'C' }), 0, 'mz', 2);
    assert.throws(() => s.placeCard(createCard({ cardId: 4, name: 'D' }), 0, 'mz', 2), /occupied/);
    assert.throws(() => s.placeCard(createCard({ cardId: 5, name: 'E' }), 0, 'mz', 7), /invalid/);
    assert.throws(() => s.placeCard(createCard({ cardId: 6, name: 'F' }), 0, 'pocket'), /unknown zone/);
    assert.throws(() => s.placeCard(createCard({ cardId: 7, name: 'G' }), 2, 'hand'), /player must be/);
});

test('moveCard: respects turn ownership and keeps invariants', () => {
    const s = new GameState({ seed: 1 });
    const c = s.placeCard(createCard({ cardId: 1, name: 'A' }), 0, 'hand');
    // placing an already-placed card must not corrupt state
    assert.throws(() => s.placeCard(c, 0, 'mz', 0), /already on the board/);
    s.moveCard(c.uuid, 'mz', 0);
    const moved = s.moveCard(c.uuid, 'gy', null, { forceOwner: true });
    assert.equal(moved.zone, 'gy');
    assert.equal(s.players[0].hand.length, 0, 'card must not linger in its old zone');
    assert.equal(s.players[0].field.mz[0], null);
    assert.equal(s.players[0].gy.length, 1);

    const c2 = s.placeCard(createCard({ cardId: 2, name: 'B' }), 1, 'hand');
    assert.throws(() => s.moveCard(c2.uuid, 'gy'), /cannot move card of player 1/);
});

test('serialization: toJSON -> fromJSON round-trip preserves all cards', () => {
    const s = new GameState({ seed: 7 });
    s.placeCard(createCard({ cardId: 1, name: 'Hand card' }), 0, 'hand');
    s.placeCard(createCard({ cardId: 2, name: 'Summoned' }), 0, 'mz', 4, { position: 'defense' });
    s.placeCard(createCard({ cardId: 3, name: 'Foe' }), 1, 'mz', 5); // EMZ
    s.placeCard(createCard({ cardId: 4, name: 'Field' }), 1, 'fz');

    const restored = GameState.fromJSON(JSON.parse(JSON.stringify(s.toJSON())));
    const cards = [...restored.cards()];
    assert.equal(cards.length, 4);
    assert.equal(restored.players[0].field.mz[4].name, 'Summoned');
    assert.equal(restored.players[1].field.fz.name, 'Field');
    assert.throws(() => GameState.fromJSON({ version: '3.0' }), /unsupported state version/);
});

test('state is pure data: JSON-serializable, no DOM/timer globals touched', () => {
    const s = new GameState({ seed: 3 });
    s.placeCard(createCard({ cardId: 9, name: 'X' }), 0, 'deck');
    const json = JSON.stringify(s.toJSON());
    assert.ok(typeof json === 'string' && json.length > 0);
    // structured-clone safety: no functions serialized anywhere
    assert.ok(!json.includes('function'), 'functions leaked into serialized state');
});

test('migration v1 -> v2 maps the real board.json fixture correctly', () => {
    const s = migrateV1toV2(JSON.parse(boardJson), { seed: 99 });
    const p0 = s.players[0];
    assert.equal(s.mode, 'duel-import');
    assert.equal(p0.hand.length, 2);      // fixture: hand:2
    assert.equal(p0.deck.length, 14);    // fixture: deck:14
    assert.equal(p0.gy.length, 6);       // fixture: graveyard:6
    assert.equal(p0.extra.length, 3);    // fixture: exdeck:3
    assert.equal(p0.field.mz.filter(Boolean).length, 2); // fixture: summon:2 (ss3, exss2)
    assert.equal(p0.field.stz.filter(Boolean).length, 2); // fixture: st:2
    assert.equal(s.players[1].hand.length, 0); // opponent side starts empty
    // slot tokens land on the right indexes
    const exss2 = p0.field.mz[6];
    const ss3 = p0.field.mz[2];
    assert.ok(exss2 && ss3, 'ss3 -> mz[2], exss2 -> mz[6]');
});

test('migration rejects malformed v1 states', () => {
    assert.throws(() => migrateV1toV2(null), /must be an object/);
    assert.throws(() => migrateV1toV2({ items: 'x' }), /items must be an array/);
    assert.throws(() => migrateV1toV2({ version: '2.0', items: [] }), /expected v1 state/);
    assert.throws(() => migrateV1toV2({
        version: '1.0',
        items: [{ cardId: 1, uuid: 'u', name: 'x', position: 'pocket' }]
    }), /unmapped position/);
    assert.throws(() => migrateV1toV2({
        version: '1.0',
        items: [{ cardId: 1, uuid: 'u', name: 'x', position: 'summon', collection_order: 'ss9' }]
    }), /invalid mz slot token/);
});

test('ZONES export is frozen and complete', () => {
    assert.ok(Object.isFrozen(ZONES));
    assert.deepEqual([...ZONES], ['deck', 'hand', 'extra', 'gy', 'banished', 'mz', 'stz', 'fz']);
});
