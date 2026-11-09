/**
 * Migration: Free Mode v1 export -> Duel Mode GameState v2 (task 0B-2).
 *
 * v1 (board.exportState, version "1.0") is single-sided: every card sits in
 * one of hand/deck/exdeck/summon/st/fz/graveyard/banish with a slot token in
 * collection_order ("ss1".."ss5", "exss1"/"exss2", "st1".."st5", "fz1") or a
 * numeric stack index. Migration maps it all onto player 0 of a v2 state;
 * player 1 starts empty. Pure — testable in Node (ADR-003/006).
 */

import { GameState, createCard } from './gamestate.mjs';

/** v1 slot token -> mz/stz slot index. */
const SLOT_MAP = {
    ss1: 0, ss2: 1, ss3: 2, ss4: 3, ss5: 4,
    exss1: 5, exss2: 6, // extra monster zones (shared in v2)
    st1: 0, st2: 1, st3: 2, st4: 3, st5: 4,
    fz1: null
};

/** v1 position -> v2 zone key. */
const ZONE_MAP = {
    hand: 'hand', deck: 'deck', exdeck: 'extra',
    graveyard: 'gy', banish: 'banished',
    summon: 'mz', st: 'stz', fz: 'fz'
};

export function migrateV1toV2(v1State, opts = {}) {
    if (v1State == null || typeof v1State !== 'object') {
        throw new Error('v1 state must be an object');
    }
    if (typeof v1State === 'string') v1State = JSON.parse(v1State);
    if (v1State.version !== undefined && v1State.version !== '1.0') {
        throw new Error(`expected v1 state (version "1.0"), got "${v1State.version}"`);
    }
    if (!Array.isArray(v1State.items)) throw new Error('v1 state.items must be an array');

    const state = new GameState({ seed: opts.seed ?? null });
    state.mode = opts.mode ?? 'duel-import';

    for (const item of v1State.items) {
        if (item == null || typeof item !== 'object') {
            throw new Error('v1 items contain a non-object entry');
        }
        const zone = ZONE_MAP[item.position];
        if (zone === undefined) {
            throw new Error(`v1 card "${item.uuid}" has unmapped position "${item.position}"`);
        }

        const card = createCard({
            cardId: item.cardId ?? 0,
            uuid: item.uuid ?? undefined,
            name: typeof item.name === 'string' ? item.name : '',
            description: item.description ?? '',
            imageURL: item.imageURL ?? '',
            faceUp: item.foldState !== 'fold',
            position: item.switchState === 'defense' ? 'defense' : 'attack'
        });

        let slot = null;
        if (zone === 'mz' || zone === 'stz' || zone === 'fz') {
            const token = String(item.collection_order ?? '');
            slot = zone === 'fz' ? null : (token in SLOT_MAP ? SLOT_MAP[token] : undefined);
            if (zone === 'fz' && !(token === 'fz1' || token === '' || token === 'null')) {
                throw new Error(`v1 card "${item.uuid}" has invalid fz token "${token}"`);
            }
            if ((zone === 'mz' || zone === 'stz') && slot === undefined) {
                throw new Error(`v1 card "${item.uuid}" has invalid ${zone} slot token "${token}"`);
            }
        }
        state.placeCard(card, 0, zone, slot, { position: card.position });
    }

    // Xyz materials ride beneath their monster in v1 (isOverlap); keep the flag
    // as data so the engine layer can rebuild stacking later.
    for (const { card, } of state.cards()) {
        const item = v1State.items.find((i) => i.uuid === card.uuid);
        if (item && (item.isOverlap || item.isOverlay || item.overlap_order)) {
            card.overlay = {
                isMaterial: item.isOverlap === true,
                order: item.overlap_order ?? 0
            };
        }
    }

    return state;
}
