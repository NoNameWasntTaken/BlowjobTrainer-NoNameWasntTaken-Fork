import { atomWithStorage } from 'jotai/utils'

const STORAGE_KEY = 'levelEditorTaskClipboard'

/**
 * @param {unknown} raw
 * @returns {object | null}
 */
function normalizeClipboardTask(raw) {
    if (raw == null) return null
    if (typeof raw !== 'object') return null
    if (raw.type == null) return null
    return raw
}

const clipboardStorage = {
    /**
     * @param {string} _key
     * @param {null} initialValue
     */
    getItem(_key, initialValue) {
        try {
            const raw = localStorage.getItem(STORAGE_KEY)
            if (raw == null) return initialValue
            const parsed = JSON.parse(raw)
            return normalizeClipboardTask(parsed) ?? initialValue
        } catch {
            return initialValue
        }
    },
    /**
     * @param {string} _key
     * @param {object | null} value
     */
    setItem(_key, value) {
        try {
            if (value == null) {
                localStorage.removeItem(STORAGE_KEY)
            } else {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
            }
        } catch {
            /* ignore quota / private mode */
        }
    },
    removeItem() {
        try {
            localStorage.removeItem(STORAGE_KEY)
        } catch {
            /* ignore */
        }
    },
}

/** Single copied custom-level task (full config). Persists across navigation and reloads. */
export const levelEditorTaskClipboardAtom = atomWithStorage(
    STORAGE_KEY,
    null,
    clipboardStorage,
    { getOnInit: true }
)
