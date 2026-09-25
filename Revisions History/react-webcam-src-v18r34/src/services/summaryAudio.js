import { Rank } from '../atoms/taskAtom'

/**
 * Maps session-end rank to optional level.summaryAudio keys.
 * @type {Record<number, string>}
 */
const RANK_TO_SUMMARY_KEY = {
    [Rank.FAILED]: 'failed',
    [Rank.APPRENTICE]: 'apprentice',
    [Rank.JOURNEYMAN]: 'journeyman',
    [Rank.MASTER]: 'master',
}

/**
 * Default summary lines (string refs resolved by audioManager / audioResolver).
 * Matches legacy Gameover behavior: distinct pass vs good ranks; soft affects failed and master only.
 */
function getLegacySummaryRef(newRank, soft) {
    switch (newRank) {
        case Rank.FAILED:
            return soft ? 'Rank.END_BAD_SOFT' : 'Rank.END_BAD'
        case Rank.APPRENTICE:
            return 'Rank.END_PASS'
        case Rank.JOURNEYMAN:
            return 'Rank.END_GOOD'
        case Rank.MASTER:
            return soft ? 'Rank.END_PERFECT_SOFT' : 'Rank.END_PERFECT'
        default:
            return null
    }
}

/**
 * Resolve post-session summary voice reference for a level.
 * Uses level.summaryAudio.{failed|apprentice|journeyman|master} when set; otherwise Rank.* + soft.
 *
 * @param {object|null|undefined} levelDefinition - From levelManager.getLevel (default or custom level)
 * @param {number} newRank - Rank.* value
 * @param {boolean} soft - levelDefinition.soft ?? currentLevel.soft
 * @returns {string|string[]|null} - Argument for setFeedback / audioManager.getAudioFile, or null for no voice
 */
export function getSummaryAudioRef(levelDefinition, newRank, soft) {
    const summaryKey = RANK_TO_SUMMARY_KEY[newRank]
    if (summaryKey === undefined) {
        return null
    }

    const override = levelDefinition?.summaryAudio?.[summaryKey]
    if (override !== undefined && override !== null) {
        return override
    }

    return getLegacySummaryRef(newRank, soft)
}
