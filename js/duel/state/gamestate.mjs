/**
 * Pure GameState for Duel Mode (task 0B-1, ADR-003).
 *
 * Laws obeyed (docs/duel-mode/RULES.md):
 * - Law 4: GameState/engine is the single source of truth. UI renders events.
 * - NO DOM, NO timers, NO globals — runs in Node and in a Web Worker.
 * - Everything is JSON-serializable (structured-clone safe for postMessage).
 *
 * v2 state schema (docs/duel-mode/ARCHITECTURE.md §3):
 * { version:'2.0', mode:'duel', seed, players:[Player], turn, chain, eventLog }
 * Player: { lp, deck[], hand[], extra[], gy[], banished[], field:{mz[7], stz[5], fz} }
 *  mz: monster zones 0-4 = main ss1-ss5, 5/6 = extra monster zones (exss1/exss2, shared).
 */

export const STATE_VERSION = '2.0';
export const MODE_DUEL = 'duel';
export const ZONES = Object.freeze(['deck', 'hand', 'extra', 'gy', 'banished', 'mz', 'stz', 'fz']);
export const POSITIONS = Object.freeze(['attack', 'defense']);

const MONSTER_ZONES = 7; // 5 main + 2 extra monster zones
const ST_ZONES = 5;
const DEFAULT_LP = 8000;

let uuidCounter = 0;

/** Make a duel card. Pure data; ids are deterministic per state seed + counter. */
export function createCard(data) {
    if (data == null || typeof data !== 'object') throw new Error('card data must be an object');
    const card = {
        cardId: data.cardId ?? 0,
        uuid: data.uuid ?? null,
        name: data.name ?? '',
        description: data.description ?? '',
        imageURL: data.imageURL ?? '',
        type: data.type ?? null, // { monster|spell|trap, atk?, def?, level?, ... } (schema v2, Tahap 1)
        owner: null,            // 0/1, set on placement
        zone: null,             // ZONES key
        slot: null,             // mz/stz index or null for lists
        faceUp: data.faceUp ?? true,
        position: data.position ?? null, // 'attack' | 'defense' (monsters in mz)
        counters: 0
    };
    return card;
}

function emptyPlayer(owner) {
    return {
        lp: DEFAULT_LP,
        deck: [], hand: [], extra: [], gy: [], banished: [],
        field: { mz: new Array(MONSTER_ZONES).fill(null), stz: new Array(ST_ZONES).fill(null), fz: null }
    };
}

export class GameState {
    constructor(opts = {}) {
        this.version = STATE_VERSION;
        this.mode = MODE_DUEL;
        this.seed = opts.seed ?? null;
        this.players = [emptyPlayer(0), emptyPlayer(1)];
        this.turn = { player: 0, phase: 'draw', count: 1 };
        this.chain = [];
        this.eventLog = [];
        this._uuidCounter = 0;
    }

    // -- card placement ----------------------------------------------------

    _nextUuid() {
        this._uuidCounter += 1;
        return `v2-${this.seed ?? '0'}-${String(this._uuidCounter).padStart(6, '0')}`;
    }

    /** Lists: deck, hand, extra, gy, banished. Slots: mz, stz, fz. */
    placeCard(card, player, zone, slot = null, opts = {}) {
        this._checkPlayer(player);
        if (!ZONES.includes(zone)) throw new Error(`unknown zone "${zone}"`);
        if (card.zone != null && card.owner != null) {
            throw new Error(`card ${card.uuid ?? '?'} is already on the board; use moveCard`);
        }
        if (!card.uuid) card.uuid = this._nextUuid();
        card.owner = player;
        card.zone = zone;
        if (zone === 'mz' || zone === 'stz') {
            if (!Number.isInteger(slot) || slot < 0 || slot >= this.players[player].field[zone].length) {
                throw new Error(`invalid ${zone} slot ${slot}`);
            }
            if (this.players[player].field[zone][slot]) {
                throw new Error(`${zone}[${slot}] is occupied`);
            }
            card.slot = slot;
            this.players[player].field[zone][slot] = card;
            if (zone === 'mz' && !POSITIONS.includes(card.position)) {
                card.position = POSITIONS.includes(opts.position) ? opts.position : 'attack';
            }
        } else if (zone === 'fz') {
            if (this.players[player].field.fz) throw new Error('fz is occupied');
            card.slot = null;
            this.players[player].field.fz = card;
        } else {
            card.slot = null;
            this.players[player][zone].push(card);
        }
        this._log({ t: 'place', uuid: card.uuid, player, zone, slot });
        return card;
    }

