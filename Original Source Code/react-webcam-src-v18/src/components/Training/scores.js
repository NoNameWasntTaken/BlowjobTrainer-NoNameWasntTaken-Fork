// Import scoring constants from components
import { POINTS_PER_DEPTH as HIT_POINTS } from '../Playing/HitDepth'
import { POINTS_PER_DEPTH as HOLD_POINTS_PER_DEPTH, PERFECT_MULTIPLIER as HOLD_PERFECT_MULTIPLIER } from '../Playing/HoldDepth'
import { BONUS_DEEP as DIVE_DEEP_BONUS, getDiveScore } from '../Playing/Diving'
import { POINTS_PER_CLAP } from '../Playing/ClapDetector'
import { Tempo } from '../Tasks/task'
import { Grade } from '../../atoms/taskAtom'

/**
 * Calculate perfect score for a hit task
 * @param {Object} task - The task configuration
 * @param {number} task.targetDepth - The target depth to hit
 * @param {number} task.repeat - Number of times to repeat the hit
 * @returns {number} The perfect score possible
 */
export function calcPerfectHitScore(task) {
    if (!task?.targetDepth || !task?.repeat) return 0

    const baseScore = HIT_POINTS[task.targetDepth]
    return baseScore * task.repeat
}

/**
 * Calculate pass score for a hit task (assuming 50% success rate)
 */
export function calcPassHitScore(task) {
    // For simplicity, assume pass score is 50% of perfect score
    return Math.floor(calcPerfectHitScore(task) * 0.5)
}

/**
 * Calculate perfect score for a hold task
 */
export function calcPerfectHoldScore(task) {
    if (!task?.targetDepth || !task?.time || !task?.repeat) return 0

    const pointsPerDepth = HOLD_POINTS_PER_DEPTH[task.targetDepth]
    const basePoints = pointsPerDepth * task.time
    const perfectBonus = Math.ceil(basePoints * HOLD_PERFECT_MULTIPLIER)

    return (basePoints + perfectBonus) * task.repeat
}

/**
 * Calculate pass score for a hold task (no perfect bonus)
 */
export function calcPassHoldScore(task) {
    if (!task?.targetDepth || !task?.time || !task?.repeat) return 0

    const pointsPerDepth = HOLD_POINTS_PER_DEPTH[task.targetDepth]
    const basePoints = pointsPerDepth * task.time
    // No perfect bonus for pass score

    return basePoints * task.repeat
}

/**
 * Calculate perfect score for a diving task
 */
export function calcPerfectDivingScore(task) {
    if (!task?.maxDepth || !task?.timeLimit) return 0

    // Get tempo in BPM, default to MEDIUM if not specified
    const tempo = task.tempo || Tempo.MEDIUM

    // Calculate time for one complete dive cycle (up and down)
    // At 60 BPM (MEDIUM), one cycle takes 2 seconds
    const secondsPerCycle = (60 / tempo) * 2

    // Calculate number of possible perfect dives in the time limit
    // Subtract 2 seconds from timeLimit to account for startup time
    const possibleDives = Math.floor((task.timeLimit - 2) / secondsPerCycle)

    // Get perfect score for this tempo using the getDiveScore helper
    const baseScore = getDiveScore(tempo, Grade.PERFECT)
    const bonus = task.maxDepth === 4 ? DIVE_DEEP_BONUS : 0

    return (baseScore + bonus) * possibleDives
}

/**
 * Calculate pass score for a diving task
 */
export function calcPassDivingScore(task) {
    if (!task?.maxDepth || !task?.timeLimit) return 0

    // Get tempo in BPM, default to MEDIUM if not specified
    const tempo = task.tempo || Tempo.MEDIUM

    // Calculate time for one complete dive cycle (up and down)
    // At 60 BPM (MEDIUM), one cycle takes 2 seconds
    const secondsPerCycle = (60 / tempo) * 2

    // Calculate number of possible dives in the time limit
    // Subtract 2 seconds from timeLimit to account for startup time
    const possibleDives = Math.floor((task.timeLimit - 2) / secondsPerCycle)

    // Get pass score for this tempo using the getDiveScore helper
    const baseScore = getDiveScore(tempo, Grade.PASS)
    // No bonus for pass scores

    return baseScore * possibleDives
}

/**
 * Calculate perfect score for a clap task
 */
export function calcPerfectClapScore(task) {
    if (!task?.repeat) return 0

    // Base points per clap
    return POINTS_PER_CLAP * task.repeat
}

/**
 * Calculate pass score for a clap task
 */
export function calcPassClapScore(task) {
    // Pass score is 50% of perfect score
    return Math.floor(calcPerfectClapScore(task) * 0.5)
}
