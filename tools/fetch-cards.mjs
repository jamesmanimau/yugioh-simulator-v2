#!/usr/bin/env node
/**
 * Card data pipeline (task 1-1, ADR-004): YGOPRODeck v7 -> data/ shards + manifest.
 *
 * - Idempotent + resumable: the raw dump is cached at tools/.cache/cardinfo.raw.json;
 *   reruns without network reuse the cache and produce byte-identical shards
 *   (deterministic order, sorted-key JSON, no timestamps inside shards).
 * - Rate-limit safe: ONE API call for the whole database (API_RATE_MAX = 10 req/s
 *   cap vs YGOPRODeck's 20; we make 1 request per run, only when cache is missing).
 * - No npm dependencies (ADR-006): node:fetch, node:crypto, node:fs only.
 *
 * Usage: node tools/fetch-cards.mjs            # use/refresh cache, write data/
 *        node tools/fetch-cards.mjs --refresh  # force re-download from the API
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { normalizeCard } from '../js/duel/state/card-schema.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE_DIR = path.join(ROOT, 'tools', '.cache');
const RAW_PATH = path.join(CACHE_DIR, 'cardinfo.raw.json');
const DATA_DIR = path.join(ROOT, 'data');
const API_URL = 'https://db.ygoprodeck.com/api/v7/cardinfo.php';
const SHARD_SIZE = 1000;

function sha256(buf) {
    return crypto.createHash('sha256').update(buf).digest('hex');
}

function sortKeys(value) {
    if (Array.isArray(value)) return value.map(sortKeys);
    if (value && typeof value === 'object' && !ArrayBuffer.isView(value)) {
        const out = {};
        for (const key of Object.keys(value).sort()) out[key] = sortKeys(value[key]);
        return out;
    }
    return value;
}

/** JSON.stringify with sorted keys -> byte-identical output for same data. */
function stableJson(value) {
    return JSON.stringify(sortKeys(value));
}

async function ensureRaw(refresh) {
    if (!refresh && fs.existsSync(RAW_PATH)) {
        console.log(`using cached dump: ${RAW_PATH}`);
        return JSON.parse(fs.readFileSync(RAW_PATH, 'utf8'));
    }
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    console.log(`downloading ${API_URL} (single request, rate-limit safe)…`);
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`API responded ${res.status}`);
    const text = await res.text();
    fs.writeFileSync(RAW_PATH, text);
    console.log(`cached ${(text.length / 1e6).toFixed(1)} MB`);
    return JSON.parse(text);
}

function buildShards(list) {
    const shards = [];
    for (let i = 0; i < list.length; i += SHARD_SIZE) {
        const slice = list.slice(i, i + SHARD_SIZE);
        const file = `cards-${String(shards.length).padStart(3, '0')}.json`;
        shards.push({ file, body: Buffer.from(stableJson(slice), 'utf8') });
    }
    return shards;
}

const refresh = process.argv.includes('--refresh');
const raw = await ensureRaw(refresh);
if (!raw || !Array.isArray(raw.data)) throw new Error('unexpected API response: no data[]');

// Normalize everything; a single bad record must fail the run loudly.
const cards = new Map();
let skipped = 0;
for (const record of raw.data) {
    if (String(record.type ?? '').toLowerCase() === 'token') {
        skipped += 1; // tokens are not real deck cards
        continue;
    }
    const card = normalizeCard(record);
    if (cards.has(card.cardId)) {
        skipped += 1; // API dupes: first wins
        continue;
    }
    cards.set(card.cardId, card);
}
const list = [...cards.values()].sort((a, b) => a.cardId - b.cardId);

fs.mkdirSync(DATA_DIR, { recursive: true });
const entries = [];
for (const { file, body } of buildShards(list)) {
    fs.writeFileSync(path.join(DATA_DIR, file), body);
    entries.push({ file, bytes: body.length, sha256: sha256(body) });
}

const manifest = stableJson({
    schemaVersion: '2.0',
    source: 'ygoprodeck-api-v7',
    cardCount: list.length,
    shardSize: SHARD_SIZE,
    duplicateRecords: skipped,
    shards: entries,
    totalSha256: sha256(Buffer.concat(entries.map((e) => Buffer.from(e.sha256, 'hex'))))
});
fs.writeFileSync(path.join(DATA_DIR, 'manifest.json'), Buffer.from(manifest, 'utf8'));

const totalBytes = entries.reduce((sum, e) => sum + e.bytes, 0);
console.log(`wrote ${entries.length} shards + manifest: ${list.length} cards, ` +
    `~${(totalBytes / 1e6).toFixed(1)} MB total (${skipped} dupes skipped)`);
