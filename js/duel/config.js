/**
 * Duel Mode feature flag.
 * OFF until Gate C (see docs/duel-mode/TASKS.md). No UI may show the mode
 * entry while this is false. Consumed via window.DUEL_MODE.
 */
(function (global) {
    'use strict';
    global.DUEL_MODE = Object.freeze({
        enabled: false,
        version: '0.1.0'
    });
})(typeof window !== 'undefined' ? window : globalThis);
