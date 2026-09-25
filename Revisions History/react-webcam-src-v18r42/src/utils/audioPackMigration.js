import { AUDIO_REF_ALIASES } from '../constants/audioRefAliases'
import {
    OPEN_CUSTOM_CUE_SCHEMA,
    canonicalAudioReference,
    normalizeCustomCueName,
    validateCustomCueName,
} from '../services/customAudio'

export const LEGACY_LVL_CATEGORIES = new Set([
    'Lvl_begint',
    'Lvl_quickbg',
    'Lvl_basicr',
    'Lvl_cockw',
])

/** @param {string} category */
export function isLegacyCategory(category) {
    return LEGACY_LVL_CATEGORIES.has(category)
}

function setPackKey(out, category, key, value) {
    if (!out[category]) {
        out[category] = {}
    }
    if (out[category][key] === undefined) {
        out[category][key] = value
    }
}

const LEVEL_KEY_RENAMES = {
    BEGINT_START: 'BEGINT_1_START',
    QUICKBG_START: 'QUICKBG_2_START',
    BASICR_START: 'BASICR_3_START',
    COCKW_START: 'COCKW_4_START',
    INTMED_5: 'INTMED_5_START',
    ENDURANCE_6: 'ENDURANCE_6_START',
    DEEPFOCUS_7: 'DEEPFOCUS_7_START',
    SPEED_8: 'SPEED_8_START',
    DEVOTION_9: 'DEVOTION_9_START',
    MAXDEPTH_10: 'MAXDEPTH_10_START',
    ELITE_11: 'ELITE_11_START',
    MANYLOAD_12: 'MANYLOAD_12_START',
}

const RANK_KEY_RENAMES = {
    BEGINT_END_BAD: 'BEGINT_1_END_BAD',
    BEGINT_END_GOOD: 'BEGINT_1_END_GOOD',
    BEGINT_END_PERFECT: 'BEGINT_1_END_PERFECT',
    QUICKBG_END_BAD: 'QUICKBG_2_END_BAD',
    QUICKBG_END_GOOD: 'QUICKBG_2_END_GOOD',
    QUICKBG_END_PERFECT: 'QUICKBG_2_END_PERFECT',
    COCKW_END: 'COCKW_4_END_PERFECT',
    COCKW_END_PERFECT: 'COCKW_4_END_PERFECT',
}

const RELEASE_KEY_RENAMES = {
    BASICR_PRE_RELEASE: 'BASICR_3_PRE_RELEASE',
    BASICR_POST_RELEASE: 'BASICR_3_POST_RELEASE',
    COCKW_PRE_RELEASE_1: 'COCKW_4_PRE_RELEASE_1',
    COCKW_PRE_RELEASE_2: 'COCKW_4_PRE_RELEASE_2',
    COCKW_PRE_RELEASE_3: 'COCKW_4_PRE_RELEASE_3',
    COCKW_POST_RELEASE: 'COCKW_4_POST_RELEASE',
}

function renameCategoryKeys(out, category, renames, { afterRename } = {}) {
    const cat = out[category]
    if (!cat) return
    for (const [oldKey, newKey] of Object.entries(renames)) {
        if (cat[oldKey] !== undefined && cat[newKey] === undefined) {
            cat[newKey] = cat[oldKey]
            delete cat[oldKey]
        }
    }
    afterRename?.(cat)
}

function renameLevelKeys(out) {
    renameCategoryKeys(out, 'Level', LEVEL_KEY_RENAMES, {
        afterRename: (level) => {
            delete level.START_00
        },
    })
}

function parseRef(ref) {
    const dot = ref.indexOf('.')
    if (dot === -1) return null
    return { category: ref.slice(0, dot), key: ref.slice(dot + 1) }
}

/**
 * Migrate legacy pack audioFiles (Lvl_* categories) to Level / Rank / Release keys.
 * @param {object|null|undefined} audioFiles
 * @returns {object}
 */
