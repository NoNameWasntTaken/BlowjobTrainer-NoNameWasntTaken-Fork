import { AUDIO } from '../Tasks/audio'

// Release audio that can be used by all task types (typically near the end of sessions)
export const RELEASE_AUDIO = [
    // pre release
    { value: 'Release.PRE_RELEASE', label: 'Release.PRE_RELEASE' },
    { value: 'Lvl_basicr.PRE_RELEASE', label: 'Lvl_basicr.PRE_RELEASE' },
    { value: 'Lvl_cockw.PRE_RELEASE_1', label: 'Lvl_cockw.PRE_RELEASE_1' },
    { value: 'Lvl_cockw.PRE_RELEASE_2', label: 'Lvl_cockw.PRE_RELEASE_2' },
    { value: 'Lvl_cockw.PRE_RELEASE_3', label: 'Lvl_cockw.PRE_RELEASE_3' },
    { value: 'Release.POST_RELEASE_ZERO', label: 'Release.POST_RELEASE_ZERO' },
    // post release
    { value: 'Release.POST_RELEASE', label: 'Release.POST_RELEASE' },
    { value: 'Lvl_basicr.POST_RELEASE', label: 'Lvl_basicr.POST_RELEASE' },
    { value: 'Lvl_cockw.POST_RELEASE', label: 'Lvl_cockw.POST_RELEASE' },
    { value: 'Release.POST_RELEASE_FOUR', label: 'Release.POST_RELEASE_FOUR' },
]

// Hold Position audio - based on targetDepth
export const HOLD_AUDIO = [
    { value: 'Hold.ONE', label: 'Hold.ONE' },
    { value: 'Hold.TWO', label: 'Hold.TWO' },
    { value: 'Hold.THREE', label: 'Hold.THREE' },
    { value: 'Hold.FOUR', label: 'Hold.FOUR' },
    ...RELEASE_AUDIO, // Add release audio for hold tasks
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

// Rest audio
export const REST_AUDIO = [
    { value: 'Rest.SHORT_REST', label: 'Rest.SHORT_REST' },
    { value: 'Rest.REST', label: 'Rest.REST' },
    { value: 'Rest.REST_BALL', label: 'Rest.REST_BALL' },
    ...RELEASE_AUDIO
]

// Get Ready audio
export const GETREADY_AUDIO = [
    { value: 'Level.START_00', label: 'Level.START_00' },
    { value: 'Lvl_begint.START', label: 'Lvl_begint.START' },
    { value: 'Lvl_quickbg.START', label: 'Lvl_quickbg.START' },
    { value: 'Lvl_basicr.START', label: 'Lvl_basicr.START' },
    { value: 'Lvl_cockw.START', label: 'Lvl_cockw.START' },
    { value: 'Level.INTMED_5', label: 'Level.INTMED_5' },
    { value: 'Level.ENDURANCE_6', label: 'Level.ENDURANCE_6' },
    { value: 'Level.DEEPFOCUS_7', label: 'Level.DEEPFOCUS_7' },
    { value: 'Level.SPEED_8', label: 'Level.SPEED_8' },
    { value: 'Level.DEVOTION_9', label: 'Level.DEVOTION_9' },
    { value: 'Level.MAXDEPTH_10', label: 'Level.MAXDEPTH_10' },
    { value: 'Level.ELITE_11', label: 'Level.ELITE_11' },
    { value: 'Level.MANYLOAD_12', label: 'Level.MANYLOAD_12' },
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
    ...RELEASE_AUDIO,
]

// Endless audio
export const ENDLESS_AUDIO = [
    { value: 'Endless.ENDLESS', label: 'Endless.ENDLESS' },
    { value: 'Level.START_00', label: 'Level.START_00' },
    ...RELEASE_AUDIO,
]

/**
 * Get the appropriate audio options for a task type
 */
export function getAudioOptionsForTaskType(taskType) {
    switch (taskType) {
        case 'hold':
            return HOLD_AUDIO
        case 'updown':
            return UPANDDOWN_AUDIO
        case 'hitdepth':
            return HIT_AUDIO
        case 'clap':
            return CLAP_AUDIO
        case 'holdandclap':
            return HOLDANDCLAP_AUDIO
        case 'rest':
        case 'rest ball':
            return REST_AUDIO
        case 'get ready':
            return GETREADY_AUDIO
        case 'finish':
            return FINISH_AUDIO
        case 'endless':
            return ENDLESS_AUDIO
        default:
            return []
    }
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
