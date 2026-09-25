/**
 * Endless task scoring constants and helpers
 */

import { Tempo } from '../Tasks/task'

// Mirrors HoldDepth except depth 4 → 3 pts/s (Endless only; HoldDepth stays 4).
export const HOLD_POINTS_PER_DEPTH = [0, 0.5, 1, 1.5, 3]
/** One level deeper than hold anchor: score at this fraction of anchor depth rate (matches HoldDepth DEEP_ONE) */
export const HOLD_DEEP_ONE_SCORE_MULT = 0.25
export const CLAP_BONUS_BASE = 1
export const DEPTH_CLAP_FACTOR = { 1: 1.0, 2: 1.25, 3: 1.5, 4: 2.0 }
export const SURFACE_PENALTY = -4

/** Round hold-duration seconds to nearest 0.1s (Endless persistence / summaries). */
export function roundHoldSecondsTenth(seconds) {
    const n = Number(seconds)
    if (!Number.isFinite(n)) return 0
    return Math.round(n * 10) / 10
}

// Grace period
export const GRACE_INITIAL = 5
export const GRACE_MAX = 30
export const HOLD_GRACE_RATE = 1 // seconds per 10 points earned (holds)
export const DIVE_GRACE_RATE = 0.5 // seconds per 10 points earned (dives)
// Depth multiplier for grace earned from holds: [0.5, 1.0, 2.0, 3.0] for depths 1-4
export const DEPTH_GRACE_FACTOR = { 1: 0.5, 2: 1.0, 3: 2.0, 4: 3.0 }

// Balls bonus (Endless): 1 pt per second
export const BALLS_BONUS_INITIAL_POINTS = 1
export const BALLS_BONUS_INTERVAL_SEC = 1
export const BALLS_BONUS_PER_INTERVAL = 1

/** Max prior dives compared for per-stroke depth/rhythm bonuses */
export const DIVE_HISTORY_MAX = 5
/** @deprecated alias — same as DIVE_HISTORY_MAX */
export const DIVE_WINDOW_SIZE = DIVE_HISTORY_MAX

/** Idle gap (ms) since last dive resets prior-dive history for bonus matching */
export const DIVE_IDLE_RESET_MS = 10000

/** Fraction of raw dive score per matching prior dive (depth vs current; rhythm tempo bucket vs current), per axis */
export const PRIOR_MATCH_BONUS_FRACTION = 0.1

/**
 * Map BPM to Tempo enum (30/60/90) for getDiveScore
 * SLOW < 45, MEDIUM 45-75, FAST > 75
 */
export function getTempoFromBpm(bpm) {
    const midTempo = (Tempo.MEDIUM + Tempo.SLOW) / 2 // 45
    const fastTempo = (Tempo.MEDIUM + Tempo.FAST) / 2 // 75
    if (bpm < midTempo) return Tempo.SLOW
    if (bpm > fastTempo) return Tempo.FAST
    return Tempo.MEDIUM
}

/**
 * Depth range factor for dive scoring: 1 + (maxDepth - minDepth) * 0.25
 */
export function getDepthRangeFactor(minDepth, maxDepth) {
    return 1 + (maxDepth - minDepth) * 0.25
}

/**
 * @typedef {{ minDepth: number, maxDepth: number }} DepthRange
 * @param {{ startDepth: number, endDepth: number }} dive
 * @returns {DepthRange}
 */
export function getDepthRangeFromDive(dive) {
    const s = dive.startDepth
    const e = dive.endDepth
    if (!Number.isFinite(s) || !Number.isFinite(e)) return { minDepth: 0, maxDepth: 0 }
    return { minDepth: Math.min(s, e), maxDepth: Math.max(s, e) }
}

/**
 * @param {DepthRange} a
 * @param {DepthRange} b
 */
export function depthRangesEqual(a, b) {
    return a.minDepth === b.minDepth && a.maxDepth === b.maxDepth
}

/**
 * Rhythm match: same SLOW / MEDIUM / FAST bucket as getTempoFromBpm
 */
export function temposBucketMatch(bpmA, bpmB) {
    if (!Number.isFinite(bpmA) || !Number.isFinite(bpmB)) return false
    return getTempoFromBpm(bpmA) === getTempoFromBpm(bpmB)
}

/**
 * @param {{ startDepth: number, endDepth: number }} currentDive
 * @param {Array<{ startDepth: number, endDepth: number }>} priorDives oldest-first, max DIVE_HISTORY_MAX
 */
export function countPriorDepthMatches(currentDive, priorDives) {
    if (!priorDives?.length) return 0
    const cur = getDepthRangeFromDive(currentDive)
    let n = 0
    for (let i = 0; i < priorDives.length; i++) {
        const p = priorDives[i]
        if (depthRangesEqual(cur, getDepthRangeFromDive(p))) n += 1
    }
    return n
}

/**
 * @param {number} currentBpm
 * @param {Array<{ tempo: number }>} priorDives oldest-first
 */
export function countPriorRhythmMatches(currentBpm, priorDives) {
    if (!priorDives?.length || !Number.isFinite(currentBpm)) return 0
    let n = 0
    for (let i = 0; i < priorDives.length; i++) {
        const t = priorDives[i]?.tempo
        if (typeof t === 'number' && Number.isFinite(t) && temposBucketMatch(currentBpm, t)) n += 1
    }
    return n
}

/**
 * @param {number} rawScore
 * @param {number} depthMatchCount
 * @param {number} rhythmMatchCount
 * @returns {{ depthBonus: number, rhythmBonus: number }}
 */
export function perDiveConsistencyBonuses(rawScore, depthMatchCount, rhythmMatchCount) {
    const raw = typeof rawScore === 'number' && Number.isFinite(rawScore) ? rawScore : 0
    const dd = Number.isFinite(depthMatchCount) ? Math.max(0, depthMatchCount) : 0
    const rr = Number.isFinite(rhythmMatchCount) ? Math.max(0, rhythmMatchCount) : 0
    const f = PRIOR_MATCH_BONUS_FRACTION
    return {
        depthBonus: raw * f * dd,
        rhythmBonus: raw * f * rr,
    }
}

/**
 * Restore dive history from persisted rows (supports full movement objects from older saves).
 * @param {unknown} raw
 * @returns {Array<{ startDepth: number, endDepth: number, tempo: number }>}
 */
export function normalizeDiveHistoryForRestore(raw) {
    if (!Array.isArray(raw)) return []
    const out = []
    for (let i = 0; i < raw.length; i++) {
        const d = raw[i]
        if (!d || typeof d !== 'object') continue
        const s = d.startDepth
        const e = d.endDepth
        const tempo = d.tempo
        if (Number.isFinite(s) && Number.isFinite(e)) {
            out.push({
                startDepth: s,
                endDepth: e,
                tempo: typeof tempo === 'number' && Number.isFinite(tempo) ? tempo : 0,
            })
        }
    }
    return out.slice(-DIVE_HISTORY_MAX)
}
