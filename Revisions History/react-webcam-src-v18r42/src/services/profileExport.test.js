import { createEmptyProfile } from '../atoms/playerProfilesModel'
import {
    PLAYER_PROFILE_FORMAT,
    exportPlayerProfile,
    parsePlayerProfile,
    profileExportFileName,
} from './profileExport'

const saved = () => ({
    ...createEmptyProfile('profile-1', 'Alex'),
    hidden: true,
    bypassLevelRequirements: true,
    allowsCaptures: true,
    allowsHiddenCaptures: false,
    statTrackingEnabled: true,
    timeStats: { totalPlayTime: 123.5, holdTimeByDepth: { 1: 5, 2: 10, 3: 15, 4: 20 } },
    diveStats: {
        divesByDepth: { 1: 1, 2: 2, 3: 3, 4: 4 },
        perfectTaskExecutions: { HOLDPOSITION: 2, UPANDDOWN: 3, HITDEPTH: 4, HOLDANDCLAP: 5 },
    },
    sessionStats: {
        lastPlayDate: '2026-09-16',
        playDates: ['2026-09-16', '2026-09-16'],
        levelsCompletedToday: 2,
        levelScores: {
            customLevel: { rank: 4, bestScore: 100, attempts: 2, lastScore: 90, surfacePenalties: 0 },
        },
    },
    achievements: {
        unlockedAchievements: ['good_dive'],
        achievementProgress: { good_dive: true, dozen: 2, training_dedication: 123.5 },
    },
    performanceStats: { focus: 1 },
})

const file = (profile) => JSON.stringify({
    format: PLAYER_PROFILE_FORMAT,
    exportedAt: '2026-09-22T12:00:00.000Z',
    profile,
})

test('round trips one profile, including hold-and-clap and level scores', () => {
    expect(parsePlayerProfile(exportPlayerProfile(saved()))).toEqual(saved())
})

test('supports a fresh profile with no progress', () => {
    const profile = createEmptyProfile('profile-2', 'New')
    expect(parsePlayerProfile(file(profile))).toEqual(profile)
})

test('strips credentials, packs, levels, calibration, and device ids', () => {
    const profile = {
        ...saved(),
        elevenLabs: { apiKey: 'sk-secret' },
        apiKey: 'private',
        audioFiles: { Custom: { Custom1: 'blob' } },
        tasks: [{ type: 'hold', desc: 'level body' }],
        customLevels: [{ id: 'level-1' }],
        calibration: { points: [1, 2, 3] },
        deviceId: 'camera-1',
        cameraVideoDeviceId: 'device-9',
        customLevelFolderNames: ['Secret'],
        timeStats: { ...saved().timeStats, elevenLabs: { apiKey: 'nested-secret' } },
    }
    const text = exportPlayerProfile(profile)
    expect(text).not.toContain('sk-secret')
    expect(text).not.toContain('nested-secret')
    expect(text).not.toContain('camera-1')
    expect(text).not.toContain('Secret')
    expect(parsePlayerProfile(text)).toEqual(saved())
    expect(parsePlayerProfile(file(profile))).toEqual(saved())
})

test('default cannot come back hidden, capture-enabled, or with folder names', () => {
    const profile = {
        ...createEmptyProfile('default', 'Default'),
        hidden: true,
        allowsCaptures: true,
        allowsHiddenCaptures: true,
        customLevelFolderNames: ['Imported'],
    }
    const imported = parsePlayerProfile(file(profile))
    expect(imported.hidden).toBe(false)
    expect(imported.allowsCaptures).toBe(false)
    expect(imported.allowsHiddenCaptures).toBe(false)
    expect(imported.customLevelFolderNames).toBeUndefined()
    expect(imported.bypassLevelRequirements).toBe(false)
})

test.each([
    (profile) => { delete profile.timeStats },
    (profile) => { profile.timeStats.totalPlayTime = -1 },
    (profile) => { profile.diveStats.divesByDepth[1] = '2' },
    (profile) => { profile.diveStats.perfectTaskExecutions.HOLDANDCLAP = 1.5 },
    (profile) => { profile.sessionStats.playDates = ['invalid'] },
    (profile) => { profile.sessionStats.levelScores.customLevel.rank = 99 },
    (profile) => { profile.achievements.achievementProgress.dozen = null },
    (profile) => { profile.achievements.unlockedAchievements = [12] },
    (profile) => { profile.hidden = 'yes' },
    (profile) => { profile.performanceStats = { pack: { audioFiles: {} } } },
])('rejects malformed profile data before returning importable data', (mutate) => {
    const profile = saved()
    mutate(profile)
    expect(() => parsePlayerProfile(file(profile))).toThrow('invalid profile data')
})

test('rejects invalid JSON, unrelated files, and unsupported versions', () => {
    for (const text of [
        '{',
        'null',
        '{}',
        '{"format":"player-profile-v2"}',
        '{"format":"game-data-v1","data":{}}',
        '{"format":"level-v1","level":{"title":"Nope"}}',
    ]) {
        expect(() => parsePlayerProfile(text)).toThrow()
    }
})

test('names the download from the profile name', () => {
    expect(profileExportFileName({ name: 'Alex Rider' })).toBe('Alex-Rider-profile.json')
    expect(profileExportFileName({ name: 'a/b:c' })).toBe('abc-profile.json')
    expect(profileExportFileName({ name: '   ' })).toBe('profile-profile.json')
})
