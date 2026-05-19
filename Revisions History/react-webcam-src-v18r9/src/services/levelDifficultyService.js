/**
 * Level Difficulty Service - Calculates difficulty ratings for levels
 * Default levels use a lookup table; custom levels use a calibration table
 * derived from default levels for exact match when tasks are identical.
 */

import {
    calcPerfectHoldScore,
    calcPerfectDivingScore,
    calcPerfectHitScore,
    calcPerfectClapScore,
    calcPerfectHoldAndClapScore,
    calcPerfectEndlessScore
} from '../components/Training/scores'
import { levelManager } from './levelManager'
import { Tempo } from '../components/Tasks/task'

// Supported task types for scoring (match TaskType values)
const TASK_TYPES = {
    HOLD: 'hold',
    UPDOWN: 'updown',
    HITDEPTH: 'hitdepth',
    CLAP: 'clap',
    HOLDANDCLAP: 'holdandclap',
    ENDLESS: 'endless'
}

// Default level difficulty lookup (from LEVEL_DIFFICULTY_FORMULA.md)
const DEFAULT_LEVEL_DIFFICULTIES = {
    begint: 1.0,
    quickbg: 2.5,
    basicr: 2,
    dive101: 3,
    intmed: 4.5,
    endurance: 7,
    deepfocus: 7.5,
    speed: 6.5,
    devotion: 7.5,
    maxdepth: 8.5,
    elite: 10,
    manyload: 11
}

/**
 * Compute calibration inputs from tasks
 * @param {Array} tasks - Level tasks
 * @returns {{ perfectScore: number, depth4Count: number, fastTempoSeconds: number }}
 */
function computeCalibrationInputs(tasks) {
    let perfectScore = 0
    let depth4Count = 0
    let fastTempoSeconds = 0

    for (const task of tasks) {
        switch (task.type) {
            case TASK_TYPES.HOLD:
                perfectScore += calcPerfectHoldScore(task)
                if (task.targetDepth === 4) depth4Count++
                break
            case TASK_TYPES.UPDOWN:
                perfectScore += calcPerfectDivingScore(task)
                if (task.maxDepth === 4) depth4Count++
                if (task.tempo === Tempo.FAST || task.tempo === 90) {
                    fastTempoSeconds += task.timeLimit || 0
                }
                break
            case TASK_TYPES.HITDEPTH:
                perfectScore += calcPerfectHitScore(task)
                if (task.targetDepth === 4) depth4Count++
                break
            case TASK_TYPES.CLAP:
                perfectScore += calcPerfectClapScore(task)
                break
            case TASK_TYPES.HOLDANDCLAP:
                perfectScore += calcPerfectHoldAndClapScore(task)
                if (task.targetDepth === 4) depth4Count++
                break
            case TASK_TYPES.ENDLESS:
                perfectScore += calcPerfectEndlessScore(task)
                break
            default:
                break
        }
    }

    return { perfectScore, depth4Count, fastTempoSeconds }
}

/**
 * Build calibration table from default levels 2-11 (excluding begint and manyload)
 */
function buildCalibrationTable() {
    const defaultLevels = levelManager.getDefaultLevels()
    const calibrationLevels = ['quickbg', 'basicr', 'dive101', 'intmed', 'endurance', 'deepfocus', 'speed', 'devotion', 'maxdepth', 'elite']

    const table = []
    for (const levelId of calibrationLevels) {
        const level = defaultLevels.find(l => l.id === levelId)
        if (!level || !level.tasks) continue

        const { perfectScore, depth4Count, fastTempoSeconds } = computeCalibrationInputs(level.tasks)
        const rating = DEFAULT_LEVEL_DIFFICULTIES[levelId]

        table.push({
            perfectScore,
            depth4Count,
            fastTempoSeconds,
            rating
        })
    }
    return table
}

// Build calibration table once at module load
const CALIBRATION_TABLE = buildCalibrationTable()

/**
 * Find rating from calibration table - exact match or interpolate
 */
function getRatingFromCalibration(perfectScore, depth4Count, fastTempoSeconds) {
    // Exact match
    const exact = CALIBRATION_TABLE.find(
        row =>
            row.perfectScore === perfectScore &&
            row.depth4Count === depth4Count &&
            row.fastTempoSeconds === fastTempoSeconds
    )
    if (exact) return exact.rating

    // No exact match: use linear interpolation based on perfectScore
    // Reference range: min 274, max 1744 (from levels 2-11)
    const minScore = 274
    const maxScore = 1744
    const range = maxScore - minScore

    let baseRating = 1 + ((perfectScore - minScore) / range) * 9

    // Adjust for depth4 and fast tempo (weighted factors)
    const depthAdjust = depth4Count * 0.15
    const tempoAdjust = Math.min(fastTempoSeconds / 200, 1.5) // cap tempo contribution
    baseRating += depthAdjust + tempoAdjust

    return baseRating
}

/**
 * Clamp and round rating
 */
function clampAndRound(rating) {
    let clamped = rating
    if (clamped < 1.0) clamped = 1.0
    else if (clamped > 10.0 && clamped < 19.0) clamped = 10.0
    else if (clamped >= 19.0) clamped = 11

    if (clamped === 11) return 11
    return Math.round(clamped * 2) / 2
}

/**
 * Get difficulty rating for a level
 * @param {Object} level - Level object with { id, tasks }
 * @returns {number} Difficulty rating (1.0 to 11)
 */
export function getDifficulty(level) {
    if (!level) return 1.0

    // Default levels use lookup
    if (levelManager.isDefaultLevel(level.id)) {
        const lookup = DEFAULT_LEVEL_DIFFICULTIES[level.id]
        if (lookup !== undefined) return lookup
    }

    // Guard for empty/invalid tasks
    const tasks = level?.tasks
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
        return 1.0
    }

    const { perfectScore, depth4Count, fastTempoSeconds } = computeCalibrationInputs(tasks)
    const rawRating = getRatingFromCalibration(perfectScore, depth4Count, fastTempoSeconds)
    return clampAndRound(rawRating)
}

export const levelDifficultyService = {
    getDifficulty
}
