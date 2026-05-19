/**
 * Custom levels can be grouped into up to five subfolders for the level selection UI.
 */

export const CUSTOM_SUBFOLDER_COUNT = 5

export const DEFAULT_CUSTOM_SUBFOLDER = 1

export function defaultCustomFolderLabels() {
    return Array.from({ length: CUSTOM_SUBFOLDER_COUNT }, (_, i) => `Folder ${i + 1}`)
}

/**
 * @param {unknown} n
 * @returns {number} Integer in [1, CUSTOM_SUBFOLDER_COUNT]
 */
export function normalizeCustomSubfolder(n) {
    const x = Number(n)
    if (!Number.isFinite(x)) return DEFAULT_CUSTOM_SUBFOLDER
    const r = Math.round(x)
    if (r < 1) return 1
    if (r > CUSTOM_SUBFOLDER_COUNT) return CUSTOM_SUBFOLDER_COUNT
    return r
}

/**
 * Ensure profile has a full-length folder name array (missing entries use defaults).
 * @param {unknown} arr
 * @returns {string[]}
 */
export function normalizeCustomLevelFolderNamesArray(arr) {
    const defaults = defaultCustomFolderLabels()
    if (!Array.isArray(arr)) return [...defaults]
    return defaults.map((d, i) => (typeof arr[i] === 'string' ? arr[i] : d))
}

/**
 * Default global folder-name sets (concealed = hidden content off, revealed = hidden content on).
 */
export function createDefaultCustomLevelFolderNameSets() {
    const row = defaultCustomFolderLabels()
    return {
        concealed: [...row],
        revealed: [...row],
    }
}

/**
 * @param {unknown} raw
 * @returns {{ concealed: string[], revealed: string[] }}
 */
export function normalizeCustomLevelFolderNameSets(raw) {
    const defs = createDefaultCustomLevelFolderNameSets()
    if (!raw || typeof raw !== 'object') return defs
    const o = /** @type {{ concealed?: unknown, revealed?: unknown }} */ (raw)
    return {
        concealed: normalizeCustomLevelFolderNamesArray(o.concealed),
        revealed: normalizeCustomLevelFolderNamesArray(o.revealed),
    }
}

/**
 * Which name row to use for Training / editor labels for the current hidden-content mode.
 * @param {{ concealed: string[], revealed: string[] }|null|undefined} sets
 * @param {boolean} showHiddenContent
 */
export function pickCustomLevelFolderNames(sets, showHiddenContent) {
    const normalized = normalizeCustomLevelFolderNameSets(sets)
    return showHiddenContent ? normalized.revealed : normalized.concealed
}

/**
 * Label shown for a 1-based folder slot (empty / whitespace → default "Folder N").
 * @param {string[]|undefined} names
 * @param {number} slot1based
 */
export function customFolderDisplayLabel(names, slot1based) {
    const i = slot1based - 1
    const n = names?.[i]
    if (typeof n === 'string' && n.trim() !== '') return n.trim()
    return `Folder ${slot1based}`
}
