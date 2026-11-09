/**
 * Card schema v2 — pure normalization + validation (task 1-2, ADR-004).
 *
 * Single source of truth for turning a raw YGOPRODeck v7 card record into
 * our stored schema (docs/duel-mode/ARCHITECTURE.md §3). Used by
 * tools/fetch-cards.js at pipeline time and by the Duel Mode runtime.
 * Pure: no DOM, no timers, no network, no globals — Node-testable (ADR-006).
 *
 * Image policy (ADR-004): we never hotlink. `image.url` is the *cache source*
 * for on-demand fetching into IndexedDB; the local self-hosted path is
 * derived: asset/card/{cardId}.jpeg.
 */

export const SCHEMA_VERSION = '2.0';

export const KINDS = Object.freeze(['monster', 'spell', 'trap']);
export const FRAME_TYPES = Object.freeze([
    'normal', 'effect', 'ritual', 'fusion', 'synchro', 'xyz', 'link',
    'pendulum', 'spell', 'trap', 'skill'
]);

/** Raw YGOPRODeck record -> normalized card record. Throws on garbage. */
export function normalizeCard(raw) {
    if (raw == null || typeof raw !== 'object') throw new Error('card record must be an object');
    if (!Number.isInteger(raw.id)) throw new Error('card id must be an integer');
    if (typeof raw.name !== 'string' || raw.name.length === 0) {
        throw new Error(`card ${raw.id}: missing name`);
    }
    if (typeof raw.desc !== 'string') throw new Error(`card ${raw.id}: missing desc`);

    const kind = kindOf(raw);
    const card = {
        schemaVersion: SCHEMA_VERSION,
        cardId: raw.id,
        name: raw.name,
        description: raw.desc,
        kind,
        frameType: typeof raw.frameType === 'string' ? raw.frameType : null,
        image: {
            url: raw.card_images?.[0]?.image_url ?? null,
            smallUrl: raw.card_images?.[0]?.image_url_small ?? null
        }
    };

    if (kind === 'monster') {
        card.attribute = str(raw.attribute);
        card.race = str(raw.race);
        card.atk = num(raw.atk);
        card.def = num(raw.def);
        if (raw.frameType === 'link') {
            card.link = num(raw.linkval ?? raw.link); // YGOPRODeck field is `linkval`
            card.linkMarkers = Array.isArray(raw.linkmarkers) ? raw.linkmarkers.map(String) : [];
        } else {
            card.level = num(raw.level); // level (normal/effect/synchro) or rank (xyz/pendulum-xyz)
        }
        if (String(raw.frameType).includes('pendulum') || raw.scale != null) {
            card.scale = num(raw.scale);
        }
    } else {
        card.subtype = str(raw.race); // e.g. 'Quick-Play', 'Counter', 'Continuous'
    }

    if (raw.archetype != null) card.archetype = str(raw.archetype);
    if (raw.banlist_info != null) card.banlist = raw.banlist_info;

    return card;
}

function kindOf(raw) {
    const t = String(raw.type ?? raw.frameType ?? '').toLowerCase();
    if (t.includes('spell')) return 'spell';
    if (t.includes('trap')) return 'trap';
    if (t.includes('skill')) return 'spell'; // skill cards behave like non-monster cards
    if (t.includes('monster') || ['normal', 'effect', 'ritual', 'fusion', 'synchro', 'xyz', 'link', 'pendulum'].includes(raw.frameType)) {
        return 'monster';
    }
    throw new Error(`card ${raw.id ?? '?'}: unknown type "${raw.type ?? raw.frameType}"`);
}

function str(v) {
    return typeof v === 'string' ? v : null;
}

function num(v) {
    return typeof v === 'number' ? v : (v == null ? null : Number(v));
}

/** Validate a normalized card record (schema fixture tests + import safety). */
export function validateCard(card) {
    const problems = [];
    if (card == null || typeof card !== 'object') return ['card must be an object'];
    if (card.schemaVersion !== SCHEMA_VERSION) problems.push(`schemaVersion must be "${SCHEMA_VERSION}"`);
    if (!Number.isInteger(card.cardId)) problems.push('cardId must be an integer');
    if (typeof card.name !== 'string' || !card.name) problems.push('name must be a non-empty string');
    if (typeof card.description !== 'string') problems.push('description must be a string');
    if (!KINDS.includes(card.kind)) problems.push(`kind must be one of ${KINDS.join('/')}`);
    if (card.kind === 'monster') {
        if (card.frameType === 'link' && (card.link == null || !Array.isArray(card.linkMarkers))) {
            problems.push('link monster needs link + linkMarkers');
        }
        if (card.frameType !== 'link' && card.level == null) {
            problems.push('non-link monster needs level');
        }
    }
    if (card.image == null || typeof card.image !== 'object') problems.push('image must be an object');
    return problems;
}

/** Local self-hosted image path (cardId-keyed). */
export function localImagePath(cardId) {
    return `asset/card/${cardId}.jpeg`;
}
