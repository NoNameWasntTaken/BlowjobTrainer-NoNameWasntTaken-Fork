/**
 * Endless task scoring constants and helpers
 */

import { Tempo } from '../Tasks/task'

// Reuse from HoldDepth
export const HOLD_POINTS_PER_DEPTH = [0, 0.5, 1, 1.5, 4]
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

// Balls bonus (Endless)
export const BALLS_BONUS_INITIAL_POINTS = 3
export const BALLS_BONUS_INTERVAL_SEC = 3
export const BALLS_BONUS_PER_INTERVAL = 3

// Consistency bonuses
export const RHYTHM_BONUS_MAX = 0.75
export const DEPTH_BONUS_MAX = 0.75
export const DIVE_WINDOW_SIZE = 5

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
 * Compute rhythm consistency bonus multiplier from dive window.
 * CV = stdDev(tempos) / mean(tempos). Returns (1 - min(CV, 1)) - higher when more consistent.
 * Guard against division by zero.
 */
export function computeRhythmBonusMultiplier(diveWindow) {
    if (!diveWindow || diveWindow.length < 3) return 0
    const tempos = diveWindow.map((d) => d.tempo).filter((t) => typeof t === 'number' && Number.isFinite(t))
    if (tempos.length < 3) return 0
    const mean = tempos.reduce((a, b) => a + b, 0) / tempos.length
    if (!Number.isFinite(mean) || mean === 0) return 0
    const variance = tempos.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / tempos.length
    const stdDev = Math.sqrt(variance)
    if (!Number.isFinite(stdDev)) return 0
    const cv = stdDev / mean
    if (!Number.isFinite(cv)) return 0
    const mult = 1 - Math.min(cv, 1)
    return Number.isFinite(mult) ? mult : 0
}

/**
 * Compute depth range consistency bonus. Strict: all dives have identical (minDepth, maxDepth).
 */
export function computeDepthBonus(diveWindow) {
    if (!diveWindow || diveWindow.length < DIVE_WINDOW_SIZE) return 0
    const first = diveWindow[0]
    const minDepth = Math.min(first.startDepth, first.endDepth)
    const maxDepth = Math.max(first.startDepth, first.endDepth)
    if (!Number.isFinite(minDepth) || !Number.isFinite(maxDepth)) return 0
    const allMatch = diveWindow.every((d) => {
        const dMin = Math.min(d.startDepth, d.endDepth)
        const dMax = Math.max(d.startDepth, d.endDepth)
        return (
            Number.isFinite(dMin) &&
            Number.isFinite(dMax) &&
            dMin === minDepth &&
            dMax === maxDepth
        )
    })
    return allMatch ? DEPTH_BONUS_MAX : 0
}
