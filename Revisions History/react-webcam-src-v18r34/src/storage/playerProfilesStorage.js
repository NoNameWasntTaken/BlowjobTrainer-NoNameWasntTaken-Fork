import {
    PLAYER_PROFILES_STORAGE_KEY,
    PLAYER_PROFILES_SCHEMA_VERSION,
    DEFAULT_PROFILE_ID,
    createDefaultPlayerProfilesState,
    createEmptyProfile,
    createEmptyTimeStats,
    createEmptyDiveStats,
    createEmptySessionStats,
    createEmptyAchievements,
    createEmptyPerformanceStats,
    normalizePlayerProfilesState,
} from '../atoms/playerProfilesModel'

const LEGACY_KEYS = ['timeStats', 'diveStats', 'sessionStats', 'achievements', 'performanceStats']

function safeParse(json, fallback) {
    try {
        return JSON.parse(json)
    } catch {
        return fallback
    }
}

function readLegacy() {
    const timeStats = safeParse(localStorage.getItem('timeStats'), null) || createEmptyTimeStats()
    const diveStats = safeParse(localStorage.getItem('diveStats'), null) || createEmptyDiveStats()
    const sessionStats = safeParse(localStorage.getItem('sessionStats'), null) || createEmptySessionStats()
    const achievements = safeParse(localStorage.getItem('achievements'), null) || createEmptyAchievements()
    const performanceStats =
        safeParse(localStorage.getItem('performanceStats'), null) || createEmptyPerformanceStats()

    const def = createEmptyProfile(DEFAULT_PROFILE_ID, 'Default')
    return {
        version: PLAYER_PROFILES_SCHEMA_VERSION,
        activeProfileId: DEFAULT_PROFILE_ID,
        profiles: {
            [DEFAULT_PROFILE_ID]: {
                ...def,
                timeStats,
                diveStats,
                sessionStats,
                achievements,
                performanceStats,
            },
        },
    }
}

function stripLegacyKeys() {
    for (const k of LEGACY_KEYS) {
        try {
            localStorage.removeItem(k)
        } catch {
            /* ignore */
        }
    }
}

/**
 * Custom sync storage for jotai atomWithStorage (jotai v2: getItem returns parsed value).
 */
export function createPlayerProfilesStorage() {
    return {
        getItem(key, initialValue) {
            try {
                const raw = localStorage.getItem(key)
                if (raw != null) {
                    const parsed = safeParse(raw, null)
                    if (
                        parsed &&
                        typeof parsed === 'object' &&
                        parsed.profiles &&
                        typeof parsed.profiles === 'object' &&
                        parsed.activeProfileId
                    ) {
                        return normalizePlayerProfilesState(parsed)
                    }
                }

                const migrated = readLegacy()
                const normalized = normalizePlayerProfilesState(migrated)
                const serialized = JSON.stringify(normalized)
                try {
                    localStorage.setItem(key, serialized)
                    stripLegacyKeys()
                } catch (e) {
                    console.warn('playerProfiles migrate persist failed', e)
                }
                return normalized
            } catch (e) {
                console.warn('playerProfiles getItem failed', e)
                return initialValue
            }
        },
        setItem(key, value) {
            localStorage.setItem(key, JSON.stringify(value))
        },
        removeItem(key) {
            localStorage.removeItem(key)
        },
    }
}

export function subscribePlayerProfilesCrossTab(store, playerProfilesAtom) {
    const onStorage = (e) => {
        if (e.storageArea !== localStorage) return
        if (e.key !== PLAYER_PROFILES_STORAGE_KEY) return

        if (e.newValue == null) {
            const fresh = createDefaultPlayerProfilesState()
            const cur = store.get(playerProfilesAtom)
            if (JSON.stringify(cur) !== JSON.stringify(fresh)) {
                store.set(playerProfilesAtom, fresh)
            }
            return
        }

        const parsed = safeParse(e.newValue, null)
        if (!parsed || typeof parsed !== 'object') return
        const next = normalizePlayerProfilesState(parsed)
        const cur = store.get(playerProfilesAtom)
        if (JSON.stringify(cur) !== JSON.stringify(next)) {
            store.set(playerProfilesAtom, next)
        }
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
}

export { PLAYER_PROFILES_STORAGE_KEY }