export function migrateAudioPackFiles(audioFiles) {
    if (!audioFiles || typeof audioFiles !== 'object') {
        return {}
    }

    const out = {}

    for (const [category, keys] of Object.entries(audioFiles)) {
        if (!LEGACY_LVL_CATEGORIES.has(category)) {
            out[category] = { ...(keys || {}) }
            continue
        }

        for (const [key, value] of Object.entries(keys || {})) {
            const legacyRef = `${category}.${key}`
            const canonicalRef = AUDIO_REF_ALIASES[legacyRef]
            const target = canonicalRef ? parseRef(canonicalRef) : null
            if (target) {
                setPackKey(out, target.category, target.key, value)
            } else {
                setPackKey(out, category, key, value)
            }
        }
    }

    for (const category of LEGACY_LVL_CATEGORIES) {
        delete out[category]
    }

    renameLevelKeys(out)
    renameCategoryKeys(out, 'Rank', RANK_KEY_RENAMES)
    renameCategoryKeys(out, 'Release', RELEASE_KEY_RENAMES)

    return out
}

function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value)
}

function copyValidCustomFiles(source) {
    const out = {}
    if (!isPlainObject(source)) return out
    for (const key of Object.keys(source)) {
        if (validateCustomCueName(key)) continue
        out[key] = source[key]
    }
    return out
}

function copyValidCustomNames(source) {
    const out = {}
    if (!isPlainObject(source)) return out
    for (const ref of Object.keys(source)) {
        if (!ref.startsWith('Custom.')) {
            out[ref] = source[ref]
            continue
        }
        const key = ref.slice('Custom.'.length)
        if (!key || validateCustomCueName(key)) continue
        out[ref] = source[ref]
    }
    return out
}

function copyValidCustomAliases(source) {
    const out = {}
    if (!isPlainObject(source)) return out
    for (const [from, to] of Object.entries(source)) {
        if (typeof from !== 'string' || typeof to !== 'string') continue
        const fromCanonical = canonicalAudioReference(from.trim())
        const toCanonical = canonicalAudioReference(to.trim())
        if (!fromCanonical.startsWith('Custom.') || !toCanonical.startsWith('Custom.')) continue
        const fromKey = normalizeCustomCueName(fromCanonical)
        const toKey = normalizeCustomCueName(toCanonical)
        if (!fromKey || !toKey || fromKey === toKey) continue
        if (validateCustomCueName(fromKey) || validateCustomCueName(toKey)) continue
        out[`Custom.${fromKey}`] = `Custom.${toKey}`
    }
    return out
}

/**
 * Turn a stored display label into the voice key.
 * Custom.CUSTOM1 with label PhaseTwo becomes the key PhaseTwo, and Custom.CUSTOM1
 * stays playable through an alias. Labels that are empty, invalid, or already taken
 * are dropped and the original key is left in place.
 */
function remapDisplayNamesToCueKeys(files, names, aliases) {
    const proposals = []
    for (const [ref, label] of Object.entries(names || {})) {
        if (!ref.startsWith('Custom.')) continue
        const oldKey = ref.slice('Custom.'.length)
        if (!oldKey || validateCustomCueName(oldKey)) continue
        if (typeof label !== 'string' || !label.trim()) continue
        const newKey = normalizeCustomCueName(label)
        if (!newKey || newKey === oldKey || validateCustomCueName(newKey)) continue
        proposals.push({ oldKey, newKey })
    }

    const claimedTargets = new Set()
    const accepted = []
    for (const proposal of proposals) {
        if (claimedTargets.has(proposal.newKey)) continue
        claimedTargets.add(proposal.newKey)
        accepted.push(proposal)
    }

    const leaving = new Set(accepted.map((proposal) => proposal.oldKey))
    const occupiedNameOnly = new Set()
    for (const ref of Object.keys(names || {})) {
        if (!ref.startsWith('Custom.')) continue
        const key = ref.slice('Custom.'.length)
        if (!key || leaving.has(key) || Object.prototype.hasOwnProperty.call(files, key)) continue
        occupiedNameOnly.add(key)
    }

    const renames = accepted.filter((proposal) => {
        const targetHasFile = Object.prototype.hasOwnProperty.call(files, proposal.newKey) && !leaving.has(proposal.newKey)
        return !targetHasFile && !occupiedNameOnly.has(proposal.newKey)
    })
    const moved = new Set(renames.map((proposal) => proposal.oldKey))
    const destination = new Map(renames.map((proposal) => [proposal.oldKey, proposal.newKey]))

    const nextFiles = {}
    for (const [key, value] of Object.entries(files)) {
        if (moved.has(key)) nextFiles[destination.get(key)] = value
        else nextFiles[key] = value
    }
    for (const proposal of renames) {
        if (!Object.prototype.hasOwnProperty.call(files, proposal.oldKey) && !Object.prototype.hasOwnProperty.call(nextFiles, proposal.newKey)) {
            nextFiles[proposal.newKey] = ''
        }
    }

    const nextAliases = { ...aliases }
    for (const proposal of renames) {
        const oldRef = `Custom.${proposal.oldKey}`
        const newRef = `Custom.${proposal.newKey}`
        for (const [from, to] of Object.entries(nextAliases)) {
            if (to !== oldRef) continue
            if (from === newRef) delete nextAliases[from]
            else nextAliases[from] = newRef
        }
        delete nextAliases[newRef]
        nextAliases[oldRef] = newRef
    }

    return { files: nextFiles, aliases: nextAliases }
}

