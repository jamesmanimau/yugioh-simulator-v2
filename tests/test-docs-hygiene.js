'use strict';
// Docs hygiene: the session-loaded files must exist and stay within their size
// limits (RULES.md and MEMORY.md <= 120 lines), so every session can rely on
// them without blowing the context budget.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { existsSync, readFileSync, statSync } = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const docs = path.join(root, 'docs');
const duelDocs = path.join(docs, 'duel-mode');
const REQUIRED_DUEL_DOCS = [
    'ASSUMPTION-AUDIT.md', 'variables.md', 'PRD.md', 'ARCHITECTURE.md',
    'DESIGN.md', 'RULES.md', 'TASKS.md', 'MEMORY.md',
];
const REQUIRED_ADRS = [
    '001-engine-path.md', '002-license-and-ip.md',
    '003-gamestate-separation.md', '004-data-and-asset-hosting.md',
    '005-bot-architecture.md', '006-testing-without-npm.md',
];

test('all duel-mode planning docs exist', () => {
    for (const f of REQUIRED_DUEL_DOCS) {
        assert.ok(existsSync(path.join(duelDocs, f)), `missing docs/duel-mode/${f}`);
    }
});

test('all six ADRs exist', () => {
    for (const f of REQUIRED_ADRS) {
        assert.ok(existsSync(path.join(docs, 'adr', f)), `missing docs/adr/${f}`);
    }
});

test('session-loaded docs stay within 120 lines', () => {
    for (const f of ['RULES.md', 'MEMORY.md']) {
        const lines = readFileSync(path.join(duelDocs, f), 'utf8').split('\n').length;
        assert.ok(lines <= 120, `${f} is ${lines} lines (limit 120) — compact + archive it`);
    }
});

test('ADR-001 and ADR-002 remain "proposed" until the owner approves them', () => {
    for (const f of ['001-engine-path.md', '002-license-and-ip.md']) {
        const src = readFileSync(path.join(docs, 'adr', f), 'utf8');
        assert.match(src, /Status:\*{0,2}\s*proposed/i, `${f} must stay proposed until owner sign-off`);
        assert.doesNotMatch(src, /Status:\*{0,2}\s*accepted/i, `${f} must not self-accept`);
    }
});

test('AGPL code never lands in the repo (no banned third-party sources)', () => {
    const banned = ['edopro', 'CardScripts', 'windbot'];
    const jsDuel = path.join(root, 'js', 'duel');
    if (existsSync(jsDuel)) {
        // .spike/ is gitignored so it is outside the repo tree; js/duel must stay clean-room.
        const { readdirSync } = require('node:fs');
        const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
            e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
        for (const file of walk(jsDuel)) {
            const src = readFileSync(file, 'utf8');
            for (const b of banned) {
                assert.ok(!src.toLowerCase().includes(b.toLowerCase()),
                    `${file} mentions "${b}" — verify no AGPL code is copied (ADR-002)`);
            }
        }
    }
});

test('no runtime npm dependencies are introduced', () => {
    assert.ok(!existsSync(path.join(root, 'package.json')),
        'root package.json would violate the no-runtime-deps constraint; tools/tests use node --test only');
    assert.ok(!existsSync(path.join(root, 'package-lock.json')));
});

test('no YGOPRODeck image hotlinks in JS sources', () => {
    const { readdirSync } = require('node:fs');
    const jsDir = path.join(root, 'js');
    for (const f of readdirSync(jsDir)) {
        if (!f.endsWith('.js') || f.startsWith('jquery') || f === 'iconify.min.js' || f === 'client.min.js') continue;
        const src = readFileSync(path.join(jsDir, f), 'utf8');
        assert.ok(!/images\.ygoprodeck\.com/.test(src), `${f} hotlinks YGOPRODeck images — forbidden`);
    }
});
