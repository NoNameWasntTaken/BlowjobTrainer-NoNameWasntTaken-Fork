import React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { TaskType } from '../Tasks/task';
import { useSetAtom, useAtom } from 'jotai';
import { feedbackAtom, sfxAtom } from '../../atoms/audioAtom';
import { vibrateSpeedAtom } from '../../atoms/buttplugAtom';
import CountdownBar from './CountdownBar';
import { ScoreList } from './Score';
import { Grade } from '../../atoms/taskAtom';
import { useTimeLimit } from '../../hooks/useTimeLimit';
import { generateSummaryHOLDDEPTH } from '../Tasks/taskSummary';
// dive state
import useTiming from '../../hooks/useTiming';
import { useButtplug } from '../../hooks/useButtplug';

// Hold state enum
const HoldState = {
    NOT_STARTED: 'NOT_STARTED',
    CORRECT_DEPTH: 'CORRECT_DEPTH',
    SHALLOW_ONE: 'SHALLOW_ONE',
    DEEP_ONE: 'DEEP_ONE',
    COMPLETED: 'COMPLETED',  // New state for completed holds
};

// scoring constants - x points per second
export const POINTS_PER_DEPTH = [0, 0.5, 1, 1.5, 4]
export const PERFECT_MULTIPLIER = 0.5
const GOOD_MULTIPLIER = 0.2
const SURFACE_PENALTY = -8

