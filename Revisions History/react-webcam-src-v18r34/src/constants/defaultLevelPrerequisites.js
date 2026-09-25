import { Rank } from '../atoms/taskAtom'

/** UI label for the minimum rank required on the prerequisite level. */
export const PrerequisiteThreshold = {
    PASS: 'Pass',
    GOOD: 'Good',
    PERFECT: 'Perfect',
}

/**
 * Default level prerequisites (target level id → list of requirements, all AND).
 * Maps to Rank: Pass → APPRENTICE, Good → JOURNEYMAN, Perfect → MASTER.
 */
export const DEFAULT_LEVEL_PREREQUISITES = Object.freeze({
    quickbg: [
        { levelId: 'begint', minRank: Rank.APPRENTICE, thresholdLabel: PrerequisiteThreshold.PASS },
    ],
    basicr: [
        { levelId: 'begint', minRank: Rank.APPRENTICE, thresholdLabel: PrerequisiteThreshold.PASS },
    ],
    dive101: [
        { levelId: 'basicr', minRank: Rank.JOURNEYMAN, thresholdLabel: PrerequisiteThreshold.GOOD },
    ],
    intmed: [
        { levelId: 'quickbg', minRank: Rank.MASTER, thresholdLabel: PrerequisiteThreshold.PERFECT },
        { levelId: 'dive101', minRank: Rank.JOURNEYMAN, thresholdLabel: PrerequisiteThreshold.GOOD },
    ],
    endurance: [
        { levelId: 'intmed', minRank: Rank.APPRENTICE, thresholdLabel: PrerequisiteThreshold.PASS },
    ],
    deepfocus: [
        { levelId: 'intmed', minRank: Rank.APPRENTICE, thresholdLabel: PrerequisiteThreshold.PASS },
    ],
    speed: [
        { levelId: 'intmed', minRank: Rank.APPRENTICE, thresholdLabel: PrerequisiteThreshold.PASS },
    ],
    devotion: [
        { levelId: 'endurance', minRank: Rank.JOURNEYMAN, thresholdLabel: PrerequisiteThreshold.GOOD },
        { levelId: 'speed', minRank: Rank.JOURNEYMAN, thresholdLabel: PrerequisiteThreshold.GOOD },
    ],
    maxdepth: [
        { levelId: 'deepfocus', minRank: Rank.MASTER, thresholdLabel: PrerequisiteThreshold.PERFECT },
    ],
    elite: [
        { levelId: 'devotion', minRank: Rank.JOURNEYMAN, thresholdLabel: PrerequisiteThreshold.GOOD },
    ],
    manyload: [
        { levelId: 'maxdepth', minRank: Rank.MASTER, thresholdLabel: PrerequisiteThreshold.PERFECT },
        { levelId: 'elite', minRank: Rank.MASTER, thresholdLabel: PrerequisiteThreshold.PERFECT },
    ],
})
