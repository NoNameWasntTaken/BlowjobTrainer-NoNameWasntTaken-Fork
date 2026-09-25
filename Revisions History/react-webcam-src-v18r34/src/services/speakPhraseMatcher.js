/**
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function levenshtein(a, b) {
    const m = a.length
    const n = b.length
    if (m === 0) return n
    if (n === 0) return m
    let prev = new Array(n + 1)
    for (let j = 0; j <= n; j++) prev[j] = j
    for (let i = 1; i <= m; i++) {
        const cur = new Array(n + 1)
        cur[0] = i
        const ca = a.charCodeAt(i - 1)
        for (let j = 1; j <= n; j++) {
            const cost = ca === b.charCodeAt(j - 1) ? 0 : 1
            cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
        }
        prev = cur
    }
    return prev[n]
}

/** Max edit distance for a bracket alternative (normal pass). */
function altMaxDistNormal(opt) {
    return opt.length <= 5 ? 1 : 2
}

/** Stricter fuzzy on alts when accepting only at endpoint (task flag). */
function altMaxDistEndpointBoost(opt) {
    return Math.min(3, altMaxDistNormal(opt) + 1)
}

function skipSpacesIdx(h, i) {
    let k = i
    while (k < h.length && h[k] === ' ') k++
    return k
}

/** Next whitespace-delimited token starting at start (after skipping spaces). */
function nextTokenAt(h, start) {
    const i = skipSpacesIdx(h, start)
    if (i >= h.length) return { token: '', end: i }
    let j = i
    while (j < h.length && h[j] !== ' ') j++
    return { token: h.slice(i, j), end: j }
}

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
 * Normalize text for a literal slice between bracket groups. {@link normalizeSpeakText} trims the
 * whole string, which removes the space after `]` or before `[` (e.g. `] and swallow` → `and swallow`),
 * so matching `suck` + literal would require `suckand` instead of `suck and`. Preserve a single
 * leading/trailing space when the raw slice had whitespace on that edge.
 * @param {string} raw
 * @returns {string}
 */
function normalizeSpeakBracketLiteral(raw) {
    if (!raw || typeof raw !== 'string') return ''
    const hadLeadingWs = /^\s/.test(raw)
    const hadTrailingWs = /\s$/.test(raw)
    let s = normalizeSpeakText(raw)
    if (hadLeadingWs && s && !s.startsWith(' ')) s = ` ${s}`
    if (hadTrailingWs && s && !s.endsWith(' ')) s = `${s} `
    return s
}

/**
 * @typedef {{ type: 'lit', s: string }} LitPart
 * @typedef {{ type: 'alt', options: string[], allowsOmission: boolean }} AltPart
 */

/**
 * Parse one segment into literal and [comma-separated alternative] chunks.
 * Unmatched `[` is treated as literal from that position to end.
 * A lone `-` option means optional omission (handled in {@link compileSpeakSegment}).
 * @param {string} segment
 * @returns {(LitPart|AltPart)[]}
 */
function parseBracketParts(segment) {
    if (!segment || typeof segment !== 'string') return [{ type: 'lit', raw: '' }]
    const parts = []
    let i = 0
    while (i < segment.length) {
        const open = segment.indexOf('[', i)
        if (open === -1) {
            parts.push({ type: 'lit', raw: segment.slice(i) })
            break
        }
        if (open > i) {
            parts.push({ type: 'lit', raw: segment.slice(i, open) })
        }
        const close = segment.indexOf(']', open + 1)
        if (close === -1) {
            parts.push({ type: 'lit', raw: segment.slice(open) })
            break
        }
        const inner = segment.slice(open + 1, close)
        const rawOptions = inner
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean)
        if (rawOptions.length > 0) {
            parts.push({ type: 'alt', rawOptions })
        }
        i = close + 1
    }
    return parts
}

/**
 * @param {(LitPart|AltPart & { raw?: string, rawOptions?: string[] })[]} rawParts
 * @returns {{ kind: 'pattern', parts: (LitPart|AltPart)[], minMatchLen: number, earlyAnchor: string } | { kind: 'plain', normalized: string }}
 */
