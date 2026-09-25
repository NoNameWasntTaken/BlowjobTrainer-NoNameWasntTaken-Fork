import { CUSTOM_VOICE_SLOT_KEYS } from '../../constants/customVoiceCategories'
import { AUDIO } from '../Tasks/audio'
import { audioManager } from '../../services/audioManager'

/**
 * Get Custom.* audio options from pack (only subcategories with files)
 * When audioPackId is null, falls back to currently active pack (Use Selected Audio)
 */
export function getCustomAudioOptions(audioPackId, customNames = {}) {
    const packId = audioPackId ?? audioManager.getActivePackId()
    const pack = packId ? audioManager.loadPack(packId) : null
    if (!pack?.audioFiles?.Custom) return []
    const names = customNames && Object.keys(customNames).length > 0 ? customNames : (pack.customNames ?? {})
    const options = []
    for (const key of CUSTOM_VOICE_SLOT_KEYS) {
        const value = pack.audioFiles.Custom?.[key]
        if (!value) continue
        const hasFiles = Array.isArray(value) ? value.length > 0 : !!value
        if (!hasFiles) continue
        const displayLabel = names[`Custom.${key}`] || `Custom.${key}`
        options.push({ value: `Custom.${key}`, label: displayLabel })
    }
    return options
}

// Release audio that can be used by all task types (typically near the end of sessions)
export const RELEASE_AUDIO = [
    // pre release
    { value: 'Release.PRE_RELEASE', label: 'Release.PRE_RELEASE' },
    { value: 'Release.BASICR_3_PRE_RELEASE', label: 'Release.BASICR_3_PRE_RELEASE' },
    { value: 'Release.COCKW_4_PRE_RELEASE_1', label: 'Release.COCKW_4_PRE_RELEASE_1' },
    { value: 'Release.COCKW_4_PRE_RELEASE_2', label: 'Release.COCKW_4_PRE_RELEASE_2' },
    { value: 'Release.COCKW_4_PRE_RELEASE_3', label: 'Release.COCKW_4_PRE_RELEASE_3' },
    // post release
    { value: 'Release.POST_RELEASE', label: 'Release.POST_RELEASE' },
    { value: 'Release.BASICR_3_POST_RELEASE', label: 'Release.BASICR_3_POST_RELEASE' },
    { value: 'Release.COCKW_4_POST_RELEASE', label: 'Release.COCKW_4_POST_RELEASE' },
    { value: 'Release.POST_RELEASE_FOUR', label: 'Release.POST_RELEASE_FOUR' },
    { value: 'Release.POST_RELEASE_ZERO', label: 'Release.POST_RELEASE_ZERO' },
]

// Hold Position audio - based on targetDepth
export const HOLD_AUDIO = [
    { value: 'Hold.ONE', label: 'Hold.ONE' },
    { value: 'Hold.TWO', label: 'Hold.TWO' },
    { value: 'Hold.THREE', label: 'Hold.THREE' },
    { value: 'Hold.FOUR', label: 'Hold.FOUR' },
    { value: 'Warmup.HOLD_THREE', label: 'Warmup.HOLD_THREE' },
    { value: 'Warmup.HOLD_FOUR', label: 'Warmup.HOLD_FOUR' },
    ...RELEASE_AUDIO, // Add release audio for hold tasks
]

/** Midway feedback while holding (50% elapsed) */
export const HOLD_PROGRESS_HALF_AUDIO = [
    { value: 'Hold.ONE_HALF', label: 'Hold.ONE_HALF' },
    { value: 'Hold.TWO_HALF', label: 'Hold.TWO_HALF' },
    { value: 'Hold.THREE_HALF', label: 'Hold.THREE_HALF' },
    { value: 'Hold.FOUR_HALF', label: 'Hold.FOUR_HALF' },
]

