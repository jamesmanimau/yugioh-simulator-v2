/**
 * Pure state guards shared by Free Mode (legacy importState / PlayLog) and,
 * later, Duel Mode. No jQuery, no DOM — loadable under plain Node for tests
 * (ADR-006). Exposed as global StateGuards (window in browser, globalThis in
 * Node). See docs/duel-mode/ASSUMPTION-AUDIT.md items 12/20 and task 0A-3.
 */
(function (g) {
    'use strict';

    var MAX_STATE_BYTES = 10 * 1024 * 1024; // reject huge payloads before JSON.parse work
    var MAX_ITEMS = 2000;

    var POSITIONS = ['hand', 'deck', 'exdeck', 'summon', 'st', 'fz', 'graveyard', 'banish'];
    var REQUIRED_ITEM_FIELDS = ['cardId', 'uuid', 'name', 'position', 'foldState', 'switchState'];

    var ESCAPE_MAP = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '`': '&#96;'
    };

    /** Escape a value for safe interpolation into HTML text AND attributes. */
    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"'`]/g, function (ch) {
            return ESCAPE_MAP[ch];
        });
    }

    /** Approximate byte size of a state (string as-is, object via JSON). */
    function stateBytes(state) {
        if (typeof state === 'string') return state.length;
        try {
            return JSON.stringify(state).length;
        } catch (e) {
            return Infinity; // unserializable → reject
        }
    }

    /**
     * Validate a Free Mode v1 board state before importState() rebuilds the
     * board from it. Returns { ok: true } or { ok: false, error: message }.
     * Deliberately does NOT mutate the state.
     */
    function validateBoardState(state) {
        if (state == null) return invalid('state is empty');
        if (typeof state === 'string') {
            if (state.length === 0) return invalid('state string is empty');
            if (state.length > MAX_STATE_BYTES) return invalid('state exceeds ' + MAX_STATE_BYTES + ' bytes');
            try {
                state = JSON.parse(state);
            } catch (e) {
                return invalid('state is not valid JSON: ' + e.message);
            }
        }
        if (typeof state !== 'object') return invalid('state must be an object or JSON string');
        if (stateBytes(state) > MAX_STATE_BYTES) return invalid('state exceeds ' + MAX_STATE_BYTES + ' bytes');

        if (!Array.isArray(state.items)) return invalid('state.items must be an array');
        if (state.items.length > MAX_ITEMS) return invalid('state.items exceeds ' + MAX_ITEMS + ' cards');
        if (state.version !== undefined && typeof state.version !== 'string') {
            return invalid('state.version must be a string');
        }

        for (var i = 0; i < state.items.length; i++) {
            var item = state.items[i];
            if (item == null || typeof item !== 'object') return invalid('items[' + i + '] is not an object');
            for (var f = 0; f < REQUIRED_ITEM_FIELDS.length; f++) {
                var field = REQUIRED_ITEM_FIELDS[f];
                if (!(field in item)) return invalid('items[' + i + '] is missing "' + field + '"');
            }
            if (POSITIONS.indexOf(item.position) === -1) {
                return invalid('items[' + i + '] has invalid position "' + item.position + '"');
            }
            if (['normal', 'fold'].indexOf(item.foldState) === -1) {
                return invalid('items[' + i + '] has invalid foldState "' + item.foldState + '"');
            }
            if (['attack', 'defense'].indexOf(item.switchState) === -1) {
                return invalid('items[' + i + '] has invalid switchState "' + item.switchState + '"');
            }
            if (typeof item.name !== 'string') return invalid('items[' + i + '].name must be a string');
        }
        return { ok: true };
    }

    function invalid(message) {
        return { ok: false, error: message };
    }

    g.StateGuards = Object.freeze({
        escapeHtml: escapeHtml,
        validateBoardState: validateBoardState,
        stateBytes: stateBytes,
        MAX_STATE_BYTES: MAX_STATE_BYTES,
        MAX_ITEMS: MAX_ITEMS,
        POSITIONS: POSITIONS.slice()
    });
})(typeof window !== 'undefined' ? window : globalThis);
