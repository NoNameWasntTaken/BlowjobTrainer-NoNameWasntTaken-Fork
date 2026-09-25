import {
    PLAYER_PROFILES_SCHEMA_VERSION,
    normalizePlayerProfilesState,
} from '../atoms/playerProfilesModel'

export const PLAYER_PROFILE_FORMAT = 'player-profile-v1'

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
const INVALID_PROFILE = 'This file contains missing or invalid profile data. Your saved data has not been changed.'
const INVALID_JSON = 'This file is not valid JSON. Your saved data has not been changed.'
const INVALID_FORMAT = 'Choose a supported profile export (player-profile-v1). Your saved data has not been changed.'

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const number = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0
const count = (value) => number(value) && Number.isSafeInteger(value)
const finiteNumber = (value) => typeof value === 'number' && Number.isFinite(value)
const date = (value) => typeof value === 'string' && value.length > 0 && Number.isFinite(Date.parse(value))
const bool = (value) => typeof value === 'boolean'
const rank = (value) => Number.isInteger(value) && [-1, 1, 2, 3, 4].includes(value)

function assert(condition) {
    if (!condition) throw new Error(INVALID_PROFILE)
}

function hasControlChar(value) {
    for (let i = 0; i < value.length; i++) {
        if (value.charCodeAt(i) < 32) return true
    }
    return false
}

function safeKey(key, maxLength = 200) {
    return typeof key === 'string'
        && key.length > 0
        && key.length <= maxLength
        && !UNSAFE_KEYS.has(key)
        && !hasControlChar(key)
}

function depths(validate, value) {
    assert(isObject(value))
    return {
        1: read(validate, value[1]),
        2: read(validate, value[2]),
        3: read(validate, value[3]),
        4: read(validate, value[4]),
    }
}

function read(validate, value) {
    assert(validate(value))
    return value
}

function text(value, maxLength) {
    assert(typeof value === 'string' && safeKey(value, maxLength))
    return value
}

/**
 * Keep only the player-profile fields. Extra keys (credentials, packs, levels,
 * calibration, device ids) are dropped. Bad types and bad numbers throw.
 * @param {object} profile
 */
export function validatePlayerProfile(profile) {
    assert(isObject(profile))

    const timeStats = profile.timeStats
    assert(isObject(timeStats))
    const diveStats = profile.diveStats
    assert(isObject(diveStats))
    const perfect = diveStats.perfectTaskExecutions
    assert(isObject(perfect))
    const sessionStats = profile.sessionStats
    assert(isObject(sessionStats))
    const achievements = profile.achievements
    assert(isObject(achievements))
    assert(Array.isArray(achievements.unlockedAchievements))
    assert(isObject(achievements.achievementProgress))
    assert(isObject(sessionStats.levelScores))
    assert(Array.isArray(sessionStats.playDates))
    assert(isObject(profile.performanceStats))

    const levelScores = {}
    for (const [key, entry] of Object.entries(sessionStats.levelScores)) {
        assert(safeKey(key))
        assert(isObject(entry))
        levelScores[key] = {
            rank: read(rank, entry.rank),
            bestScore: read(finiteNumber, entry.bestScore),
            attempts: read(count, entry.attempts),
            lastScore: read(finiteNumber, entry.lastScore),
            surfacePenalties: read(number, entry.surfacePenalties),
        }
    }

    const achievementProgress = {}
    for (const [key, entry] of Object.entries(achievements.achievementProgress)) {
        assert(safeKey(key))
        assert(typeof entry === 'boolean' || number(entry))
        achievementProgress[key] = entry
    }

    const performanceStats = {}
    for (const [key, entry] of Object.entries(profile.performanceStats)) {
        assert(safeKey(key))
        assert(entry === null || typeof entry === 'boolean' || typeof entry === 'string' || finiteNumber(entry))
        if (typeof entry === 'string') assert(entry.length <= 500 && !hasControlChar(entry))
        performanceStats[key] = entry
    }

    return {
        id: text(profile.id, 128),
        name: text(profile.name, 200),
        hidden: read(bool, profile.hidden),
        bypassLevelRequirements: read(bool, profile.bypassLevelRequirements),
        allowsCaptures: read(bool, profile.allowsCaptures),
        allowsHiddenCaptures: read(bool, profile.allowsHiddenCaptures),
        statTrackingEnabled: read(bool, profile.statTrackingEnabled),
        timeStats: {
            totalPlayTime: read(number, timeStats.totalPlayTime),
            holdTimeByDepth: depths(number, timeStats.holdTimeByDepth),
        },
        diveStats: {
            divesByDepth: depths(count, diveStats.divesByDepth),
            perfectTaskExecutions: {
                HOLDPOSITION: read(count, perfect.HOLDPOSITION),
                UPANDDOWN: read(count, perfect.UPANDDOWN),
                HITDEPTH: read(count, perfect.HITDEPTH),
                HOLDANDCLAP: read(count, perfect.HOLDANDCLAP),
            },
        },
        sessionStats: {
            lastPlayDate: sessionStats.lastPlayDate === null ? null : read(date, sessionStats.lastPlayDate),
            playDates: sessionStats.playDates.map((entry) => read(date, entry)),
            levelScores,
            levelsCompletedToday: read(count, sessionStats.levelsCompletedToday),
        },
        achievements: {
            unlockedAchievements: achievements.unlockedAchievements.map((id) => text(id, 200)),
            achievementProgress,
        },
        performanceStats,
    }
}

function finalizeProfile(profile) {
    const validated = validatePlayerProfile(profile)
    const state = normalizePlayerProfilesState({
        version: PLAYER_PROFILES_SCHEMA_VERSION,
        activeProfileId: validated.id,
        profiles: { [validated.id]: validated },
    })
    return validatePlayerProfile(state.profiles[validated.id])
}

/**
 * @param {object} profile
 * @returns {string}
 */
export function exportPlayerProfile(profile) {
    return JSON.stringify({
        format: PLAYER_PROFILE_FORMAT,
        exportedAt: new Date().toISOString(),
        profile: finalizeProfile(profile),
    }, null, 2)
}

/**
 * @param {string} text
 * @returns {object}
 */
export function parsePlayerProfile(fileText) {
    let backup
    try {
        backup = JSON.parse(fileText)
    } catch {
        throw new Error(INVALID_JSON)
    }
    if (!isObject(backup) || backup.format !== PLAYER_PROFILE_FORMAT) {
        throw new Error(INVALID_FORMAT)
    }
    return finalizeProfile(backup.profile)
}

/**
 * Download name for the active profile. Spaces become hyphens.
 * @param {object} profile
 */
export function profileExportFileName(profile) {
    const raw = typeof profile?.name === 'string' ? profile.name : ''
    const slug = Array.from(raw)
        .filter((ch) => ch.charCodeAt(0) >= 32 && !'<>:"/\\|?*'.includes(ch))
        .join('')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[-.]+|[-.]+$/g, '')
    return `${slug || 'profile'}-profile.json`
}
