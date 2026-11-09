'use strict';
// Tasks 1-1/1-2: card data shards integrity + schema v2 validation.
// Every card in data/ is validated (14.5k records — fast enough for node --test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { normalizeCard, validateCard, localImagePath } = await import(
    path.join(root, 'js', 'duel', 'state', 'card-schema.mjs'));

const dataDir = path.join(root, 'data');
const manifest = JSON.parse(fs.readFileSync(path.join(dataDir, 'manifest.json'), 'utf8'));

function sha256(buf) {
    return crypto.createHash('sha256').update(buf).digest('hex');
}

test('manifest matches every shard on disk (integrity + idempotency)', () => {
    assert.equal(manifest.schemaVersion, '2.0');
    assert.equal(manifest.source, 'ygoprodeck-api-v7');
    let total = 0;
    for (const shard of manifest.shards) {
        const buf = fs.readFileSync(path.join(dataDir, shard.file));
        assert.equal(sha256(buf), shard.sha256, `${shard.file} hash mismatch — rerun tools/fetch-cards.mjs`);
        assert.equal(buf.length, shard.bytes);
        total += JSON.parse(buf).length;
    }
    assert.equal(total, manifest.cardCount, 'shard card counts must sum to manifest.cardCount');
});

test('every stored card passes schema v2 validation, sorted by cardId, unique', () => {
    const seen = new Set();
    let lastId = 0;
    for (const shard of manifest.shards) {
        const cards = JSON.parse(fs.readFileSync(path.join(dataDir, shard.file), 'utf8'));
        for (const card of cards) {
            const problems = validateCard(card);
            assert.deepEqual(problems, [], `card ${card.cardId}: ${problems.join('; ')}`);
            assert.ok(card.cardId > lastId, 'cards must be sorted ascending by cardId');
            lastId = card.cardId;
            assert.ok(!seen.has(card.cardId), `duplicate cardId ${card.cardId}`);
            seen.add(card.cardId);
        }
    }
    assert.ok(seen.size > 10000, `expected a full database, got ${seen.size}`);
});

/** Load a normalized card from the local shards (offline — no network in tests). */
function findStored(cardId) {
    for (const shard of manifest.shards) {
        const cards = JSON.parse(fs.readFileSync(path.join(dataDir, shard.file), 'utf8'));
        const hit = cards.find((c) => c.cardId === cardId);
        if (hit) return hit;
    }
    return null;
}

test('known cards normalize + validate correctly (offline, from shards)', () => {
    const spell = findStored(48130397); // Super Polymerization
    assert.ok(spell, 'Super Polymerization must be in the shards');
    assert.equal(spell.name, 'Super Polymerization');
    assert.equal(spell.kind, 'spell');
    assert.equal(spell.subtype, 'Quick-Play');
    assert.deepEqual(validateCard(spell), []);

    // find one link, pendulum, and xyz monster in the shards
    let link = null, pendulum = null, xyz = null;
    for (const shard of manifest.shards) {
        const cards = JSON.parse(fs.readFileSync(path.join(dataDir, shard.file), 'utf8'));
        link ??= cards.find((c) => c.frameType === 'link');
        pendulum ??= cards.find((c) => String(c.frameType).includes('pendulum'));
        xyz ??= cards.find((c) => c.frameType === 'xyz');
        if (link && pendulum && xyz) break;
    }
    assert.ok(link && pendulum && xyz, 'shards must contain link, pendulum, and xyz monsters');
    assert.equal(typeof link.link, 'number');
    assert.ok(Array.isArray(link.linkMarkers) && link.linkMarkers.length > 0);
    assert.ok(typeof pendulum.scale === 'number');
    assert.ok(typeof xyz.level === 'number'); // xyz rank stored in `level` per schema
    for (const c of [link, pendulum, xyz]) assert.deepEqual(validateCard(c), []);
});

test('normalizeCard rejects garbage input', () => {
    assert.throws(() => normalizeCard(null), /must be an object/);
    assert.throws(() => normalizeCard({ id: 'x' }), /integer/);
    assert.throws(() => normalizeCard({ id: 1, name: '', desc: 'x', type: 'Spell Card' }), /missing name/);
    assert.throws(() => normalizeCard({ id: 1, name: 'x', desc: 'x', type: 'Weird' }), /unknown type/);
});

test('localImagePath is cardId-keyed (name-based fallback stays legacy-only)', () => {
    assert.equal(localImagePath(48130397), 'asset/card/48130397.jpeg');
});