/** Midway feedback while holding (75% elapsed) */
export const HOLD_PROGRESS_3Q_AUDIO = [
    { value: 'Hold.ONE_3Q', label: 'Hold.ONE_3Q' },
    { value: 'Hold.TWO_3Q', label: 'Hold.TWO_3Q' },
    { value: 'Hold.THREE_3Q', label: 'Hold.THREE_3Q' },
    { value: 'Hold.FOUR_3Q', label: 'Hold.FOUR_3Q' },
]

// Up and Down audio - based on minDepth, maxDepth, and tempo
export const UPANDDOWN_AUDIO = [
    // Generic tempo-based
    { value: 'UpDown.SLOW', label: 'UpDown.SLOW' },
    { value: 'UpDown.MED', label: 'UpDown.MED' },
    { value: 'UpDown.FAST', label: 'UpDown.FAST' },
    { value: 'UpDown.DEEP', label: 'UpDown.DEEP' },
    // 1 to 2
    { value: 'UpDown.ONE_TWO_SLOW', label: 'UpDown.ONE_TWO_SLOW' },
    { value: 'UpDown.ONE_TWO_MED', label: 'UpDown.ONE_TWO_MED' },
    { value: 'UpDown.ONE_TWO_FAST', label: 'UpDown.ONE_TWO_FAST' },
    // 1 to 3
    { value: 'UpDown.ONE_THREE_SLOW', label: 'UpDown.ONE_THREE_SLOW' },
    { value: 'UpDown.ONE_THREE_MEDIUM', label: 'UpDown.ONE_THREE_MEDIUM' },
    { value: 'UpDown.ONE_THREE_FAST', label: 'UpDown.ONE_THREE_FAST' },
    // 1 to 4
    { value: 'UpDown.ONE_FOUR_SLOW', label: 'UpDown.ONE_FOUR_SLOW' },
    { value: 'UpDown.ONE_FOUR_MEDIUM', label: 'UpDown.ONE_FOUR_MEDIUM' },
    { value: 'UpDown.ONE_FOUR_FAST', label: 'UpDown.ONE_FOUR_FAST' },
    // 2 to 3
    { value: 'UpDown.TWO_THREE_SLOW', label: 'UpDown.TWO_THREE_SLOW' },
    { value: 'UpDown.TWO_THREE_MED', label: 'UpDown.TWO_THREE_MED' },
    { value: 'UpDown.TWO_THREE_FAST', label: 'UpDown.TWO_THREE_FAST' },
    // 2 to 4
    { value: 'UpDown.TWO_FOUR_SLOW', label: 'UpDown.TWO_FOUR_SLOW' },
    { value: 'UpDown.TWO_FOUR_MED', label: 'UpDown.TWO_FOUR_MED' },
    { value: 'UpDown.TWO_FOUR_FAST', label: 'UpDown.TWO_FOUR_FAST' },
    // 3 to 4
    { value: 'UpDown.THREE_FOUR_SLOW', label: 'UpDown.THREE_FOUR_SLOW' },
    { value: 'UpDown.THREE_FOUR_MED', label: 'UpDown.THREE_FOUR_MED' },
    { value: 'UpDown.THREE_FOUR_FAST', label: 'UpDown.THREE_FOUR_FAST' },
    ...RELEASE_AUDIO, // Add release audio for up/down tasks
]

// Hit Depth audio - based on targetDepth
export const HIT_AUDIO = [
    { value: 'Hit.ONE', label: 'Hit.ONE' },
    { value: 'Hit.TWO', label: 'Hit.TWO' },
    { value: 'Hit.THREE', label: 'Hit.THREE' },
    { value: 'Hit.FOUR', label: 'Hit.FOUR' },
    { value: 'Warmup.HIT_THREE', label: 'Warmup.HIT_THREE' },
    { value: 'Warmup.HIT_FOUR', label: 'Warmup.HIT_FOUR' },
    ...RELEASE_AUDIO, // Add release audio for hit tasks
]

