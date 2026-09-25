/**
 * Minimal sentence split for long-mode Speak (author uses `. ? !` between sentences).
 * @param {string} phrase
 * @returns {string[]}
 */
export function splitSpeakSegments(phrase) {
    if (!phrase || typeof phrase !== 'string') return ['']
    const normalized = phrase.replace(/\r\n|\n|\r/g, ' ').trim()
    if (!normalized) return ['']
    const parts = normalized
        .split(/(?<=[.?!])\s+/)
        .map((s) => s.trim())
        .filter(Boolean)
    return parts.length > 0 ? parts : [normalized]
}
