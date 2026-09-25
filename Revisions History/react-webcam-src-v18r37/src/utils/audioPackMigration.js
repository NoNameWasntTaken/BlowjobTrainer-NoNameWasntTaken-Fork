import { AUDIO_REF_ALIASES } from '../constants/audioRefAliases'

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

/**
 * @param {object|null|undefined} pack
 * @returns {{ pack: object|null, migrated: boolean }}
 */
export function migrateAudioPack(pack) {
    if (!pack) {
        return { pack: null, migrated: false }
    }

    const migratedFiles = migrateAudioPackFiles(pack.audioFiles)
    const migrated = JSON.stringify(migratedFiles) !== JSON.stringify(pack.audioFiles || {})

    if (!migrated) {
        return { pack, migrated: false }
    }

    return {
        pack: { ...pack, audioFiles: migratedFiles },
        migrated: true,
    }
}