    /** Move a card between zones. Slots must be free (or null for list append). */
    moveCard(uuid, zone, slot = null, opts = {}) {
        const { player, card } = this._find(uuid);
        if (player !== this.turn.player && !opts.forceOwner) {
            // engine rule checks (legality) live in the engine layer; here we only
            // keep data invariants, but never move another player's card silently.
            throw new Error(`cannot move card of player ${player} on turn of player ${this.turn.player}`);
        }
        this._detach(player, card);
        const from = { zone: card.zone, slot: card.slot };
        card.zone = null; // re-place
        this.placeCard(card, player, zone, slot, opts);
        this._log({ t: 'move', uuid, player, from, to: { zone, slot } });
        return card;
    }

    removeCard(uuid) {
        const { player, card } = this._find(uuid);
        this._detach(player, card);
        this._log({ t: 'remove', uuid, player });
        return card;
    }

    _detach(player, card) {
        if (card.zone === 'mz' || card.zone === 'stz') {
            this.players[player].field[card.zone][card.slot] = null;
        } else if (card.zone === 'fz') {
            this.players[player].field.fz = null;
        } else {
            const list = this.players[player][card.zone];
            const i = list.indexOf(card);
            if (i === -1) throw new Error(`card ${card.uuid} lost from zone ${card.zone}`);
            list.splice(i, 1);
        }
        card.slot = null;
    }

    _find(uuid) {
        for (const player of [0, 1]) {
            const p = this.players[player];
            const lists = [p.deck, p.hand, p.extra, p.gy, p.banished];
            for (const list of lists) {
                const card = list.find((c) => c.uuid === uuid);
                if (card) return { player, card };
            }
            for (const zone of ['mz', 'stz']) {
                const card = p.field[zone].find((c) => c && c.uuid === uuid);
                if (card) return { player, card };
            }
            if (p.field.fz && p.field.fz.uuid === uuid) return { player, card: p.field.fz };
        }
        throw new Error(`no card with uuid "${uuid}"`);
    }

    // -- serialization -----------------------------------------------------

    toJSON() {
        return {
            version: this.version, mode: this.mode, seed: this.seed,
            players: this.players, turn: this.turn,
            chain: this.chain, eventLog: this.eventLog
        };
    }

    static fromJSON(data) {
        if (data == null || typeof data !== 'object') throw new Error('state must be an object');
        if (data.version !== STATE_VERSION) {
            throw new Error(`unsupported state version "${data.version}" (expected ${STATE_VERSION})`);
        }
        const s = new GameState({ seed: data.seed ?? null });
        if (!Array.isArray(data.players) || data.players.length !== 2) {
            throw new Error('state.players must be an array of 2');
        }
        s.players = data.players;
        s.turn = data.turn ?? s.turn;
        s.chain = data.chain ?? [];
        s.eventLog = data.eventLog ?? [];
        s._uuidCounter = data.eventLog ? data.eventLog.length : 0; // continue uuid stream deterministically
        return s;
    }

    // -- invariants --------------------------------------------------------

    _checkPlayer(player) {
        if (player !== 0 && player !== 1) throw new Error(`player must be 0 or 1, got "${player}"`);
    }

    _log(entry) {
        this.eventLog.push(Object.freeze({ ...entry, at: this.eventLog.length }));
    }

    /** Iterate every card in the state (both players). */
    *cards() {
        for (const player of [0, 1]) {
            const p = this.players[player];
            for (const list of [p.deck, p.hand, p.extra, p.gy, p.banished]) {
                for (const card of list) yield { player, card };
            }
            for (const zone of ['mz', 'stz']) {
                for (const card of p.field[zone]) if (card) yield { player, card };
            }
            if (p.field.fz) yield { player, card: p.field.fz };
        }
    }
}