export function compileSpeakSegment(rawSegment) {
    const segment = rawSegment == null ? '' : String(rawSegment)
    if (!segment.includes('[')) {
        const normalized = normalizeSpeakText(segment)
        return { kind: 'plain', normalized }
    }

    const rawParsed = parseBracketParts(segment)
    /** @type {(LitPart|AltPart)[]} */
    const parts = []
    let minMatchLen = 0
    let earlyAnchor = ''

    for (const p of rawParsed) {
        if (p.type === 'lit') {
            const raw = 'raw' in p ? p.raw : p.s
            const s = normalizeSpeakBracketLiteral(raw || '')
            if (!s) {
                continue
            }
            parts.push({ type: 'lit', s })
            minMatchLen += s.length
            const anchorCand = s.replace(/^\s+/, '')
            if (anchorCand.length >= 2 && anchorCand.length > earlyAnchor.length) {
                earlyAnchor = anchorCand
            }
        } else {
            const rawOpts = p.rawOptions || []
            const onlyDash =
                rawOpts.length > 0 && rawOpts.every((x) => String(x).trim() === '-')
            if (onlyDash) {
                continue
            }
            const allowsOmission = rawOpts.some((x) => String(x).trim() === '-')
            const opts = rawOpts
                .filter((x) => String(x).trim() !== '-')
                .map((o) => normalizeSpeakText(o))
                .filter(Boolean)
            if (opts.length === 0) continue
            const sorted = [...opts].sort((a, b) => b.length - a.length)
            parts.push({ type: 'alt', options: sorted, allowsOmission })
            minMatchLen += allowsOmission ? 0 : Math.min(...sorted.map((o) => o.length))
        }
    }

    if (!parts.some((x) => x.type === 'alt')) {
        const normalized = normalizeSpeakText(segment.replace(/\[[^\]]*\]/g, ''))
        return { kind: 'plain', normalized }
    }

    return { kind: 'pattern', parts, minMatchLen, earlyAnchor }
}

/**
 * Match pattern from a fixed start index in normalized hypothesis.
 * Alternatives: exact prefix, else fuzzy match on next token (Levenshtein ≤ k).
 * @param {string} h
 * @param {number} start
 * @param {(LitPart|AltPart)[]} patternParts
 * @param {boolean} endpointBoostAlts - use looser k for optional endpoint-only pass
 * @returns {boolean}
 */
/** Exported for unit tests and debugging consecutive-alt / omission cases. */
export function matchPatternFrom(h, start, patternParts, endpointBoostAlts = false) {
    let cursor = start
    /** Next literal may omit leading spaces (after an alt matched by omission). */
    let flexLiteralAfterOmission = false
    for (const part of patternParts) {
        if (part.type === 'lit') {
            if (!part.s) {
                continue
            }
            if (flexLiteralAfterOmission) {
                const trimmed = part.s.replace(/^\s+/, '')
                flexLiteralAfterOmission = false
                cursor = skipSpacesIdx(h, cursor)
                if (!trimmed) continue
                if (!h.startsWith(trimmed, cursor)) return false
                cursor += trimmed.length
            } else {
                if (!h.startsWith(part.s, cursor)) return false
                cursor += part.s.length
            }
        } else {
            const allowsOmission = part.allowsOmission ?? false
            let matched = false
            let choseOmission = false
            cursor = skipSpacesIdx(h, cursor)
            const atTok = cursor
            const { token, end } = nextTokenAt(h, cursor)
            for (const opt of part.options) {
                if (!opt) continue
                if (h.startsWith(opt, atTok)) {
                    cursor = atTok + opt.length
                    matched = true
                    break
                }
                const maxD = endpointBoostAlts ? altMaxDistEndpointBoost(opt) : altMaxDistNormal(opt)
                if (token && levenshtein(opt, token) <= maxD) {
                    // Same position as exact match: end is the index after the hypothesis token (often a
                    // space). Do not skip that space — the next literal may require it (e.g. ` this `).
                    cursor = end
                    matched = true
                    break
                }
            }
            if (!matched && allowsOmission) {
                matched = true
                choseOmission = true
            }
            if (!matched) return false
            if (choseOmission) flexLiteralAfterOmission = true
        }
    }
    return true
}

/**
 * True if normalized hypothesis contains a contiguous match for the compiled segment (substring semantics).
 * @param {string} hNorm
 * @param {{ kind: 'pattern', parts: (LitPart|AltPart)[] }} compiled
 * @param {boolean} [endpointBoostAlts]
 * @returns {boolean}
 */
function hypothesisMatchesPatternNorm(hNorm, compiled, endpointBoostAlts = false) {
    const { parts } = compiled
    if (parts.length === 0) return false
    const h = hNorm
    const end = h.length
    for (let s = 0; s <= end; s++) {
        if (matchPatternFrom(h, s, parts, endpointBoostAlts)) return true
    }
    return false
}

/**
 * Plain phrase: allow small Levenshtein between target and some contiguous word span (endpoint-only).
 * @param {string} hNorm
 * @param {string} targetNorm
 * @param {boolean} endpointBoost
 */
