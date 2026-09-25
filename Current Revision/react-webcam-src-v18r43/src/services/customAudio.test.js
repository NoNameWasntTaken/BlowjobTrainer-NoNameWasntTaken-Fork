import { CUSTOM_VOICE_SLOT_KEYS } from '../constants/customVoiceCategories'
import { normalizeAudioRef } from '../constants/audioRefAliases'
import { migrateAudioPack } from '../utils/audioPackMigration'
import { resolveAudioReference } from './audioResolver'
import {
    addCustomCue,
    deleteCustomCue,
    getAudioMode,
    getCustomAudioOptions,
    listCustomCueKeys,
    normalizeCustomCueName,
    renameCustomCue,
    validateCustomCueName,
} from './customAudio'

const pack = {
    id: 'test-pack',
    audioFiles: {
        Custom: {
            'hello world': 'data:audio/mpeg;base64,A',
            'phase.two': ['data:audio/mpeg;base64,B'],
            empty: [],
        },
        Release: { POST_RELEASE: 'end' },
        Hold: { TWO: 'hold' },
        LevelStart: { GENERIC: 'intro' },
    },
}

beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
    jest.restoreAllMocks()
})

test('names accept the Custom prefix, spaces and periods without changing key identity', () => {
    expect(normalizeCustomCueName(' custom.hello world ')).toBe('hello world')
    expect(validateCustomCueName('Custom.phase.two')).toBe('')
    expect(validateCustomCueName('Custom.')).toBeTruthy()
    expect(validateCustomCueName('../escape')).toBeTruthy()
    expect(validateCustomCueName('__proto__')).toBeTruthy()
    expect(validateCustomCueName('constructor')).toBeTruthy()
    expect(validateCustomCueName('prototype')).toBeTruthy()
})

test('custom picker lists only playable custom cues from this pack', () => {
    expect(getCustomAudioOptions(pack)).toEqual([
        { value: 'Custom.hello world', label: 'Custom.hello world' },
        { value: 'Custom.phase.two', label: 'Custom.phase.two' },
    ])
    expect(getCustomAudioOptions(null)).toEqual([])
})

test('infers separate audio modes and migrates legacy release selections', () => {
    expect(getAudioMode({ audio: 'custom.hello world' })).toBe('custom')
    expect(getAudioMode({ audio: 'Release.POST_RELEASE' })).toBe('release')
    expect(getAudioMode({ audioMode: 'custom', audio: 'Release.POST_RELEASE' })).toBe('release')
    expect(getAudioMode({ audioMode: 'custom', audio: null })).toBe('custom')
    expect(getAudioMode({ audioMode: 'release', audio: null })).toBe('release')
    expect(getAudioMode({ audioMode: 'standard', audio: 'Custom.hello world' })).toBe('standard')
})

test('resolver uses the primary pack, preserves dotted names and skips missing cues', () => {
    expect(resolveAudioReference('custom.hello world', pack)).toBe(pack.audioFiles.Custom['hello world'])
    expect(resolveAudioReference('Custom.phase.two', pack)).toEqual(pack.audioFiles.Custom['phase.two'])
    expect(resolveAudioReference('Custom.phase', pack)).toBeNull()
    expect(resolveAudioReference('Custom.missing_END', pack)).toBeNull()
    expect(resolveAudioReference('Custom.empty', pack)).toBeNull()
    expect(resolveAudioReference('Hold.TWO', pack)).toBe('hold')
    const other = { id: 'other', audioFiles: { Custom: { 'hello world': 'wrong voice' } } }
    expect(resolveAudioReference('Custom.hello world', pack, other)).toBe(pack.audioFiles.Custom['hello world'])
    expect(resolveAudioReference('Level.BEGINT_START', null)).toEqual(resolveAudioReference('Level.BEGINT_1_START', null))
})

test('first-dot split keeps a dotted cue distinct from its prefix', () => {
    const dotted = {
        audioFiles: {
            Custom: {
                phase: 'short',
                'phase.two': 'dotted',
            },
        },
    }
    expect(resolveAudioReference('Custom.phase.two', dotted)).toBe('dotted')
    expect(resolveAudioReference('Custom.phase', dotted)).toBe('short')
})

test('legacy Custom1–Custom40 keys still resolve and extra cues are listed', () => {
    const custom = {}
    for (const key of CUSTOM_VOICE_SLOT_KEYS) {
        custom[key] = key === 'Custom1' ? 'slot-one' : ''
    }
    custom['phase.two'] = 'dotted'
    const legacy = {
        audioFiles: { Custom: custom },
    }

    expect(CUSTOM_VOICE_SLOT_KEYS).toHaveLength(40)
    expect(resolveAudioReference('Custom.Custom1', legacy)).toBe('slot-one')
    expect(resolveAudioReference('Custom.Custom40', legacy)).toBeNull()
    expect(resolveAudioReference('Custom.phase.two', legacy)).toBe('dotted')
    expect(getCustomAudioOptions(legacy)).toEqual([
        { value: 'Custom.Custom1', label: 'Custom.Custom1' },
        { value: 'Custom.phase.two', label: 'Custom.phase.two' },
    ])
    expect(listCustomCueKeys(legacy)).toEqual([...CUSTOM_VOICE_SLOT_KEYS, 'phase.two'])
})

