import { atom } from "jotai";
import { atomWithStorage } from 'jotai/utils'

// Time-based stats
export const timeStatsAtom = atomWithStorage('timeStats', {
    totalPlayTime: 0, // in seconds
    holdTimeByDepth: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
    },
})

// Count-based stats
export const diveStatsAtom = atomWithStorage('diveStats', {
    divesByDepth: {
        1: 0,
        2: 0,
        3: 0,
        4: 0
    },
    perfectTaskExecutions: {
        HOLDPOSITION: 0,
        UPANDDOWN: 0,
        HITDEPTH: 0,
        HOLDANDCLAP: 0,
    },
})

export const sessionStatsAtom = atomWithStorage('sessionStats', {
    lastPlayDate: null, // for daily tracking
    playDates: [], // array of dates played, for streak tracking

    // Level tracking
    levelScores: {}, // { levelId: { rank: , bestScore: number, attempts: number, lastScore: number, surfacePenalties: number} }
    levelsCompletedToday: 0,
})

// If we need to check completed levels, we can create a derived atom:
export const completedLevelsAtom = atom((get) => {
    const { levelScores } = get(sessionStatsAtom)
    return Object.keys(levelScores)
})

// Performance stats -
export const performanceStatsAtom = atomWithStorage('performanceStats', {
    // TODO
})


// Achievement unlocks
export const achievementsStoredAtom = atomWithStorage('achievements', {
    unlockedAchievements: [], // array of achievement IDs
    achievementProgress: {}, // achievement ID: progress value
})

// Derived atom for checking achievements
export const achievementCheckerAtom = atom((get) => {
    const timeStats = get(timeStatsAtom)
    const diveStats = get(diveStatsAtom)
    void get(performanceStatsAtom) // Reserved for future achievement checks

    // Return object of achievement conditions
    return {
        hasTrainingDedication: timeStats.totalPlayTime >= 36000, // 10 hours
        isDeepMaster: timeStats.holdTimeByDepth[4] >= 600, // 10 mins
        isDeepSeaVeteran: diveStats.divesByDepth[4] >= 100,
        // ... other achievement checks
    }
})
