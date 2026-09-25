import { useState, useEffect, useCallback, useRef } from 'react';
import { TaskType, Tempo, getTempoString, getTempoState } from '../Tasks/task';
// atoms
import { useSetAtom } from 'jotai';
import { sfxAtom, feedbackAtom } from '../../atoms/audioAtom';
import { ScoreList } from './Score';
import { Grade } from '../../atoms/taskAtom';
import { generateSummaryUPANDDOWN } from '../Tasks/taskSummary'
import { useTimeLimit } from '../../hooks/useTimeLimit'
import { useTaskCountdownLeft } from '../../hooks/useTaskCountdownLeft'
import { calculateTempo, getAverageMotionBpm, isPlausibleBpm } from './diveTempo'
// dive state
import useTiming from '../../hooks/useTiming';
import { useButtplug } from '../../hooks/useButtplug';

// scoring constants
export const BONUS_DEEP = 4
export const SURFACE_PENALTY = -4

// Points per dive based on tempo and quality
export const DiveScore = {
    SLOW: {
        PERFECT: 4,
        PASS: 2
    },
    MEDIUM: {
        PERFECT: 3,
        PASS: 1
    },
    FAST: {
        PERFECT: 2,
        PASS: 1
    },
    BAD: 0
}

const DIVE_ERROR = {
    TOO_FAST: 'too_fast',
    TOO_SLOW: 'too_slow',
    WAY_TOO_FAST: 'way_too_fast',
    WAY_TOO_SLOW: 'way_too_slow',
    SHALLOW_ASCENT: 'shallow_ascent',
    DEEP_ASCENT: 'deep_ascent',
    SHALLOW_DESCENT: 'shallow_descent',
    DEEP_DESCENT: 'deep_descent'
}

// Get score based on tempo and quality
export function getDiveScore(tempo, quality) {
    let scores

    if (tempo === Tempo.SLOW) {
        scores = DiveScore.SLOW
    } else if (tempo === Tempo.FAST) {
        scores = DiveScore.FAST
    } else {
        scores = DiveScore.MEDIUM
    }

    if (quality === Grade.PERFECT) {
        return scores.PERFECT
    } else if (quality === Grade.PASS) {
        return scores.PASS
    } else {
        return scores.BAD
    }
}

// Feedback cooldown times in milliseconds based on tempo
const FEEDBACK_COOLDOWN = {
    [Tempo.SLOW]: 6000,   // 2 seconds for slow tempo
    [Tempo.MEDIUM]: 5000, // 3.5 seconds for medium tempo
    [Tempo.FAST]: 4000    // 5 seconds for fast tempo
}