test('renamed keys still resolve Custom.Custom7 and a second rename keeps the chain', () => {
    const renamed = renameCustomCue({
        audioFiles: { Custom: { Custom7: 'clip' } },
    }, 'Custom7', 'hello')
    expect(renamed.error).toBe('')
    expect(renamed.pack.audioFiles.Custom.hello).toBe('clip')
    expect(renamed.pack.audioFiles.Custom.Custom7).toBeUndefined()
    expect(renamed.pack.customNames).toBeUndefined()
    expect(renamed.pack.audioRefAliases['Custom.Custom7']).toBe('Custom.hello')
    expect(normalizeAudioRef('Custom.Custom7', renamed.pack.audioRefAliases)).toBe('Custom.hello')
    expect(resolveAudioReference('Custom.Custom7', renamed.pack)).toBe('clip')
    expect(resolveAudioReference('custom.hello', renamed.pack)).toBe('clip')

    const again = renameCustomCue(renamed.pack, 'hello', 'phase.two')
    expect(again.pack.audioRefAliases['Custom.Custom7']).toBe('Custom.phase.two')
    expect(again.pack.audioRefAliases['Custom.hello']).toBe('Custom.phase.two')
    expect(resolveAudioReference('Custom.Custom7', again.pack)).toBe('clip')
    expect(resolveAudioReference('Custom.phase.two', again.pack)).toBe('clip')
    expect(normalizeAudioRef('Level.BEGINT_START', again.pack.audioRefAliases)).toBe('Level.BEGINT_1_START')
})

test('migration keeps Custom1–Custom40, accepts extra names, and does not invent empty slots', () => {
    const levelRef = 'Custom.Custom1'
    const customFiles = {
        Custom1: 'a',
        Custom40: 'b',
        'phase.two': 'c',
        '../nope': 'd',
    }
    Object.defineProperty(customFiles, '__proto__', {
        value: 'e',
        enumerable: true,
        writable: true,
        configurable: true,
    })
    const { pack: migrated, migrated: didMigrate } = migrateAudioPack({
        id: 'p',
        audioFiles: {
            Custom: customFiles,
        },
        customNames: {
            'Custom.Custom1': 'One',
            'Custom.Custom40': 'Forty',
            'Custom.phase.two': 'Phase',
            'Custom../nope': 'Bad',
        },
        audioRefAliases: {
            'custom.Custom7': 'Custom.phase.two',
            'Level.BEGINT_START': 'Level.NOPE',
        },
    })

    expect(didMigrate).toBe(true)
    expect(levelRef).toBe('Custom.Custom1')
    expect(migrated.audioFiles.Custom.One).toBe('a')
    expect(migrated.audioFiles.Custom.Forty).toBe('b')
    expect(migrated.audioFiles.Custom.Phase).toBe('c')
    expect(migrated.audioFiles.Custom.Custom1).toBeUndefined()
    expect(migrated.audioFiles.Custom['phase.two']).toBeUndefined()
    expect(migrated.audioFiles.Custom['../nope']).toBeUndefined()
    expect(Object.prototype.hasOwnProperty.call(migrated.audioFiles.Custom, '__proto__')).toBe(false)
    expect(migrated.audioFiles.Custom.Custom2).toBeUndefined()
    expect(migrated.customNames).toBeUndefined()
    expect(migrated.customCueSchema).toBe('open')
    expect(migrated.audioRefAliases['Custom.Custom1']).toBe('Custom.One')
    expect(migrated.audioRefAliases['Custom.Custom7']).toBe('Custom.Phase')
    expect(migrated.audioRefAliases['Custom.phase.two']).toBe('Custom.Phase')
    expect(migrated.audioRefAliases['Level.BEGINT_START']).toBeUndefined()
    expect(resolveAudioReference(levelRef, migrated)).toBe('a')
    expect(resolveAudioReference('Custom.Custom7', migrated)).toBe('c')
    expect(resolveAudioReference('Custom.Phase', migrated)).toBe('c')
})

test('a display name becomes the voice key and the old reference still plays', () => {
    const { pack: migrated } = migrateAudioPack({
        audioFiles: { Custom: { CUSTOM1: 'clip' } },
        customNames: { 'Custom.CUSTOM1': 'PhaseTwo' },
    })
    expect(migrated.audioFiles.Custom.PhaseTwo).toBe('clip')
    expect(migrated.audioFiles.Custom.CUSTOM1).toBeUndefined()
    expect(migrated.customNames).toBeUndefined()
    expect(migrated.audioRefAliases['Custom.CUSTOM1']).toBe('Custom.PhaseTwo')
    expect(resolveAudioReference('Custom.CUSTOM1', migrated)).toBe('clip')
    expect(resolveAudioReference('Custom.PhaseTwo', migrated)).toBe('clip')
})

test('adding a cue validates the name and deleting removes that key only', () => {
    const added = addCustomCue({ audioFiles: {} }, ' Custom.phase.two ')
    expect(added.error).toBe('')
    expect(added.pack.audioFiles.Custom['phase.two']).toBe('')
    expect(added.pack.customNames).toBeUndefined()
    expect(listCustomCueKeys(added.pack)).toEqual(['phase.two'])
    expect(addCustomCue(added.pack, '../escape').error).toBeTruthy()
    expect(addCustomCue(added.pack, 'phase.two').error).toBeTruthy()

    const removed = deleteCustomCue(added.pack, 'phase.two')
    expect(removed.audioFiles.Custom['phase.two']).toBeUndefined()
    expect(removed.customNames).toBeUndefined()
    expect(listCustomCueKeys(removed)).toEqual([])
})