function HoldDepth({ task, onTaskOver }) {

    // atoms
    const setSfx = useSetAtom(sfxAtom)
    const setFeedback = useSetAtom(feedbackAtom)
    const { stopVibration } = useButtplug()
    const [vibrateSpeed, setVibrateSpeed] = useAtom(vibrateSpeedAtom)

    // Add ref to track if we've applied a surface penalty for this attempt
    const hasPenalized = useRef(false)
    // Add ref to track if we've played the halfway sound
    const hasPlayedHalfway = useRef(false)
    // Add ref to track if we've played the three-quarter sound
    const hasPlayedThreeQuarter = useRef(false)

    // Track if diving has started
    const [hasStarted, setHasStarted] = useState(false)

    // what we need to do
    const [, setInstruction] = useState('');
    // repeat X times
    const [remaining, setRemaining] = useState(99);
    const [holdState, setHoldState] = useState(HoldState.NOT_STARTED)
    const [holdScores, setHoldScores] = useState([])

    // Add ref for holdScores
    const holdScoresRef = useRef([])

    // Update ref whenever holdScores changes
    useEffect(() => {
        holdScoresRef.current = holdScores
    }, [holdScores])

    // Replace single time state with consolidated object
    const [timeTracking, setTimeTracking] = useState({
        rawTime: 0,
        effectiveTime: 0
    })
    // hook
    const diveState = useTiming()

    // Handle time elapsed
    const handleTimeElapsed = useCallback(() => {
        // Get the latest scores from ref instead of relying on closure
        const summary = generateSummaryHOLDDEPTH(task, holdScoresRef.current)
        summary.failed = true
        onTaskOver(summary, false)
    }, [task, onTaskOver])

    // Use the time limit hook
    useTimeLimit(task.timeLimit, handleTimeElapsed)

    // Reset all state values
    const resetHoldState = useCallback(() => {
        setTimeTracking({ rawTime: 0, effectiveTime: 0 })
        setHoldState(HoldState.NOT_STARTED)
        hasPenalized.current = false
        hasPlayedHalfway.current = false
        hasPlayedThreeQuarter.current = false
    }, [])

    // Calculate score for the hold - must be defined before holdSuccess
    const calculateScore = useCallback((rawTime, effectiveTime) => {
        if (!task?.targetDepth || !task?.time) return { grade: Grade.FAIL, score: 0, bonus: 0 }

        const pointsPerDepth = POINTS_PER_DEPTH[task.targetDepth]
        const basePoints = pointsPerDepth * task.time

        const timeDiff = Math.abs(task.time - rawTime)

        let bonusMultiplier = 0
        let grade = Grade.PASS

        const perfectThreshold = Math.max(1, task.time * 0.1)
        const goodThreshold = Math.max(2, task.time * 0.25)
        if (timeDiff <= perfectThreshold) {
            bonusMultiplier = PERFECT_MULTIPLIER
            grade = task.targetDepth === 4 ? Grade.PERFECT_DEEP : Grade.PERFECT
        }
        else if (timeDiff <= goodThreshold) {
            bonusMultiplier = GOOD_MULTIPLIER
            grade = Grade.GOOD
        }

        const bonus = Math.ceil(basePoints * bonusMultiplier)

        return {
            grade,
            score: Math.ceil(Math.max(0, basePoints + bonus)),
            bonus
        }
    }, [task?.targetDepth, task?.time])

    const holdStart = useCallback(() => {
        setSfx("Sfx.TICK")
        setInstruction('Hold Here')
    }, [setInstruction, setSfx])

    const holdSuccess = useCallback(() => {
        setSfx("Sfx.TOCK")
        setInstruction('Hold complete! Move slightly up and back to reset')
        const newRemaining = remaining - 1
        setRemaining(newRemaining)

        // Calculate current hold score
        const singleHoldScore = calculateScore(timeTracking.rawTime, timeTracking.effectiveTime)

        // Create new scores array with latest score
        const newHoldScores = [...holdScores, singleHoldScore]

        // Update scores state
        setHoldScores(newHoldScores)

        // Stop vibration on hold completion
        stopVibration()

        // finish the task if we are out of repeats
        if (newRemaining <= 0) {
            const summary = generateSummaryHOLDDEPTH(task, newHoldScores)
            onTaskOver(summary, true)
        }
    }, [remaining, setInstruction, timeTracking.rawTime, timeTracking.effectiveTime, task, holdScores, onTaskOver, stopVibration, calculateScore, setSfx])

    const holdFailed = useCallback(() => {
        setSfx("Sfx.QUIET")
        setInstruction('Hold failed!')
        resetHoldState()
        // regular failure, no penalty
        setHoldScores(prev => [...prev, { grade: Grade.FAIL, score: 0, bonus: 0 }])
        // Stop vibration on failure
        stopVibration()
    }, [resetHoldState, setSfx, stopVibration])

    const holdPenalty = useCallback((penaltyScore = SURFACE_PENALTY, feedback) => {
        setSfx("Sfx.QUIET")
        setInstruction('Penalty!')
        resetHoldState()
        setHoldScores(prev => [...prev, { grade: Grade.PENALTY, score: penaltyScore, bonus: 0 }])
        if (feedback) {
            setFeedback(feedback)
        }
        // Stop vibration on penalty
        stopVibration()
    }, [resetHoldState, setSfx, setFeedback, stopVibration])

    // TASK setup our goal for the hold task
    useEffect(() => {
        if (task?.type === TaskType.HOLDPOSITION) {
            setInstruction('move to position');
            setFeedback(0);
            setSfx(0);
            setRemaining(task.repeat ? task.repeat : 1);
            resetHoldState()
            lastDepthCheckTime.current = null
            lastFrameTimeRef.current = null
            setHasStarted(false)
        }
    }, [task, resetHoldState, setFeedback, setSfx]);

    // Check if diving has started
    useEffect(() => {
        if (!hasStarted && diveState.current > 0) {
            setHasStarted(true)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- diveState ref, not a valid dep
    }, [hasStarted])

    // Add refs for animation frame tracking
    const animationFrameRef = useRef(null)
    const lastFrameTimeRef = useRef(null)
    const lastDepthCheckTime = useRef(null)

    // Setup animation frame loop for time tracking
    useEffect(() => {
        const updateTime = () => {
            const now = performance.now()

            if (!lastFrameTimeRef.current) {
                lastFrameTimeRef.current = now
                animationFrameRef.current = requestAnimationFrame(updateTime)
                return
            }

            const deltaTime = (now - lastFrameTimeRef.current) / 1000 // Convert to seconds
            lastFrameTimeRef.current = now

            // Only update time if we're in a tracking state
            setTimeTracking(prev => {
                switch (holdState) {
                    case HoldState.CORRECT_DEPTH:
                        return {
                            rawTime: prev.rawTime + deltaTime,
                            effectiveTime: prev.effectiveTime + deltaTime
                        }
                    case HoldState.DEEP_ONE:
                        return {
                            rawTime: prev.rawTime + deltaTime,
                            effectiveTime: prev.effectiveTime + (deltaTime * 0.25)
                        }
                    case HoldState.SHALLOW_ONE:
                        return {
                            rawTime: prev.rawTime + deltaTime,
                            effectiveTime: Math.max(0, prev.effectiveTime - deltaTime)
                        }
                    default:
                        return prev // No changes for other states
                }
            })

            animationFrameRef.current = requestAnimationFrame(updateTime)
        }

        // Start the animation frame loop
        animationFrameRef.current = requestAnimationFrame(updateTime)

        // Cleanup
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
        }
    }, [holdState])

    // Hold state tracking
    useEffect(() => {
        const currentDepth = diveState.current
        const targetDepth = task?.targetDepth

        // Guard against invalid target depth
        if (targetDepth === undefined || targetDepth === null) return

        const depthDifference = currentDepth - targetDepth

        // Check for surfacing first - apply penalty if we hit depth 0, but only if target depth > 1 and we've started diving
        if (currentDepth === 0 && targetDepth > 1 && !hasPenalized.current && hasStarted) {
            holdPenalty(SURFACE_PENALTY, targetDepth > 2
                ? "Feedback.SURFACE_PENALTY_HARD"
                : "Feedback.SURFACE_PENALTY_SOFT")
            hasPenalized.current = true
            return
        }

        // First check for other failure cases (more than 1 level away from target)
        if (Math.abs(depthDifference) > 1 &&
            (holdState === HoldState.SHALLOW_ONE
                || holdState === HoldState.CORRECT_DEPTH
                || holdState === HoldState.DEEP_ONE)) {
            holdFailed()
            return
        }

        // if we are COMPLETED. wait for a reset
        if (holdState === HoldState.COMPLETED) {
            if (depthDifference < 0) {
                resetHoldState()
            }
            return
        }

        // Handle transitions to CORRECT_DEPTH
        if (depthDifference === 0 && holdState !== HoldState.CORRECT_DEPTH) {
            setHoldState(HoldState.CORRECT_DEPTH)
            holdStart()
            return
        }

        // Handle transitions away from CORRECT_DEPTH
        if (holdState === HoldState.CORRECT_DEPTH && depthDifference !== 0) {
            if (depthDifference === 1) {
                setHoldState(HoldState.DEEP_ONE)
                setInstruction(`slightly too deep! move up to ${targetDepth}`)
            } else if (depthDifference === -1) {
                setHoldState(HoldState.SHALLOW_ONE)
                setInstruction(`slightly too shallow! move down to ${targetDepth}`)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- diveState ref, not a valid dep
    }, [task, holdState, holdFailed, holdStart, resetHoldState, setSfx, hasStarted])

    // Check for hold completion and progress points
    useEffect(() => {
        if (!task?.time) return

        // Only check for completion and progress points in states where we're accumulating time
        if (holdState === HoldState.CORRECT_DEPTH || holdState === HoldState.DEEP_ONE) {
            // Check for halfway point if task time is 5 or more seconds
            if (task.time >= 6 && !hasPlayedHalfway.current && timeTracking.effectiveTime >= task.time / 2) {
                setFeedback(task.audioHalfway)
                hasPlayedHalfway.current = true
            }

            // Check for three-quarter point if task time is 12 or more seconds
            if (task.time >= 12 && !hasPlayedThreeQuarter.current && timeTracking.effectiveTime >= task.time * 0.75) {
                setFeedback(task.audioThreeQuarter)
                hasPlayedThreeQuarter.current = true
            }

            if (timeTracking.effectiveTime >= task.time) {
                setHoldState(HoldState.COMPLETED)
                holdSuccess()
            }
        }

        // allow for failure if we are shallow
        if (holdState === HoldState.SHALLOW_ONE) {
            if (timeTracking.effectiveTime <= 0) {
                holdFailed()
            }
        }
    }, [timeTracking.effectiveTime, task?.time, holdState, holdSuccess, holdFailed, setFeedback, task?.audioHalfway, task?.audioThreeQuarter])

    // Calculate progress percentage based on time at correct depth
    const currentProgress = task?.time
        ? Math.min(100, (timeTracking.effectiveTime / task.time) * 100)
        : 0

    const atCorrectDepth = holdState === HoldState.CORRECT_DEPTH
    const timeNeeded = task?.time ? Math.max(0, task.time - timeTracking.effectiveTime).toFixed(1) : 0

    // Add new effect for progressive vibration based on effective time
    useEffect(() => {
        console.log(holdState);
        console.log(vibrateSpeed);


        if ((holdState === HoldState.CORRECT_DEPTH ||
            holdState === HoldState.DEEP_ONE ||
            holdState === HoldState.SHALLOW_ONE) &&
            task?.time) {
            // Get base vibration based on depth
            let baseVibration = 0.05;
            if (task.targetDepth === 4) {
                baseVibration = 0.2;
            } else if (task.targetDepth >= 2) {
                baseVibration = 0.1;
            }

            // Calculate increments (1 per second, max 10)
            const increments = Math.min(10, Math.floor(timeTracking.effectiveTime));

            // Calculate desired vibration based on depth
            let maxVibration = 0.5; // Default for depths 1 and 2
            let incrementFactor = 0.05; // Default for depths 2 and 3
            if (task.targetDepth === 4) {
                maxVibration = 1.0;
                incrementFactor = 0.1;
            } else if (task.targetDepth === 3) {
                maxVibration = 0.75;
            }

            // Calculate target vibration
            const targetVibration = Math.min(maxVibration, baseVibration + (increments * incrementFactor));

            // Only update if current vibration is lower than target
            if (vibrateSpeed < targetVibration) {
                setVibrateSpeed(targetVibration);
            }
        } else {
            stopVibration()
        }
    }, [timeTracking.effectiveTime, holdState, task?.time, task?.targetDepth, vibrateSpeed, stopVibration, setVibrateSpeed])

    return (
        <React.Fragment>
            <div className="column-centered">
                <CountdownBar
                    currentProgress={currentProgress}
                    secondsRemaining={timeNeeded}
                    atCorrectDepth={atCorrectDepth}
                />
                <h4 className='margin-y-sm'>
                    Holds Remaining: <span className="not-a-button padding-x">{remaining}</span>
                </h4>
            </div>

            <div className="row-centered">
                <ScoreList scores={holdScores} />
            </div>
        </React.Fragment>
    )
}

export default HoldDepth;