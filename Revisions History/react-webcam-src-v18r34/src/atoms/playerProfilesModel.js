/**
 * Canonical shape for playerProfiles persisted state (see profile management plan).
 */

export const PLAYER_PROFILES_STORAGE_KEY = 'playerProfiles'
export const PLAYER_PROFILES_SCHEMA_VERSION = 1
export const DEFAULT_PROFILE_ID = 'default'

export function createEmptyTimeStats() {
    return {
        totalPlayTime: 0,
        holdTimeByDepth: { 1: 0, 2: 0, 3: 0, 4: 0 },
    }
}

export function createEmptyDiveStats() {
    return {
        divesByDepth: { 1: 0, 2: 0, 3: 0, 4: 0 },
        perfectTaskExecutions: {
            HOLDPOSITION: 0,
            UPANDDOWN: 0,
            HITDEPTH: 0,
            HOLDANDCLAP: 0,
        },
    }
}

export function createEmptySessionStats() {
    return {
        lastPlayDate: null,
        playDates: [],
        levelScores: {},
        levelsCompletedToday: 0,
    }
}

export function createEmptyAchievements() {
    return {
        unlockedAchievements: [],
        achievementProgress: {},
    }
}

export function createEmptyPerformanceStats() {
    return {}
}

export function createEmptyProfile(id, name) {
    return {
        id,
        name,
        hidden: false,
        bypassLevelRequirements: false,
        allowsCaptures: false,
        allowsHiddenCaptures: false,
        statTrackingEnabled: true,
        timeStats: createEmptyTimeStats(),
        diveStats: createEmptyDiveStats(),
        sessionStats: createEmptySessionStats(),
        achievements: createEmptyAchievements(),
        performanceStats: createEmptyPerformanceStats(),
    }
}

export function createDefaultPlayerProfilesState() {
    return {
        version: PLAYER_PROFILES_SCHEMA_VERSION,
        activeProfileId: DEFAULT_PROFILE_ID,
        profiles: {
            [DEFAULT_PROFILE_ID]: createEmptyProfile(DEFAULT_PROFILE_ID, 'Default'),
        },
    }
}

/** Read path: which profile id to show without mutating. */
export function getResolvedActiveProfileId(state) {
    if (!state?.profiles) return DEFAULT_PROFILE_ID
    if (state.profiles[state.activeProfileId]) return state.activeProfileId
    return DEFAULT_PROFILE_ID
}

/**
 * Ensure activeProfileId exists in profiles and default profile exists.
 * Returns a new state object (immutable).
 */
export function normalizePlayerProfilesState(state) {
    const base = state && typeof state === 'object' ? { ...state } : createDefaultPlayerProfilesState()
    let profiles = { ...(base.profiles || {}) }
    let activeProfileId = base.activeProfileId

    if (!profiles[DEFAULT_PROFILE_ID]) {
        profiles[DEFAULT_PROFILE_ID] = createEmptyProfile(DEFAULT_PROFILE_ID, 'Default')
    }
    if (!activeProfileId || !profiles[activeProfileId]) {
        activeProfileId = DEFAULT_PROFILE_ID
    }

    const migrated = {}
    for (const id of Object.keys(profiles)) {
        const p = profiles[id]
        const { customLevelFolderNames: _removed, ...rest } = p
        const bypassLevelRequirements = p.bypassLevelRequirements === true
        const allowsCaptures = id === DEFAULT_PROFILE_ID ? false : p.allowsCaptures === true
        const allowsHiddenCaptures = id === DEFAULT_PROFILE_ID ? false : p.allowsHiddenCaptures === true
        if (id === DEFAULT_PROFILE_ID) {
            migrated[id] = {
                ...rest,
                hidden: false,
                bypassLevelRequirements,
                allowsCaptures: false,
                allowsHiddenCaptures: false,
            }
        } else {
            migrated[id] = {
                ...rest,
                hidden: p.hidden === true,
                bypassLevelRequirements,
                allowsCaptures,
                allowsHiddenCaptures,
            }
        }
    }

    return {
        ...base,
        version: base.version ?? PLAYER_PROFILES_SCHEMA_VERSION,
        activeProfileId,
        profiles: migrated,
    }
}
