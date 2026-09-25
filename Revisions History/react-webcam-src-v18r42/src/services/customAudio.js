// Key names stay symbolic so a level can be paired with different voice packs.
export const OPEN_CUSTOM_CUE_SCHEMA = 'open'

export const normalizeCustomCueName = name => name.trim().replace(/^custom\./i, '').trim()

export const validateCustomCueName = name => {
    const key = normalizeCustomCueName(name)
    if (!key) return 'Enter a name for this key.'
    if (/[\\/]/.test(key) || [...key].some(char => char.charCodeAt(0) < 32) || ['__proto__', 'constructor', 'prototype'].includes(key)) {
        return 'Use a key name without slashes or control characters.'
    }
    return ''
}

export const hasAudio = value => typeof value === 'string' ? value.length > 0 :
    Array.isArray(value) && value.some(item => typeof item === 'string' && item.length > 0)

// Older levels stored release keys under custom mode. Recognize their category.
export const getAudioMode = task => {
    if (task.audioMode === 'standard') return 'standard'
    if (task.audioMode === 'release' || /^release\./i.test(task.audio || '')) return 'release'
    if (task.audioMode === 'custom' || /^custom\./i.test(task.audio || '')) return 'custom'
    return 'standard'
}

const cueSort = (a, b) => a.localeCompare(b, undefined, { numeric: true })

function customNameRef(key) {
    return `Custom.${key}`
}

/**
 * Cue keys stored on the pack. An empty placeholder still counts so a cue just added stays visible.
 * Empty unused Custom1–Custom40 slots are not invented here.
 */
export function listCustomCueKeys(pack) {
    const files = pack?.audioFiles?.Custom
    if (!files || typeof files !== 'object' || Array.isArray(files)) return []
    return Object.keys(files)
        .filter((key) => !validateCustomCueName(key))
        .sort(cueSort)
}

export const getCustomAudioOptions = (pack) => {
    return Object.entries(pack?.audioFiles?.Custom || {})
        .filter(([key, value]) => !validateCustomCueName(key) && hasAudio(value))
        .map(([key]) => ({
            value: customNameRef(key),
            label: customNameRef(key),
        }))
        .sort((a, b) => cueSort(a.value, b.value))
}

export const canonicalAudioReference = value => typeof value === 'string' ? value.replace(/^custom\./i, 'Custom.') : value

export function addCustomCue(pack, name) {
    const message = validateCustomCueName(name)
    if (message) return { pack, error: message }
    const key = normalizeCustomCueName(name)
    const ref = customNameRef(key)
    const custom = { ...(pack?.audioFiles?.Custom || {}) }
    if (Object.prototype.hasOwnProperty.call(custom, key)) {
        return { pack, error: 'A cue with that key already exists.' }
    }
    if (pack?.audioRefAliases?.[ref]) {
        return { pack, error: 'That name is already used as a previous voice key.' }
    }
    custom[key] = ''
    const next = {
        ...pack,
        audioFiles: { ...(pack?.audioFiles || {}), Custom: custom },
        customCueSchema: OPEN_CUSTOM_CUE_SCHEMA,
    }
    delete next.customNames
    return { pack: next, error: '' }
}

export function renameCustomCue(pack, oldKey, newName) {
    const message = validateCustomCueName(newName)
    if (message) return { pack, error: message }
    const nextKey = normalizeCustomCueName(newName)
    if (nextKey === oldKey) return { pack, error: '' }

    const custom = { ...(pack?.audioFiles?.Custom || {}) }
    const oldRef = customNameRef(oldKey)
    const newRef = customNameRef(nextKey)
    if (!Object.prototype.hasOwnProperty.call(custom, oldKey)) {
        return { pack, error: 'That cue does not exist.' }
    }
    if (Object.prototype.hasOwnProperty.call(custom, nextKey)) {
        return { pack, error: 'A cue with that key already exists.' }
    }

    const aliases = { ...(pack?.audioRefAliases || {}) }
    const claimedBy = aliases[newRef]
    if (claimedBy && claimedBy !== oldRef) {
        return { pack, error: 'That name is already used as a previous voice key.' }
    }

    custom[nextKey] = custom[oldKey]
    delete custom[oldKey]

    for (const [from, to] of Object.entries(aliases)) {
        if (to !== oldRef) continue
        if (from === newRef) delete aliases[from]
        else aliases[from] = newRef
    }
    delete aliases[newRef]
    aliases[oldRef] = newRef

    const next = {
        ...pack,
        audioFiles: { ...(pack?.audioFiles || {}), Custom: custom },
        audioRefAliases: aliases,
        customCueSchema: OPEN_CUSTOM_CUE_SCHEMA,
    }
    delete next.customNames
    return { pack: next, error: '' }
}

export function deleteCustomCue(pack, key) {
    const custom = { ...(pack?.audioFiles?.Custom || {}) }
    delete custom[key]
    const ref = customNameRef(key)
    const aliases = { ...(pack?.audioRefAliases || {}) }
    for (const [from, to] of Object.entries(aliases)) {
        if (from === ref || to === ref) delete aliases[from]
    }
    const next = {
        ...pack,
        audioFiles: { ...(pack?.audioFiles || {}), Custom: custom },
        customCueSchema: OPEN_CUSTOM_CUE_SCHEMA,
    }
    delete next.customNames
    if (Object.keys(aliases).length > 0) next.audioRefAliases = aliases
    else delete next.audioRefAliases
    return next
}