// Hold and Clap audio - based on targetDepth
export const HOLDANDCLAP_AUDIO = [
    { value: 'HoldAndClap.ONE', label: 'HoldAndClap.ONE' },
    { value: 'HoldAndClap.TWO', label: 'HoldAndClap.TWO' },
    { value: 'HoldAndClap.THREE', label: 'HoldAndClap.THREE' },
    { value: 'HoldAndClap.FOUR', label: 'HoldAndClap.FOUR' },
    ...RELEASE_AUDIO,
]

// Clap audio
export const CLAP_AUDIO = [
    { value: 'Clap.FACE', label: 'Clap.FACE' },
    { value: 'Clap.BELOW', label: 'Clap.BELOW' },
    ...RELEASE_AUDIO, // Add release audio for clap tasks
]

/** Speak instruction lines (voice pack keys Speak.Speak1 … Speak5) */
export const SPEAK_AUDIO = [
    { value: 'Speak.Speak1', label: 'Speak.Speak1' },
    { value: 'Speak.Speak2', label: 'Speak.Speak2' },
    { value: 'Speak.Speak3', label: 'Speak.Speak3' },
    { value: 'Speak.Speak4', label: 'Speak.Speak4' },
    { value: 'Speak.Speak5', label: 'Speak.Speak5' },
    ...RELEASE_AUDIO,
]

// Rest audio
export const REST_AUDIO = [
    { value: 'Rest.SHORT_REST', label: 'Rest.SHORT_REST' },
    { value: 'Rest.REST', label: 'Rest.REST' },
    { value: 'Rest.REST_BALL', label: 'Rest.REST_BALL' },
    ...RELEASE_AUDIO
]

// Get Ready audio
export const GETREADY_AUDIO = [
    { value: 'Level.BEGINT_1_START', label: 'Level.BEGINT_1_START' },
    { value: 'Level.QUICKBG_2_START', label: 'Level.QUICKBG_2_START' },
    { value: 'Level.BASICR_3_START', label: 'Level.BASICR_3_START' },
    { value: 'Level.COCKW_4_START', label: 'Level.COCKW_4_START' },
    { value: 'Level.INTMED_5_START', label: 'Level.INTMED_5_START' },
    { value: 'Level.ENDURANCE_6_START', label: 'Level.ENDURANCE_6_START' },
    { value: 'Level.DEEPFOCUS_7_START', label: 'Level.DEEPFOCUS_7_START' },
    { value: 'Level.SPEED_8_START', label: 'Level.SPEED_8_START' },
    { value: 'Level.DEVOTION_9_START', label: 'Level.DEVOTION_9_START' },
    { value: 'Level.MAXDEPTH_10_START', label: 'Level.MAXDEPTH_10_START' },
    { value: 'Level.ELITE_11_START', label: 'Level.ELITE_11_START' },
    { value: 'Level.MANYLOAD_12_START', label: 'Level.MANYLOAD_12_START' },
    { value: 'Level.MANYLOAD_12_PHASE2', label: 'Level.MANYLOAD_12_PHASE2' },
    { value: 'Level.MANYLOAD_12_PHASE3', label: 'Level.MANYLOAD_12_PHASE3' },
    { value: 'Level.MANYLOAD_12_WELLDONE', label: 'Level.MANYLOAD_12_WELLDONE' },
]

// Finish audio
export const FINISH_AUDIO = [
    { value: 'Finish.CLEAN', label: 'Finish.CLEAN' },
]

