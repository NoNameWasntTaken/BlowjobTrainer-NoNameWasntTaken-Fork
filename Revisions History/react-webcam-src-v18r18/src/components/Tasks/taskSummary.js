import { Grade } from '../../atoms/taskAtom'
import { POINTS_PER_CLAP } from '../Playing/ClapDetector'
import { POINTS_PER_SPEAK_UNIT } from '../Training/scores'
import { SURFACE_PENALTY } from '../Playing/endlessScoring'
import { TaskType } from './task'

export function generateSummaryUPANDDOWN(task, scores) {
    // Initialize counts
    const counts = {
        perfect: 0,
        pass: 0,
        fail: 0,
        penalties: 0
    }

    // Track perfect streak
    let currentStreak = 0
    let bestStreak = 0

    // Process each score
    scores.forEach(score => {
        // Update counts
        if (score.grade === Grade.PERFECT || score.grade === Grade.PERFECT_DEEP) {
            counts.perfect++
            currentStreak++
            bestStreak = Math.max(bestStreak, currentStreak)
        } else if (score.grade === Grade.PASS) {
            counts.pass++
            currentStreak = 0
        } else if (score.grade === Grade.FAIL) {
            counts.fail++
            currentStreak = 0
        } else if (score.grade === Grade.PENALTY) {
            counts.penalties++
            currentStreak = 0
        }
    })

    // Calculate total score
    const totalScore = scores.reduce((sum, score) => sum + score.score, 0)

    return {
        type: task.type,
        counts,
        maxDepth: task.maxDepth,
        tempo: task.tempo,
        perfectStreak: {
            depth: task.maxDepth,
            streak: bestStreak
        },
        score: totalScore
    }
}

export function generateSummaryREST(task, ballsBonusScore = 0) {
    return {
        type: task.type,
        score: ballsBonusScore,
        counts: { penalties: 0 },
        ballsBonusScore
    }
}

export function generateSummaryHITDEPTH(task, scores) {
    // Initialize counts
    const counts = {
        perfect: 0,
        pass: 0,
        fail: 0,
        penalties: 0
    }

    // Process each score
    scores.forEach(score => {
        if (score.grade === Grade.PERFECT_DEEP) {
            counts.perfect++
        } else if (score.grade === Grade.PASS) {
            counts.pass++
        } else if (score.grade === Grade.FAIL) {
            counts.fail++
        } else if (score.grade === Grade.PENALTY) {
            counts.penalties++
        }
    })

    // Calculate total score
    const totalScore = scores.reduce((sum, score) => sum + score.score, 0)

    return {
        type: task.type,
        counts,
        score: totalScore,
        maxDepth: task.targetDepth,
        hits: counts.perfect + counts.pass
    }
}

export function generateSummaryHOLDDEPTH(task, scores) {
    // Initialize counts
    const counts = {
        perfect: 0,
        pass: 0,
        fail: 0,
        penalties: 0
    }

    let totalTimeHeld = 0

    // Process each score
    scores.forEach(score => {
        if (score.grade === Grade.PERFECT || score.grade === Grade.PERFECT_DEEP) {
            counts.perfect++
            totalTimeHeld += task.time
        } else if (score.grade === Grade.GOOD) {
            counts.pass++
            // For good holds, we held for task.time but with less accuracy
            totalTimeHeld += task.time
        } else if (score.grade === Grade.PASS) {
            counts.pass++
            // For pass, we held for task.time but with less accuracy
            totalTimeHeld += task.time
        } else if (score.grade === Grade.FAIL) {
            counts.fail++
        } else if (score.grade === Grade.PENALTY) {
            counts.penalties++
        }
    })

    // Calculate total score
    const totalScore = scores.reduce((sum, score) => sum + score.score, 0)

    return {
        type: task.type,
        time: task.time,
        counts,
        score: totalScore,
        targetDepth: task.targetDepth,
        totalTimeHeld,
        successfulHolds: counts.perfect + counts.pass
    }
}

export function generateSummaryHOLDANDCLAP(task, scores, totalTimeHeld, longestSingleHold, totalClaps) {
    const counts = {
        perfect: 0,
        pass: 0,
        fail: 0,
        penalties: 0
    }

    scores.forEach(score => {
        if (score.grade === Grade.PERFECT || score.grade === Grade.PERFECT_DEEP) {
            counts.perfect++
        } else if (score.grade === Grade.GOOD || score.grade === Grade.PASS) {
            counts.pass++
        } else if (score.grade === Grade.FAIL) {
            counts.fail++
        } else if (score.grade === Grade.PENALTY) {
            counts.penalties++
        }
    })

    const totalScore = scores.reduce((sum, score) => sum + score.score, 0)

    return {
        type: TaskType.HOLDANDCLAP,
        counts,
        score: totalScore,
        targetDepth: task.targetDepth,
        claps: totalClaps,
        repeat: task.repeat,
        totalTimeHeld,
        longestSingleHold,
        successfulHolds: counts.perfect + counts.pass
    }
}

export function generateSummaryENDLESS(task, holdScores, diveScores, {
    totalHoldScore, totalDiveScore, clapBonus, rhythmBonus, depthBonus, ballsBonus = 0,
    totalTimeHeld, totalDives, counts, holdTimeByDepth, divesByDepth
}) {
    const penaltyTotal = (counts.penalties || 0) * SURFACE_PENALTY
    const totalScore = totalHoldScore + totalDiveScore + clapBonus + rhythmBonus + depthBonus + (ballsBonus || 0) + penaltyTotal
    return {
        type: TaskType.ENDLESS,
        counts: {
            perfect: 0,
            pass: (counts.holds || 0) + (counts.dives || 0),
            fail: counts.fail || 0,
            penalties: counts.penalties || 0,
            holds: counts.holds || 0,
            dives: counts.dives || 0,
            clapsDuringHold: counts.clapsDuringHold || 0
        },
        score: totalScore,
        holdScore: totalHoldScore,
        diveScore: totalDiveScore,
        clapBonus,
        rhythmBonus,
        depthBonus,
        ballsBonus: ballsBonus || 0,
        totalTimeHeld,
        totalDives,
        holdTimeByDepth: holdTimeByDepth || { 1: 0, 2: 0, 3: 0, 4: 0 },
        divesByDepth: divesByDepth || { 1: 0, 2: 0, 3: 0, 4: 0 }
    }
}

/**
 * @param {object} task - speak task
 * @param {{ successfulSegments: number, timedOut: boolean }} opts
 */
export function generateSummarySPEAK(task, { successfulSegments, timedOut }) {
    const score = POINTS_PER_SPEAK_UNIT * successfulSegments
    return {
        type: TaskType.SPEAK,
        score,
        successfulSegments,
        repeat: task.repeat,
        speakMode: task.speakMode,
        timedOut,
        phrase: task.phrase,
        counts: {
            perfect: successfulSegments,
            pass: 0,
            fail: timedOut ? 1 : 0,
            penalties: 0,
        },
    }
}

export function generateSummaryCLAP(repeat, claps) {
    const totalScore = claps * POINTS_PER_CLAP
    const counts = {
        perfect: 0,
        pass: claps,
        fail: 0,
        penalties: 0
    }
    return {
        type: TaskType.CLAP,
        claps: claps,
        score: totalScore,
        repeat: repeat,
        counts: {
            ...counts
        }
    }
}
