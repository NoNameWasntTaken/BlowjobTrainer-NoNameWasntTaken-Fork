import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import {
    createPlayerProfilesStorage,
    PLAYER_PROFILES_STORAGE_KEY,
} from '../storage/playerProfilesStorage'
import {
    createDefaultPlayerProfilesState,
    createEmptyTimeStats,
    createEmptyDiveStats,
    createEmptySessionStats,
    createEmptyAchievements,
    createEmptyPerformanceStats,
    normalizePlayerProfilesState,
    getResolvedActiveProfileId,
} from './playerProfilesModel'

export {
    PLAYER_PROFILES_STORAGE_KEY,
    DEFAULT_PROFILE_ID,
    PLAYER_PROFILES_SCHEMA_VERSION,
    createDefaultPlayerProfilesState,
    createEmptyProfile,
    createEmptyTimeStats,
    createEmptyDiveStats,
    createEmptySessionStats,
    createEmptyAchievements,
    createEmptyPerformanceStats,
    normalizePlayerProfilesState,
    getResolvedActiveProfileId,
} from './playerProfilesModel'

/** Consolidated profiles + activeProfileId (+ migration via custom storage). */
export const playerProfilesAtom = atomWithStorage(
    PLAYER_PROFILES_STORAGE_KEY,
    createDefaultPlayerProfilesState(),
    createPlayerProfilesStorage(),
    { getOnInit: true }
)

export const timeStatsAtom = atom(
    (get) => {
        const pp = get(playerProfilesAtom)
        const rid = getResolvedActiveProfileId(pp)
        return pp.profiles[rid]?.timeStats ?? createEmptyTimeStats()
    },
    (get, set, update) => {
        set(playerProfilesAtom, (prev) => {
            const n = normalizePlayerProfilesState(prev)
            const id = n.activeProfileId
            const prof = n.profiles[id]
            const nextTime =
                typeof update === 'function' ? update(prof.timeStats) : update
            return {
                ...n,
                profiles: {
                    ...n.profiles,
                    [id]: { ...prof, timeStats: nextTime },
                },
            }
        })
    }
)

export const diveStatsAtom = atom(
    (get) => {
        const pp = get(playerProfilesAtom)
        const rid = getResolvedActiveProfileId(pp)
        return pp.profiles[rid]?.diveStats ?? createEmptyDiveStats()
    },
    (get, set, update) => {
        set(playerProfilesAtom, (prev) => {
            const n = normalizePlayerProfilesState(prev)
            const id = n.activeProfileId
            const prof = n.profiles[id]
            const nextDive =
                typeof update === 'function' ? update(prof.diveStats) : update
            return {
                ...n,
                profiles: {
                    ...n.profiles,
                    [id]: { ...prof, diveStats: nextDive },
                },
            }
        })
    }
)

export const sessionStatsAtom = atom(
    (get) => {
        const pp = get(playerProfilesAtom)
        const rid = getResolvedActiveProfileId(pp)
        return pp.profiles[rid]?.sessionStats ?? createEmptySessionStats()
    },
    (get, set, update) => {
        set(playerProfilesAtom, (prev) => {
            const n = normalizePlayerProfilesState(prev)
            const id = n.activeProfileId
            const prof = n.profiles[id]
            const nextS =
                typeof update === 'function' ? update(prof.sessionStats) : update
            return {
                ...n,
                profiles: {
                    ...n.profiles,
                    [id]: { ...prof, sessionStats: nextS },
                },
            }
        })
    }
)

export const performanceStatsAtom = atom(
    (get) => {
        const pp = get(playerProfilesAtom)
        const rid = getResolvedActiveProfileId(pp)
        return (
            pp.profiles[rid]?.performanceStats ?? createEmptyPerformanceStats()
        )
    },
    (get, set, update) => {
        set(playerProfilesAtom, (prev) => {
            const n = normalizePlayerProfilesState(prev)
            const id = n.activeProfileId
            const prof = n.profiles[id]
            const nextP =
                typeof update === 'function'
                    ? update(prof.performanceStats)
                    : update
            return {
                ...n,
                profiles: {
                    ...n.profiles,
                    [id]: { ...prof, performanceStats: nextP },
                },
            }
        })
    }
)

export const achievementsStoredAtom = atom(
    (get) => {
        const pp = get(playerProfilesAtom)
        const rid = getResolvedActiveProfileId(pp)
        return pp.profiles[rid]?.achievements ?? createEmptyAchievements()
    },
    (get, set, update) => {
        set(playerProfilesAtom, (prev) => {
            const n = normalizePlayerProfilesState(prev)
            const id = n.activeProfileId
            const prof = n.profiles[id]
            const nextA =
                typeof update === 'function'
                    ? update(prof.achievements)
                    : update
            return {
                ...n,
                profiles: {
                    ...n.profiles,
                    [id]: { ...prof, achievements: nextA },
                },
            }
        })
    }
)

export const completedLevelsAtom = atom((get) => {
    const { levelScores } = get(sessionStatsAtom)
    return Object.keys(levelScores)
})

export const achievementCheckerAtom = atom((get) => {
    const timeStats = get(timeStatsAtom)
    const diveStats = get(diveStatsAtom)
    void get(performanceStatsAtom)

    return {
        hasTrainingDedication: timeStats.totalPlayTime >= 36000,
        isDeepMaster: timeStats.holdTimeByDepth[4] >= 600,
        isDeepSeaVeteran: diveStats.divesByDepth[4] >= 100,
    }
})
