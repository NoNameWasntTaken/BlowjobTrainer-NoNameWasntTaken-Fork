/**
 * Normalize spoken / expected phrase text for comparison.
 * @param {string} s
 * @returns {string}
 */
export function normalizeSpeakText(s) {
    if (!s || typeof s !== 'string') return ''
    let t = s.toLowerCase()
    try {
        t = t.normalize('NFD').replace(/\p{M}/gu, '')
    } catch (e) {
        t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    }
    t = t.replace(/[^a-z0-9\s']/g, ' ')
    t = t.replace(/\s+/g, ' ').trim()
    const contractions = [
        [/\bi\s*'\s*m\b/g, 'i am'],
        [/\bi\s*'\s*ve\b/g, 'i have'],
        [/\bdon\s*'\s*t\b/g, 'do not'],
        [/\bwon\s*'\s*t\b/g, 'will not'],
        [/\bcan\s*'\s*t\b/g, 'cannot'],
    ]
    for (const [re, rep] of contractions) {
        t = t.replace(re, rep)
    }
    return t
}

/**
 * @param {string} hypothesis - raw ASR text
 * @param {string} target - required phrase or segment
 * @returns {boolean}
 */
export function phraseMatchesTarget(hypothesis, target) {
    const h = normalizeSpeakText(hypothesis)
    const t = normalizeSpeakText(target)
    if (!t) return false
    if (h.includes(t)) return true
    if (t.length <= 4 && h.split(/\s+/).includes(t)) return true
    return false
}
