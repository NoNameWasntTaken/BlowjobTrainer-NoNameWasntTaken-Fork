import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

// marker color
export const markerColorAtom = atom("white");

// Default sensitivity values
export const sensitivityAtom = atom({ r: 30, g: 30, b: 30 });

// add the current state
export const currentStateAtom = atom(0);

// Default clap sensitivity threshold
export const clapSensitivityAtom = atom(0.3)

/** @typedef {'off' | 'clap' | 'speech'} MicAudioTestMode */

const LEGACY_CLAP_TEST_KEY = 'clapTestEnabled'

function normalizeMicAudioTestMode(v) {
    if (v === 'off' || v === 'clap' || v === 'speech') return v
    return 'off'
}

/** Persisted Mic tab: which audio test owns the mic (mutually exclusive). Default off. */
const micAudioTestModeStorage = {
    getItem(key, initialValue) {
        try {
            const stored = localStorage.getItem(key)
            if (stored != null) {
                try {
                    const parsed = JSON.parse(stored)
                    return normalizeMicAudioTestMode(parsed)
                } catch {
                    return 'off'
                }
            }
            const legacy = localStorage.getItem(LEGACY_CLAP_TEST_KEY)
            if (legacy != null) {
                try {
                    const b = JSON.parse(legacy)
                    if (b === true) return 'clap'
                    if (b === false) return 'off'
                } catch {
                    /* ignore */
                }
            }
        } catch {
            return 'off'
        }
        return initialValue
    },
    setItem(key, value) {
        localStorage.setItem(key, JSON.stringify(value))
    },
    removeItem(key) {
        localStorage.removeItem(key)
    },
}

export const micAudioTestModeAtom = atomWithStorage(
    'micAudioTestMode',
    /** @type {MicAudioTestMode} */ ('off'),
    micAudioTestModeStorage,
    { getOnInit: true }
)