function fuzzyPlainSpanMatch(hNorm, targetNorm, endpointBoost) {
    if (!targetNorm) return false
    if (hNorm.includes(targetNorm)) return true
    const maxDist = endpointBoost
        ? targetNorm.length <= 6
            ? 2
            : 3
        : targetNorm.length <= 6
          ? 1
          : 2
    const words = hNorm.split(/\s+/).filter(Boolean)
    for (let i = 0; i < words.length; i++) {
        for (let j = i; j < words.length; j++) {
            const sub = words.slice(i, j + 1).join(' ')
            if (levenshtein(targetNorm, sub) <= maxDist) return true
        }
    }
    return false
}

/**
 * @param {string} hNorm - normalized hypothesis
 * @param {{ kind: 'plain', normalized: string } | { kind: 'pattern', parts: (LitPart|AltPart)[], minMatchLen: number, earlyAnchor: string }} compiled
 * @returns {boolean}
 */
export function hypothesisMatchesCompiledNorm(hNorm, compiled) {
    if (!compiled) return false
    if (compiled.kind === 'plain') {
        const t = compiled.normalized
        if (!t) return false
        if (hNorm.includes(t)) return true
        if (t.length <= 4 && hNorm.split(/\s+/).includes(t)) return true
        return false
    }
    return hypothesisMatchesPatternNorm(hNorm, compiled, false)
}

/**
 * Endpoint-only fallback: looser alt k and/or plain span Levenshtein (when task enables `speakEndpointFuzzy`).
 * @param {string} hypothesis - raw ASR text
 * @param {{ kind: 'plain', normalized: string } | { kind: 'pattern', parts: (LitPart|AltPart)[] }} compiled
 * @returns {boolean}
 */
export function hypothesisMatchesCompiledEndpointFuzzy(hypothesis, compiled) {
    if (!compiled) return false
    const hNorm = normalizeSpeakText(hypothesis || '')
    if (compiled.kind === 'plain') {
        const t = compiled.normalized
        if (!t) return false
        if (hypothesisMatchesCompiledNorm(hNorm, compiled)) return true
        return fuzzyPlainSpanMatch(hNorm, t, true)
    }
    if (hypothesisMatchesPatternNorm(hNorm, compiled, false)) return true
    return hypothesisMatchesPatternNorm(hNorm, compiled, true)
}

/**
 * @param {string} hypothesis - raw ASR text
 * @param {{ kind: 'plain', normalized: string } | { kind: 'pattern', parts: (LitPart|AltPart)[], minMatchLen: number, earlyAnchor: string }} compiled
 * @returns {boolean}
 */
export function hypothesisMatchesCompiled(hypothesis, compiled) {
    const hNorm = normalizeSpeakText(hypothesis || '')
    return hypothesisMatchesCompiledNorm(hNorm, compiled)
}

/**
 * Cheap filter for early-stable UI: length + optional anchor substring (plain: same as full match for "contains").
 * Patterns: if {@link compiled.earlyAnchor} already appears in the hypothesis, treat as building once length ≥ 8
 * (avoids requiring nearly the full {@link compiled.minMatchLen} before early-stable can run on multi-alt phrases).
 * @param {string} hNorm
 * @param {{ kind: 'plain', normalized: string } | { kind: 'pattern', minMatchLen: number, earlyAnchor: string }} compiled
 * @returns {boolean}
 */
export function compiledMightBeBuildingTowardMatch(hNorm, compiled) {
    if (!compiled) return false
    if (compiled.kind === 'plain') {
        const t = compiled.normalized
        if (!t) return false
        if (hNorm.includes(t)) return true
        if (t.length <= 4 && hNorm.split(/\s+/).includes(t)) return true
        return false
    }
    const minBar = 8
    if (hNorm.length < minBar) return false
    const anchor = compiled.earlyAnchor
    if (anchor && hNorm.includes(anchor)) return true
    const anchorTrim = anchor ? anchor.trim() : ''
    if (anchorTrim.length >= 2 && hNorm.includes(anchorTrim)) return true
    if (hNorm.length < compiled.minMatchLen) return false
    if (!anchor) return true
    return hNorm.includes(anchor)
}

/**
 * @param {string} hypothesis - raw ASR text
 * @param {string} target - required phrase or segment (may include [a, b] alternatives)
 * @returns {boolean}
 */
export function phraseMatchesTarget(hypothesis, target) {
    return hypothesisMatchesCompiled(hypothesis, compileSpeakSegment(target))
}