// Score event sounds (for Endless score-triggered events)
export const EVENT_SOUND_OPTIONS = [
    { value: 'Task.GOOD', label: 'Task.GOOD' },
    { value: 'Task.BAD', label: 'Task.BAD' },
    { value: 'Clap.KEEPGOING', label: 'Clap.KEEPGOING' },
    { value: 'Feedback.PERFECT', label: 'Feedback.PERFECT' },
    { value: 'Feedback.SURFACE_PENALTY_SOFT', label: 'Feedback.SURFACE_PENALTY_SOFT' },
    { value: 'Feedback.SURFACE_PENALTY_HARD', label: 'Feedback.SURFACE_PENALTY_HARD' },
    { value: 'Feedback.TOO_FAST', label: 'Feedback.TOO_FAST' },
    { value: 'Feedback.TOO_SLOW', label: 'Feedback.TOO_SLOW' },
    { value: 'Feedback.WAY_TOO_FAST', label: 'Feedback.WAY_TOO_FAST' },
    { value: 'Feedback.WAY_TOO_SLOW', label: 'Feedback.WAY_TOO_SLOW' },
    { value: 'UpDown.DEEP', label: 'UpDown.DEEP' },
    // Rest events
    { value: 'Rest.SHORT_REST', label: 'Rest.SHORT_REST' },
    { value: 'Rest.REST', label: 'Rest.REST' },
    { value: 'Rest.REST_BALL', label: 'Rest.REST_BALL' },
    // Additional milestone sounds
    { value: 'Finish.CLEAN', label: 'Finish.CLEAN' },
    ...RELEASE_AUDIO,
]

// Endless audio
export const ENDLESS_AUDIO = [
    { value: 'Endless.ENDLESS', label: 'Endless.ENDLESS' },
    ...RELEASE_AUDIO,
]

/**
 * Get the appropriate audio options for a task type
 * @param {string} taskType - Task type
 * @param {boolean} showCustomVoiceLines - Whether to include Custom.* options
 * @param {string|null} audioPackId - Pack ID (null = use active pack)
 * @param {object} customNames - Display name overrides for Custom subcategories
 */
export function getAudioOptionsForTaskType(taskType, showCustomVoiceLines = false, audioPackId = null, customNames = {}) {
    let baseOptions
    switch (taskType) {
        case 'hold':
            baseOptions = HOLD_AUDIO
            break
        case 'updown':
            baseOptions = UPANDDOWN_AUDIO
            break
        case 'hitdepth':
            baseOptions = HIT_AUDIO
            break
        case 'clap':
            baseOptions = CLAP_AUDIO
            break
        case 'speak':
            baseOptions = SPEAK_AUDIO
            break
        case 'holdandclap':
            baseOptions = HOLDANDCLAP_AUDIO
            break
        case 'rest':
        case 'rest ball':
            baseOptions = REST_AUDIO
            break
        case 'get ready':
            baseOptions = GETREADY_AUDIO
            break
        case 'finish':
            baseOptions = FINISH_AUDIO
            break
        case 'endless':
            baseOptions = ENDLESS_AUDIO
            break
        default:
            baseOptions = []
    }
    if (showCustomVoiceLines) {
        const customOptions = getCustomAudioOptions(audioPackId, customNames)
        return [...baseOptions, ...customOptions]
    }
    return baseOptions
}

const HOLD_DEPTH_WORD = {
    1: 'ONE',
    2: 'TWO',
    3: 'THREE',
    4: 'FOUR',
}

function holdDepthWord(targetDepth) {
    return HOLD_DEPTH_WORD[targetDepth] || 'ONE'
}

/**
 * Get the default audio for a Hold task based on targetDepth
 */
export function getDefaultHoldAudio(targetDepth) {
    const depthMap = {
        1: 'Hold.ONE',
        2: 'Hold.TWO',
        3: 'Hold.THREE',
        4: 'Hold.FOUR',
    }
    return depthMap[targetDepth] || 'Hold.ONE'
}

/** Default halfway (50%) hold feedback for targetDepth — matches createHOLDTask */
export function getDefaultHoldAudioHalfway(targetDepth) {
    return `Hold.${holdDepthWord(targetDepth)}_HALF`
}

