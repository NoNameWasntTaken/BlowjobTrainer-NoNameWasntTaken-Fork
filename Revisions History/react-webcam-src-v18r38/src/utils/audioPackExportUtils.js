import { getProcessedCategoryGroups } from '../constants/audioCategoryGroups'
import { audioFileService } from '../services/storageService'

const LEGACY_EXPORT_PREFIXES = [
    'audio/Lvl_begint/',
    'audio/Lvl_quickbg/',
    'audio/Lvl_basicr/',
    'audio/Lvl_cockw/',
]

/**
 * True if a stored or manifest path still uses a pre-R36 pack folder.
 * @param {string} filePath
 * @returns {boolean}
 */
export function isLegacyExportPath(filePath) {
    if (typeof filePath !== 'string') return false
    return LEGACY_EXPORT_PREFIXES.some((prefix) => filePath.startsWith(prefix))
}

/**
 * Extract the filename portion from a stored audio path (audio/{category}/{filename}).
 * @param {string} extractedPath
 * @returns {string}
 */
export function extractBasenameFromStoredPath(extractedPath) {
    const match = extractedPath.match(/^audio\/[^/]+\/(.+)$/)
    return match ? match[1] : extractedPath.replace(/^.*\//, '')
}

/**
 * Build a canonical export path using the editor convention: audio/{Category}/{filename}.
 * @param {string} category
 * @param {string} filename
 * @returns {string}
 */
export function buildCanonicalExportPath(category, filename) {
    return audioFileService.normalizeAudioPath(category, filename)
}

/**
 * Assign a unique canonical export path, appending " a", " b", … when filenames collide.
 * @param {string} category
 * @param {string} basename
 * @param {Set<string>} usedPaths
 * @returns {string}
 */
export function allocateCanonicalExportPath(category, basename, usedPaths) {
    let candidate = buildCanonicalExportPath(category, basename)
    if (!usedPaths.has(candidate)) {
        usedPaths.add(candidate)
        return candidate
    }

    const match = basename.match(/^(.+?)(\.[^.]+)?$/)
    const baseName = match?.[1] ?? basename
    const ext = match?.[2] ?? '.mp3'

    for (const letter of 'abcdefghijklmnopqrstuvwxyz'.split('')) {
        const suffixed = `${baseName} ${letter}${ext}`
        candidate = buildCanonicalExportPath(category, suffixed)
        if (!usedPaths.has(candidate)) {
            usedPaths.add(candidate)
            return candidate
        }
    }

    const timestamp = Date.now()
    candidate = buildCanonicalExportPath(category, `${baseName} ${timestamp}${ext}`)
    usedPaths.add(candidate)
    return candidate
}

/**
 * Flat ordered category list matching the editor UI groups.
 * @param {boolean} [includeCustom=true]
 * @returns {string[]}
 */
export function getExportCategoryOrder(includeCustom = true) {
    return getProcessedCategoryGroups(includeCustom).flatMap((group) => group.categories)
}

/**
 * Drop empty categories/keys and order top-level audioFiles to match editor groups.
 * @param {object} manifestAudioFiles
 * @param {string[]} [categoryOrder]
 * @returns {object}
 */
export function buildOrderedExportManifest(manifestAudioFiles, categoryOrder = getExportCategoryOrder()) {
    const result = {}
    const seen = new Set()

    const addCategory = (category, keys) => {
        if (!keys || typeof keys !== 'object') return

        const nonEmptyKeys = {}
        for (const [key, paths] of Object.entries(keys)) {
            const pathList = Array.isArray(paths) ? paths : [paths]
            const valid = pathList.filter((p) => p && typeof p === 'string')
            if (valid.length === 0) continue
            nonEmptyKeys[key] = Array.isArray(paths) ? valid : valid[0]
        }

        if (Object.keys(nonEmptyKeys).length > 0) {
            result[category] = nonEmptyKeys
        }
    }

    for (const category of categoryOrder) {
        addCategory(category, manifestAudioFiles[category])
        seen.add(category)
    }

    for (const [category, keys] of Object.entries(manifestAudioFiles || {})) {
        if (!seen.has(category)) {
            addCategory(category, keys)
        }
    }

    return result
}