/**
 * Keep Custom1–Custom40 and any other cue name that validates.
 * A display label becomes the voice key. Drop invalid keys and the label map.
 * Do not invent empty slots. Stamp the open cue schema.
 * Level JSON is not rewritten; old Custom.CustomN strings keep working through aliases.
 * @param {object} pack
 * @returns {{ audioFiles: object, customNames: object, audioRefAliases: object, customCueSchema: string }}
 */
export function applyOpenCustomCueSchema(pack) {
    const audioFiles = isPlainObject(pack?.audioFiles) ? { ...pack.audioFiles } : {}
    const hadCustom = Object.prototype.hasOwnProperty.call(audioFiles, 'Custom')
    const customFiles = hadCustom ? copyValidCustomFiles(audioFiles.Custom) : {}
    const customNames = copyValidCustomNames(pack?.customNames)
    const remapped = remapDisplayNamesToCueKeys(
        customFiles,
        customNames,
        copyValidCustomAliases(pack?.audioRefAliases)
    )
    if (hadCustom || Object.keys(remapped.files).length > 0) {
        audioFiles.Custom = remapped.files
    }
    const remainingNames = {}
    for (const [ref, value] of Object.entries(customNames)) {
        if (!ref.startsWith('Custom.')) remainingNames[ref] = value
    }
    return {
        audioFiles,
        customNames: remainingNames,
        audioRefAliases: remapped.aliases,
        customCueSchema: OPEN_CUSTOM_CUE_SCHEMA,
    }
}

/**
 * @param {object|null|undefined} pack
 * @returns {{ pack: object|null, migrated: boolean }}
 */
export function migrateAudioPack(pack) {
    if (!pack) {
        return { pack: null, migrated: false }
    }

    const migratedFiles = migrateAudioPackFiles(pack.audioFiles)
    const custom = applyOpenCustomCueSchema({ ...pack, audioFiles: migratedFiles })
    const next = {
        ...pack,
        audioFiles: custom.audioFiles,
        customCueSchema: custom.customCueSchema,
    }
    if (Object.keys(custom.customNames).length > 0) {
        next.customNames = custom.customNames
    } else {
        delete next.customNames
    }
    if (Object.keys(custom.audioRefAliases).length > 0) {
        next.audioRefAliases = custom.audioRefAliases
    } else {
        delete next.audioRefAliases
    }

    const migrated =
        JSON.stringify(next.audioFiles) !== JSON.stringify(pack.audioFiles || {}) ||
        JSON.stringify(next.customNames) !== JSON.stringify(pack.customNames || {}) ||
        JSON.stringify(next.audioRefAliases || {}) !== JSON.stringify(pack.audioRefAliases || {}) ||
        pack.customCueSchema !== OPEN_CUSTOM_CUE_SCHEMA

    return { pack: next, migrated }
}