/** Default three-quarter hold feedback for targetDepth — matches createHOLDTask */
export function getDefaultHoldAudioThreeQuarter(targetDepth) {
    return `Hold.${holdDepthWord(targetDepth)}_3Q`
}

export function getHoldProgressHalfAudioOptions(showCustomVoiceLines = false, audioPackId = null, customNames = {}) {
    if (showCustomVoiceLines) {
        return [...HOLD_PROGRESS_HALF_AUDIO, ...getCustomAudioOptions(audioPackId, customNames)]
    }
    return HOLD_PROGRESS_HALF_AUDIO
}

export function getHoldProgress3QAudioOptions(showCustomVoiceLines = false, audioPackId = null, customNames = {}) {
    if (showCustomVoiceLines) {
        return [...HOLD_PROGRESS_3Q_AUDIO, ...getCustomAudioOptions(audioPackId, customNames)]
    }
    return HOLD_PROGRESS_3Q_AUDIO
}

/**
 * Get the default audio for an UpAndDown task based on minDepth, maxDepth, and tempo
 */
export function getDefaultUpAndDownAudio(minDepth, maxDepth, tempo) {
    const depthWords = {
        1: 'ONE',
        2: 'TWO',
        3: 'THREE',
        4: 'FOUR',
    }
    const tempoMap = {
        30: 'SLOW',
        60: 'MEDIUM', // Note: AUDIO uses MEDIUM for 60 BPM, not MED
        90: 'FAST',
    }

    const startWord = depthWords[minDepth] || 'ONE'
    const endWord = depthWords[maxDepth] || 'TWO'
    const tempoWord = tempoMap[tempo] || 'SLOW'

    // Try specific range first (e.g., ONE_TWO_SLOW)
    // Note: For MEDIUM tempo, the key might be MEDIUM or MED depending on the range
    let specificKey = `${startWord}_${endWord}_${tempoWord}`
    if (AUDIO.UpDown[specificKey]) {
        return `UpDown.${specificKey}`
    }

    // Try with MED instead of MEDIUM for some ranges
    if (tempoWord === 'MEDIUM') {
        specificKey = `${startWord}_${endWord}_MED`
        if (AUDIO.UpDown[specificKey]) {
            return `UpDown.${specificKey}`
        }
    }

    // Fallback to generic tempo (MED for medium)
    const genericTempo = tempoWord === 'MEDIUM' ? 'MED' : tempoWord
    if (AUDIO.UpDown[genericTempo]) {
        return `UpDown.${genericTempo}`
    }

    // Final fallback
    return 'UpDown.MED'
}

/**
 * Get the default audio for a Hit task based on targetDepth
 */
export function getDefaultHitAudio(targetDepth) {
    const depthMap = {
        1: 'Hit.ONE', // Note: Hit.ONE is empty string in AUDIO, but we'll use it
        2: 'Hit.TWO',
        3: 'Hit.THREE',
        4: 'Hit.FOUR',
    }
    return depthMap[targetDepth] || 'Hit.FOUR'
}

/**
 * Get the default audio for an Endless task
 */
export function getDefaultEndlessAudio() {
    return 'Endless.ENDLESS'
}

/**
 * Get the default audio for a HoldAndClap task based on targetDepth
 */
export function getDefaultHoldAndClapAudio(targetDepth) {
    const depthMap = {
        1: 'HoldAndClap.ONE',
        2: 'HoldAndClap.TWO',
        3: 'HoldAndClap.THREE',
        4: 'HoldAndClap.FOUR',
    }
    return depthMap[targetDepth] || 'HoldAndClap.ONE'
}

/**
 * Session summary lines referenced by shipped default levels (`Training/levels.js` summaryAudio).
 * Keep in sync when default level summary assignments change.
 */