// dive state contains...
// current state is depth from 0 to 4
// previous state is where we came from, so we know if we're going up or down
// current state duration is how long we have been at current depth 
// and we also keep a track of previous times at depths so we can calculate rate of ascent/descent
function Diving({ task, onTaskOver, onSignalCaptureWindow, isLastTask }) {
    const seededBpm = isPlausibleBpm(task.startingBpm) ? task.startingBpm : null
    // gameplay states we'll be dealing with 
    // we record when we notice a change in direction, indicats an up/down motion
    // Seed downTempo only so the UI shows inherited BPM without enabling first-dive ascent checks.
    const [motion, setMotion] = useState({
        up: 0,
        down: 0,
        upTempo: 0,
        downTempo: seededBpm ?? 0,
        dir: 'rest',
    });

    // Track if diving has started
    const [hasStarted, setHasStarted] = useState(false)

    // atoms
    const setSfx = useSetAtom(sfxAtom)
    const setFeedback = useSetAtom(feedbackAtom)
    // hooks
    const diveState = useTiming()
    const { adjustVibration, stopVibration } = useButtplug()

    const timeLeft = useTaskCountdownLeft(task)
    const timeLeftRef = useRef(timeLeft)
    timeLeftRef.current = timeLeft
    const diveStateRef = useRef(diveState)
    diveStateRef.current = diveState
    const motionRef = useRef(motion)
    motionRef.current = motion
    const tempoStreakRef = useRef(0)
    const hasPenalizedForSurfaceRef = useRef(false)
    const pendingStartingBpmRef = useRef(seededBpm)
    const skipLeftoverScoreRef = useRef(seededBpm != null)
    const suppressNextUpTempoRef = useRef(false)

    useEffect(() => {
        if (!onSignalCaptureWindow) return undefined
        const id = setInterval(() => {
            const depth = diveStateRef.current?.current ?? 0
            const m = motionRef.current
            const active = depth !== 0 && m?.dir !== 'rest'
            if (active) tempoStreakRef.current += 1
            else tempoStreakRef.current = 0
            const tempoOk = tempoStreakRef.current >= 3
            const vidMin = isLastTask ? 6 : 3
            const w = tempoOk && active
            const windowOk = w && timeLeftRef.current >= vidMin
            onSignalCaptureWindow(windowOk, { photos: windowOk, videos: windowOk })
        }, 1000)
        return () => clearInterval(id)
    }, [onSignalCaptureWindow, isLastTask])

    // desired dive
    const targetDepthDown = task.maxDepth
    const targetDepthUp = task.minDepth
    const targetTempo = task.tempo || Tempo.MEDIUM // use task tempo or default to MED

    // Feedback cooldown tracking
    const [lastFeedbackTime, setLastFeedbackTime] = useState(0)
    const [lastFeedbackType, setLastFeedbackType] = useState(null)

    // overall successful dives
    const [perfectCount, setPerfectCount] = useState(0)
    const [passCount, setPassCount] = useState(0)
    const [failedCount, setFailedCount] = useState(0)
    const [, setScore] = useState(0)

    // track dive results
    const [diveScores, setDiveScores] = useState([])
    const diveScoresRef = useRef([])
    const lastProcessedMotionRef = useRef(null)

    // Update the ref whenever diveScores changes
    useEffect(() => {
        diveScoresRef.current = diveScores
    }, [diveScores])

    // Handle time elapsed
    const handleTimeElapsed = useCallback(() => {
        // Get the latest scores from ref instead of relying on closure
        const summary = generateSummaryUPANDDOWN(task, diveScoresRef.current)
        onTaskOver(summary, true, { lastBpm: getAverageMotionBpm(motionRef.current) })
    }, [task, onTaskOver])

    // Use the time limit hook
    useTimeLimit(task.timeLimit, handleTimeElapsed)

    // Helper function to check if feedback cooldown has passed
    const canProvideFeedback = useCallback(() => {
        const now = Date.now()
        const cooldownTime = FEEDBACK_COOLDOWN[targetTempo] || FEEDBACK_COOLDOWN[Tempo.MEDIUM]
        return now - lastFeedbackTime > cooldownTime
    }, [lastFeedbackTime, targetTempo])

    // Helper function to provide feedback with cooldown
    const provideFeedback = useCallback((feedbackType) => {

        // Don't repeat the same feedback consecutively
        if (feedbackType === lastFeedbackType) {
            return false
        }

        if (canProvideFeedback()) {
            setFeedback(feedbackType)
            setLastFeedbackTime(Date.now())
            setLastFeedbackType(feedbackType)
            return true
        }
        return false
    }, [canProvideFeedback, setFeedback, lastFeedbackType])

    // TASK setup our goal for given task
    useEffect(() => {
        // reset internal state
        if (task?.type === TaskType.UPANDDOWN) {
            setFeedback(null)
            setSfx(null)
            setHasStarted(false)
            setLastFeedbackTime(0) // Reset feedback cooldown
            setLastFeedbackType(null) // Reset last feedback type
            lastProcessedMotionRef.current = null
            hasPenalizedForSurfaceRef.current = false
        }
    }, [task, targetTempo, setFeedback, setSfx])

    // Check if diving has started
    useEffect(() => {
        if (!hasStarted && diveState.current > 0) {
            setHasStarted(true)
        }
    }, [hasStarted, diveState])

    // SFX feedback
    useEffect(() => {

        let isUp = false
        // are we going up or down
        if (diveState.current > diveState.previous) {
            isUp = false
        } else {
            isUp = true
        }

        if (!isUp && diveState.current === targetDepthDown) {
            setSfx("Sfx.TICK")
        }
        if (isUp && diveState.current === targetDepthUp) {
            setSfx("Sfx.TOCK")
        }
        // if (motion.dir === 'rest') {
        //     setSfx(0)
        // }
    }, [targetDepthDown, targetDepthUp, setSfx, setFeedback, diveState]);

    // DIVE UPDOWN - Record when we change from descending and ascending. 
    // calculate tempo and descent/ascent values for this motion
    useEffect(() => {
        // we where resting, do nothing until we start descending
        if (diveState.current > 0 && motion.dir === 'rest') {
            // Keep inherited downTempo so the leftover stroke is not scored as 0 / a spike.
            // Leave upTempo at 0 so the first scored dive still skips the ascent check.
            const downTempo = pendingStartingBpmRef.current ?? 0
            setMotion({ up: 1, down: 0, upTempo: 0, downTempo, dir: 'down' })
        }
        // we're ascending now - calculate what was the down tempo
        else if (diveState.current < diveState.previous && motion.dir === 'down') {
            let downDepth = diveState.previous
            let tempo = resolveStrokeTempo(
                calculateTempo(motion.up + 1, downDepth, diveState.previousDurations),
                pendingStartingBpmRef
            )

            setMotion({ ...motion, down: downDepth, downTempo: tempo, dir: 'up' })
        }
        // we're descending now - calculate what was the up tempo
        else if (diveState.current > diveState.previous && motion.dir === 'up') {
            let upDepth = diveState.previous
            let tempo = resolveStrokeTempo(
                calculateTempo(upDepth, motion.down - 1, diveState.previousDurations),
                pendingStartingBpmRef
            )
            if (suppressNextUpTempoRef.current) {
                suppressNextUpTempoRef.current = false
                tempo = 0
            }
            setMotion({ ...motion, up: diveState.previous, upTempo: tempo, dir: 'down' })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- motion used in setMotion, diveState ref
    }, [diveState]);

    // RATE & ERRORS - when we 'ascend' so finish a single dive, check against
    useEffect(() => {
        // Reset deduplication guard when starting a new dive (prevents skipping legitimate identical dives)
        if (motion.dir === 'down') {
            lastProcessedMotionRef.current = null
            return
        }
        // we check at each down to up change
        if (motion.dir === 'up') {
            const motionKey = `${motion.up}-${motion.down}-${motion.upTempo}-${motion.downTempo}`
            if (lastProcessedMotionRef.current === motionKey) return
            lastProcessedMotionRef.current = motionKey

            if (skipLeftoverScoreRef.current) {
                skipLeftoverScoreRef.current = false
                suppressNextUpTempoRef.current = true
                return
            }

            // what's the tempo average
            let avgTempo = motion.upTempo + motion.downTempo
            if (motion.upTempo !== 0) {
                avgTempo /= 2
            }
            const closestTempo = getTempoState(avgTempo)
            const requiredTempo = getTempoState(targetTempo)

            // Collect errors from checks
            let issues = []

            // Always check tempo and descent
            const tempoIssue = checkTempo(closestTempo, requiredTempo)

            const descentIssue = checkDescent(motion.down, targetDepthDown)
            let ascentIssue = undefined
            if (tempoIssue) issues.push(tempoIssue)
            if (descentIssue) issues.push(descentIssue)

            // Only check ascent if not first dive
            if (motion.upTempo !== 0) {
                ascentIssue = checkAscent(motion.up, targetDepthUp)
                if (ascentIssue) issues.push(ascentIssue)
            }

            // Determine quality and score
            let score = null
            let grade = null
            // no issues, perfect dive
            if (issues.length === 0) {
                // was it a deep dive?
                const isDeep = targetDepthDown === 4
                const bonus = isDeep ? BONUS_DEEP : 0
                score = getDiveScore(targetTempo, Grade.PERFECT) + bonus
                grade = isDeep ? Grade.PERFECT_DEEP : Grade.PERFECT

                // Provide positive feedback for perfect dives
                // Use a lower probability to avoid too much positive feedback
                if (Math.random() < 0.7) {
                    provideFeedback("Feedback.PERFECT")
                }
            } else if (issues.length === 1
                && tempoIssue !== DIVE_ERROR.WAY_TOO_FAST
                && tempoIssue !== DIVE_ERROR.WAY_TOO_SLOW) {
                score = getDiveScore(targetTempo, Grade.PASS)
                grade = Grade.PASS
            } else {
                score = DiveScore.BAD
                grade = Grade.FAIL
            }

            const diveResult = {
                grade,
                score,
                issues
            }

            // Update counts based on quality
            if (grade === Grade.PERFECT || grade === Grade.PERFECT_DEEP) {
                setPerfectCount(count => count + 1)
                // Add 0.1 to vibration for perfect scores
                adjustVibration(0.1)
            } else if (grade === Grade.PASS) {
                setPassCount(count => count + 1)
                // Add 0.05 to vibration for pass scores
                adjustVibration(0.05)
            } else {
                setFailedCount(count => count + 1)
                // Deduct 0.1 from vibration for failures
                adjustVibration(-0.2)
            }

            // Update total score
            setScore(prevScore => prevScore + score)

            // Update dive scores
            setDiveScores(prev => [...prev, diveResult])

            // Provide tempo feedback if needed
            // tempo issues
            if (tempoIssue === DIVE_ERROR.TOO_FAST) {
                provideFeedback("Feedback.TOO_FAST")
            } else if (tempoIssue === DIVE_ERROR.TOO_SLOW) {
                provideFeedback("Feedback.TOO_SLOW")
            } else if (tempoIssue === DIVE_ERROR.WAY_TOO_FAST) {
                provideFeedback("Feedback.WAY_TOO_FAST")
            } else if (tempoIssue === DIVE_ERROR.WAY_TOO_SLOW) {
                provideFeedback("Feedback.WAY_TOO_SLOW")
            }
            // descent issues
            else if (descentIssue === DIVE_ERROR.SHALLOW_DESCENT) {
                provideFeedback("Feedback.SHALLOW_DESCENT")
            } else if (descentIssue === DIVE_ERROR.DEEP_DESCENT) {
                provideFeedback("Feedback.DEEP_DESCENT")
            }
            // ascent issues
            else if (ascentIssue === DIVE_ERROR.SHALLOW_ASCENT) {
                provideFeedback("Feedback.SHALLOW_ASCENT")
            } else if (ascentIssue === DIVE_ERROR.DEEP_ASCENT) {
                provideFeedback("Feedback.DEEP_ASCENT")
            }
            // need to handle - 
            // shallow_ascent, deep_ascent -  not going up enough, going too far up. 
            // deep_descent, shallow_descent - going too deep, not going deep enough
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps -- motion used for setMotion callback
    }, [motion, targetDepthUp, targetDepthDown, targetTempo, provideFeedback, adjustVibration])

    // Deduct points once per surface visit after starting
    useEffect(() => {
        if (diveState.current > 0) {
            hasPenalizedForSurfaceRef.current = false
            return
        }

        if (diveState.current !== 0 || !hasStarted || hasPenalizedForSurfaceRef.current) {
            return
        }

        hasPenalizedForSurfaceRef.current = true
        setFailedCount(count => count + 1)
        setDiveScores(prev => [...prev, {
            grade: Grade.PENALTY,
            score: SURFACE_PENALTY,
            bonus: 0,
            issues: ['surfaced']
        }])
        setFeedback(targetDepthDown > 2
            ? "Feedback.SURFACE_PENALTY_HARD"
            : "Feedback.SURFACE_PENALTY_SOFT")
        setScore(prevScore => prevScore + SURFACE_PENALTY)
        stopVibration()
    }, [diveState, hasStarted, targetDepthDown, stopVibration, setFeedback, setDiveScores, setScore])

    // Check functions for different aspects of the dive
    const checkTempo = (closestTempo, requiredTempo) => {
        // If tempos match, no error
        if (closestTempo === requiredTempo) return null

        // Check for extreme tempo mismatches first
        if (closestTempo === "SLOW" && requiredTempo === "FAST") {
            return DIVE_ERROR.WAY_TOO_SLOW
        }
        if (closestTempo === "FAST" && requiredTempo === "SLOW") {
            return DIVE_ERROR.WAY_TOO_FAST
        }

        // Check for regular tempo mismatches
        const isTooFast = (
            (closestTempo === "FAST" && requiredTempo === "MEDIUM") ||
            (closestTempo === "MEDIUM" && requiredTempo === "SLOW")
        )

        return isTooFast ? DIVE_ERROR.TOO_FAST : DIVE_ERROR.TOO_SLOW
    }

    const checkDescent = (actualDepth, targetDepth) => {
        if (actualDepth === targetDepth) return null
        return actualDepth < targetDepth ? DIVE_ERROR.SHALLOW_DESCENT : DIVE_ERROR.DEEP_DESCENT
    }

    const checkAscent = (actualDepth, targetDepth) => {
        if (actualDepth === targetDepth) return null
        return actualDepth < targetDepth ? DIVE_ERROR.SHALLOW_ASCENT : DIVE_ERROR.DEEP_ASCENT
    }

    const myTempo = getAverageMotionBpm(motion) ?? 0
    const closestTempo = getTempoState(myTempo)

    const tempoString = closestTempo.toLowerCase(); // getTempoString(closestTempo)

    return (
        <div>
            <div className="column-centered">
                <h4 className='margin-y-sm'>Your tempo (bpm). {myTempo.toFixed(0)} {tempoString} - {targetTempo} {getTempoString(targetTempo)}</h4>

                <h5 className='margin-y-sm'>
                    Total: <span className="not-a-button padding-x margin-y">{perfectCount + passCount + failedCount}</span>  -
                    <span className="margin-x">Perfect: <span className="not-a-button padding-x">{perfectCount}</span></span>
                    <span className="margin-x">Pass: <span className="not-a-button padding-x">{passCount}</span></span>
                    <span className="margin-x">Fail: <span className="not-a-button padding-x">{failedCount}</span></span>
                </h5>

                {/* <pre>Depths - Down: {motion.down} Up: {String(motion.up)} Dir.{motion.dir}</pre> */}
                {/* <pre>Ascent Tempo: {(motion.upTempo).toFixed(0)} Down Tempo: {(motion.downTempo).toFixed(0)}</pre> */}

            </div>
            <div className="row-centered">
                <ScoreList scores={diveScores.slice(-8)} />
            </div>
        </div>
    );
}

/** Use inherited BPM for the leftover half-stroke after a skip handoff; then measured values. */
function resolveStrokeTempo(measured, pendingSeedRef) {
    if (pendingSeedRef.current != null) {
        const seeded = pendingSeedRef.current
        pendingSeedRef.current = null
        return seeded
    }
    return Number.isFinite(measured) && measured > 0 ? measured : 0
}

export default Diving;