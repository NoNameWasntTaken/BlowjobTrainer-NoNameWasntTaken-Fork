import { DEFAULT_CAPTURE_LEVEL_FIELDS } from '../constants/captureLevelDefaults'
import { normalizeCustomSubfolder } from '../constants/customLevelFolders'
import { normalizeEditorSummaryAudioOnLoad } from '../components/LevelEditor/taskAudioConfig'
import { normalizePrerequisiteRules } from './levelPrerequisitesUtils'

export const LEVEL_FILE_FORMAT = 'level-v1'

/**
 * Merge editor voice/music fields onto a level object for a level-v1 file.
 * @param {object} level
 * @param {string|null|undefined} audioPackId
 * @param {string} backgroundMusicId
 */
export function applyEditorAudioFields(level, audioPackId, backgroundMusicId) {
    const out = {
        ...level,
        audioPackId: audioPackId || undefined,
    }
    if (backgroundMusicId === 'use_selected') {
        out.backgroundMusicId = 'use_selected'
    } else if (backgroundMusicId && backgroundMusicId !== '') {
        out.backgroundMusicId = backgroundMusicId
    } else {
        delete out.backgroundMusicId
    }
    return out
}

/**
 * @param {object} level
 * @returns {{ format: string, level: object }}
 */
export function serializeLevelFile(level) {
    return {
        format: LEVEL_FILE_FORMAT,
        level,
    }
}

/**
 * @param {object} level
 * @returns {string}
 */
export function stringifyLevelFile(level) {
    return JSON.stringify(serializeLevelFile(level), null, 2)
}

/**
 * Single-file download name (matches the historic `${title}-level.json` pattern).
 * @param {object} level
 */
export function levelExportFileName(level) {
    const title = typeof level?.title === 'string' ? level.title : ''
    return `${title.replace(/\s+/g, '-')}-level.json`
}

function sanitizeFileComponent(value) {
    const withoutControls = Array.from(String(value ?? ''))
        .filter((ch) => ch.charCodeAt(0) >= 32)
        .join('')
    const s = withoutControls
        .replace(/[<>:"/\\|?*]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^\.+/, '')
        .replace(/^-|-$/g, '')
    return s || 'level'
}

/**
 * Unique filename for bulk export. Prefers the single-file pattern, then adds order / id.
 * @param {object} level
 * @param {Set<string>} usedNames
 */
export function allocateLevelExportFileName(level, usedNames) {
    const titleSlug = sanitizeFileComponent(level?.title || 'untitled')
    const orderPart = level?.order != null && String(level.order) !== '' ? String(level.order) : ''
    const idSlug = sanitizeFileComponent(level?.id || '')
    const candidates = [
        `${titleSlug}-level.json`,
        orderPart ? `${titleSlug}-${orderPart}-level.json` : null,
        idSlug ? `${titleSlug}-${orderPart ? `${orderPart}-` : ''}${idSlug}-level.json` : null,
    ].filter(Boolean)

    for (const name of candidates) {
        if (!usedNames.has(name)) {
            usedNames.add(name)
            return name
        }
    }

    let i = 2
    const stem = `${titleSlug}${orderPart ? `-${orderPart}` : ''}${idSlug ? `-${idSlug}` : ''}`
    let name = `${stem}-${i}-level.json`
    while (usedNames.has(name)) {
        i += 1
        name = `${stem}-${i}-level.json`
    }
    usedNames.add(name)
    return name
}

/**
 * @param {string} text
 * @returns {{ ok: true, level: object } | { ok: false, error: string }}
 */
export function parseLevelFileText(text) {
    let importData
    try {
        importData = JSON.parse(text)
    } catch (error) {
        return { ok: false, error: error.message || 'Invalid JSON' }
    }
    if (importData?.format !== LEVEL_FILE_FORMAT || !importData.level || typeof importData.level !== 'object') {
        return { ok: false, error: 'Invalid level file format' }
    }
    return { ok: true, level: importData.level }
}

/**
 * Normalize a parsed level-v1 payload the same way single-file import does.
 * @param {object} importedLevel
 * @param {(id: string) => boolean} levelExists
 * @param {string} [fallbackId]
 */
export function normalizeImportedLevel(importedLevel, levelExists, fallbackId) {
    const impId = importedLevel.id || fallbackId || `custom-${Date.now()}`
    const normalizedImpPrereqs = normalizePrerequisiteRules(
        impId,
        importedLevel.prerequisites || [],
        levelExists
    )
    return {
        ...DEFAULT_CAPTURE_LEVEL_FIELDS,
        ...importedLevel,
        id: impId,
        tasks: importedLevel.tasks || [],
        summaryAudio: normalizeEditorSummaryAudioOnLoad(importedLevel.summaryAudio),
        customSubfolder: normalizeCustomSubfolder(importedLevel.customSubfolder),
        prerequisites: normalizedImpPrereqs,
    }
}

/**
 * Trigger a browser file download.
 * @param {string} filename
 * @param {string} text
 * @param {string} [mimeType]
 */
export function triggerBrowserDownload(filename, text, mimeType = 'application/json') {
    const blob = new Blob([text], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}
