import {
    compileSpeakSegment,
    compiledMightBeBuildingTowardMatch,
    hypothesisMatchesCompiled,
    hypothesisMatchesCompiledNorm,
    matchPatternFrom,
    normalizeSpeakText,
} from './speakPhraseMatcher'

const consecutiveAltsPhrase =
    '[Lord, Ought, To, Art, Lawerence, Part, Ed] [witness, witnesses, witnessed] this [honor, honour, owner].'

describe('speakPhraseMatcher consecutive bracket groups', () => {
    test('minimal consecutive alts without space between brackets', () => {
        const c = compileSpeakSegment('[a,b][c,d] ef')
        expect(c.kind).toBe('pattern')
        const h = normalizeSpeakText('a c ef')
        expect(matchPatternFrom(h, 0, c.parts, false)).toBe(true)
    })

    test('compile omits empty literals between ] [', () => {
        const c = compileSpeakSegment(consecutiveAltsPhrase)
        expect(c.kind).toBe('pattern')
        expect(c.parts.every((p) => p.type !== 'lit' || p.s.length > 0)).toBe(true)
        expect(c.parts.filter((p) => p.type === 'lit')).toHaveLength(1)
    })

    test('full hypothesis matches', () => {
        const c = compileSpeakSegment(consecutiveAltsPhrase)
        const h = normalizeSpeakText('Lord witness this honor')
        expect(matchPatternFrom(h, 0, c.parts, false)).toBe(true)
        expect(hypothesisMatchesCompiled('Lord witness this honor', c)).toBe(true)
        expect(hypothesisMatchesCompiled('lord witness this honor', c)).toBe(true)
    })

    test('partial hypotheses can be "building" once anchor appears (not blocked by minMatchLen)', () => {
        const c = compileSpeakSegment(consecutiveAltsPhrase)
        expect(c.kind).toBe('pattern')
        const partial = normalizeSpeakText('lord witness this')
        expect(partial.length).toBeLessThan(c.minMatchLen)
        expect(compiledMightBeBuildingTowardMatch(partial, c)).toBe(true)
    })

    test('too-short partial still false', () => {
        const c = compileSpeakSegment(consecutiveAltsPhrase)
        expect(compiledMightBeBuildingTowardMatch('lord wit', c)).toBe(false)
    })
})

describe('speakPhraseMatcher omission + space between brackets', () => {
    test('omission through empty literal preserves flex for next non-empty literal', () => {
        const c = compileSpeakSegment('[suck, duck, -] [and, end] test')
        expect(c.kind).toBe('pattern')
        const h = normalizeSpeakText('and test')
        expect(hypothesisMatchesCompiledNorm(h, c)).toBe(true)
    })
})