export const DEFAULT_LEVEL_SUMMARY_AUDIO_OPTIONS = [
    { value: 'Rank.END_BAD_SOFT', label: 'Rank.END_BAD_SOFT' },
    { value: 'Rank.END_BAD', label: 'Rank.END_BAD' },
    { value: 'Rank.END_PASS', label: 'Rank.END_PASS' },
    { value: 'Rank.END_GOOD', label: 'Rank.END_GOOD' },
    { value: 'Rank.END_PERFECT_SOFT', label: 'Rank.END_PERFECT_SOFT' },
    { value: 'Rank.END_PERFECT', label: 'Rank.END_PERFECT' },
    { value: 'Rank.BEGINT_1_END_BAD', label: 'Rank.BEGINT_1_END_BAD' },
    { value: 'Rank.BEGINT_1_END_GOOD', label: 'Rank.BEGINT_1_END_GOOD' },
    { value: 'Rank.BEGINT_1_END_PERFECT', label: 'Rank.BEGINT_1_END_PERFECT' },
    { value: 'Rank.QUICKBG_2_END_BAD', label: 'Rank.QUICKBG_2_END_BAD' },
    { value: 'Rank.QUICKBG_2_END_GOOD', label: 'Rank.QUICKBG_2_END_GOOD' },
    { value: 'Rank.QUICKBG_2_END_PERFECT', label: 'Rank.QUICKBG_2_END_PERFECT' },
    { value: 'Rank.COCKW_4_END_PERFECT', label: 'Rank.COCKW_4_END_PERFECT' },
]

/** Default Rank.* refs for new custom levels and when `summaryAudio` was never set (editor + save). */
export const DEFAULT_EDITOR_SUMMARY_AUDIO = Object.freeze({
    failed: 'Rank.END_BAD',
    apprentice: 'Rank.END_PASS',
    journeyman: 'Rank.END_GOOD',
    master: 'Rank.END_PERFECT',
})

const SUMMARY_AUDIO_RANK_KEYS = ['failed', 'apprentice', 'journeyman', 'master']

/**
 * If level has no summary audio keys yet, use editor defaults; otherwise keep saved shape (omitted keys stay omitted).
 */
export function normalizeEditorSummaryAudioOnLoad(summaryAudio) {
    if (summaryAudio && typeof summaryAudio === 'object' && Object.keys(summaryAudio).length > 0) {
        return summaryAudio
    }
    return { ...DEFAULT_EDITOR_SUMMARY_AUDIO }
}

/**
 * Allowed summary refs for the level editor, plus any string ref already saved on the level
 * (so out-of-list values still show until the author picks a default-set line).
 */
export function mergeSummaryAudioAllowedOptions(summaryAudio) {
    const allowed = new Set(DEFAULT_LEVEL_SUMMARY_AUDIO_OPTIONS.map((o) => o.value))
    const out = [...DEFAULT_LEVEL_SUMMARY_AUDIO_OPTIONS]
    for (const k of SUMMARY_AUDIO_RANK_KEYS) {
        const v = summaryAudio?.[k]
        if (typeof v === 'string' && v && !allowed.has(v)) {
            out.push({ value: v, label: `${v} (saved)` })
            allowed.add(v)
        }
    }
    return out
}

/**
 * Options for one summary row: default-level set + saved refs + optional Custom.* (with files) from pack.
 * @param {object} summaryAudioShowCustom - e.g. { failed: true }; only keys that are true enable custom lines for that row
 */
export function buildSummaryAudioRowOptions(summaryAudio, summaryAudioShowCustom, rankKey, audioPackId) {
    const base = mergeSummaryAudioAllowedOptions(summaryAudio)
    if (!summaryAudioShowCustom?.[rankKey]) {
        return base
    }
    const custom = getCustomAudioOptions(audioPackId, {})
    const seen = new Set(base.map((o) => o.value))
    const merged = [...base]
    for (const opt of custom) {
        if (!seen.has(opt.value)) {
            merged.push(opt)
            seen.add(opt.value)
        }
    }
    return merged
}
