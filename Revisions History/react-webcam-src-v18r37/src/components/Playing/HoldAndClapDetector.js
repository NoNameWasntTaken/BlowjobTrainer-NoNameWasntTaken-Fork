import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useSetAtom, useAtom } from 'jotai'
import { feedbackAtom, sfxAtom } from '../../atoms/audioAtom'
import { vibrateSpeedAtom } from '../../atoms/buttplugAtom'
import CountdownBar from './CountdownBar'
import { ScoreList } from './Score'
import { Grade } from '../../atoms/taskAtom'
import { useTimeLimit } from '../../hooks/useTimeLimit'
import { useTaskCountdownLeft } from '../../hooks/useTaskCountdownLeft'
import { generateSummaryHOLDANDCLAP } from '../Tasks/taskSummary'
import useTiming from '../../hooks/useTiming'
import { useButtplug } from '../../hooks/useButtplug'
import { useClapDetection } from '../../hooks/useClapDetection'
import { POINTS_PER_CLAP } from './ClapDetector'
import InstructionPhaseBanner from './InstructionPhaseBanner'
import { TaskType } from '../Tasks/task'

const HoldState = {
    NOT_STARTED: 'NOT_STARTED',
    CORRECT_DEPTH: 'CORRECT_DEPTH',
    SHALLOW_ONE: 'SHALLOW_ONE',
    DEEP_ONE: 'DEEP_ONE',
    COMPLETED: 'COMPLETED',
}

const PERFECT_MULTIPLIER = 0.5
const GOOD_MULTIPLIER = 0.2
const SURFACE_PENALTY = -8

function HoldAndClapDetector({ task, onTaskComplete, onSignalCaptureWindow, isLastTask }) {
    const setSfx = useSetAtom(sfxAtom)
    const setFeedback = useSetAtom(feedbackAtom)
    const { stopVibration } = useButtplug()
    const [vibrateSpeed, setVibrateSpeed] = useAtom(vibrateSpeedAtom)
    const diveState = useTiming()

    const hasPenalized = useRef(false)
    const hasStarted = useRef(false)
    const hasCompletedAttemptRef = useRef(false)
    const currentHoldStartRef = useRef(null)
    const holdScoresRef = useRef([])
    const totalTimeHeldRef = useRef(0)
    const longestSingleHoldRef = useRef(0)
    const totalClapsRef = useRef(0)

    const [remainingAttempts, setRemainingAttempts] = useState(task?.repeat ?? 3)
    const [holdState, setHoldState] = useState(HoldState.NOT_STARTED)
    const [holdScores, setHoldScores] = useState([])
    const [rawClaps, setRawClaps] = useState(0)
    const [effectiveClaps, setEffectiveClaps] = useState(0)
    const [lastFeedbackClap, setLastFeedbackClap] = useState(0)
    const [nextFeedbackIn, setNextFeedbackIn] = useState(Math.floor(Math.random() * 4) + 3) // Random between 4-6
    const [totalTimeHeld, setTotalTimeHeld] = useState(0)
    const [longestSingleHold, setLongestSingleHold] = useState(0)
    const [totalClaps, setTotalClaps] = useState(0)
    const effectiveTimeLimit = task?.timeLimit || (10 + (task?.repeat || 3) * ((task?.claps || 3) * 3 + 5))

    const handleTimeElapsed = useCallback(() => {
        const summary = generateSummaryHOLDANDCLAP(task, holdScoresRef.current, totalTimeHeldRef.current, longestSingleHoldRef.current, totalClapsRef.current)
        summary.failed = true
        onTaskComplete(summary, false)
    }, [task, onTaskComplete])

    useTimeLimit(effectiveTimeLimit, handleTimeElapsed)

    const timeLeft = useTaskCountdownLeft(task)
    const timeLeftRef = useRef(timeLeft)
    timeLeftRef.current = timeLeft

    useEffect(() => {
        if (!onSignalCaptureWindow) return undefined
        const id = setInterval(() => {
            const heldSec = currentHoldStartRef.current
                ? (performance.now() - currentHoldStartRef.current) / 1000
                : 0
            const okDepth =
                holdState === HoldState.CORRECT_DEPTH || holdState === HoldState.DEEP_ONE
            const ok = okDepth && heldSec >= 1 && rawClaps >= 1
            const vidMin = isLastTask ? 6 : 3
            onSignalCaptureWindow(ok, {
                photos: ok,
                videos: ok && timeLeftRef.current >= vidMin,
            })
        }, 1000)
        return () => clearInterval(id)
    }, [onSignalCaptureWindow, holdState, rawClaps, isLastTask])

    useEffect(() => {
        holdScoresRef.current = holdScores
    }, [holdScores])

    useEffect(() => {
        totalClapsRef.current = totalClaps
    }, [totalClaps])

    const calculateScore = useCallback((raw, effective) => {
        if (!task?.targetDepth || !task?.claps) return { grade: Grade.FAIL, score: 0, bonus: 0 }
        const basePoints = POINTS_PER_CLAP * task.claps
        const clapDiff = Math.abs(task.claps - raw)
        const perfectThreshold = Math.max(1, task.claps * 0.1)
        const goodThreshold = Math.max(2, task.claps * 0.25)

        let bonusMultiplier = 0
        let grade = Grade.PASS
        if (clapDiff <= perfectThreshold) {
            bonusMultiplier = PERFECT_MULTIPLIER
            grade = task.targetDepth === 4 ? Grade.PERFECT_DEEP : Grade.PERFECT
        } else if (clapDiff <= goodThreshold) {
            bonusMultiplier = GOOD_MULTIPLIER
            grade = Grade.GOOD
        }

        const bonus = Math.ceil(basePoints * bonusMultiplier)
        return {
            grade,
            score: Math.ceil(Math.max(0, basePoints + bonus)),
            bonus
        }
    }, [task?.targetDepth, task?.claps])

    const resetForNextAttempt = useCallback(() => {
        setRawClaps(0)
        setEffectiveClaps(0)
        setLastFeedbackClap(0)
        setNextFeedbackIn(Math.floor(Math.random() * 4) + 3)
        setHoldState(HoldState.NOT_STARTED)
        hasPenalized.current = false
        hasCompletedAttemptRef.current = false
    }, [])

    const holdStart = useCallback(() => {
        setSfx("Sfx.TICK")
        currentHoldStartRef.current = performance.now()
    }, [setSfx])

    const holdSuccess = useCallback(() => {
        setSfx("Sfx.TOCK")
        stopVibration()

        const singleScore = calculateScore(rawClaps, effectiveClaps)
        const newHoldScores = [...holdScores, singleScore]
        const newTotalClaps = totalClaps + rawClaps
        const newRemaining = remainingAttempts - 1

        setHoldScores(newHoldScores)
        setTotalClaps(newTotalClaps)
        setRemainingAttempts(newRemaining)

        if (newRemaining <= 0) {
            const summary = generateSummaryHOLDANDCLAP(task, newHoldScores, totalTimeHeldRef.current, longestSingleHoldRef.current, newTotalClaps)
            onTaskComplete(summary, true)
        } else {
            setRawClaps(0)
            setEffectiveClaps(0)
            setLastFeedbackClap(0)
            setNextFeedbackIn(Math.floor(Math.random() * 4) + 3)
            setHoldState(HoldState.COMPLETED)
        }
    }, [rawClaps, effectiveClaps, holdScores, remainingAttempts, totalClaps, task, onTaskComplete, calculateScore, setSfx, stopVibration])

    const holdFailed = useCallback(() => {
        setSfx("Sfx.QUIET")
        stopVibration()
        setHoldScores(prev => [...prev, { grade: Grade.FAIL, score: 0, bonus: 0 }])
        resetForNextAttempt()
    }, [setSfx, stopVibration, resetForNextAttempt])

    const holdPenalty = useCallback((penaltyScore = SURFACE_PENALTY, feedback) => {
        setSfx("Sfx.QUIET")
        stopVibration()
        setHoldScores(prev => [...prev, { grade: Grade.PENALTY, score: penaltyScore, bonus: 0 }])
        if (feedback) setFeedback(feedback)
        resetForNextAttempt()
    }, [setSfx, setFeedback, stopVibration, resetForNextAttempt])

    const handleClap = useCallback(() => {
        if (holdState === HoldState.CORRECT_DEPTH) {
            const newRaw = rawClaps + 1
            const newEffective = effectiveClaps + 1
            const shouldFeedback = task?.claps && newRaw > lastFeedbackClap + nextFeedbackIn && task.claps - newEffective > 2
            if (shouldFeedback) {
                setFeedback("Clap.KEEPGOING")
                setLastFeedbackClap(newRaw)
                setNextFeedbackIn(Math.floor(Math.random() * 3) + 4)
            }
            setRawClaps(newRaw)
            setEffectiveClaps(newEffective)
        } else if (holdState === HoldState.DEEP_ONE) {
            const newRaw = rawClaps + 1
            const newEffective = effectiveClaps + 0.25
            const shouldFeedback = task?.claps && newRaw > lastFeedbackClap + nextFeedbackIn && task.claps - newEffective > 2
            if (shouldFeedback) {
                setFeedback("Clap.KEEPGOING")
                setLastFeedbackClap(newRaw)
                setNextFeedbackIn(Math.floor(Math.random() * 3) + 4)
            }
            setRawClaps(newRaw)
            setEffectiveClaps(newEffective)
        } else if (holdState === HoldState.SHALLOW_ONE) {
            setRawClaps(prev => prev + 1)
        }
    }, [holdState, setFeedback, task?.claps, rawClaps, effectiveClaps, lastFeedbackClap, nextFeedbackIn])

    useClapDetection(handleClap, false, true, 'gameplay')

    useEffect(() => {
        if (!task?.claps) return
        if ((holdState === HoldState.CORRECT_DEPTH || holdState === HoldState.DEEP_ONE) && effectiveClaps >= task.claps && !hasCompletedAttemptRef.current) {
            hasCompletedAttemptRef.current = true
            holdSuccess()
        }
    }, [effectiveClaps, task?.claps, holdState, holdSuccess])

    useEffect(() => {
        if (task?.type === TaskType.HOLDANDCLAP) {
            setHoldState(HoldState.NOT_STARTED)
            setHoldScores([])
            setRawClaps(0)
            setEffectiveClaps(0)
            setLastFeedbackClap(0)
            setNextFeedbackIn(Math.floor(Math.random() * 4) + 3)
            setTotalTimeHeld(0)
            setLongestSingleHold(0)
            setTotalClaps(0)
            setRemainingAttempts(task.repeat ?? 3)
            hasPenalized.current = false
            hasStarted.current = false
            hasCompletedAttemptRef.current = false
        }
    }, [task])

    useEffect(() => {
        if (diveState.current > 0) hasStarted.current = true
    }, [diveState])

    const targetDepth = task?.targetDepth ?? 1
    const depthDifference = diveState.current - targetDepth

    useEffect(() => {
        if (targetDepth === undefined || targetDepth === null) return

        if (diveState.current === 0 && targetDepth > 1 && !hasPenalized.current && hasStarted.current) {
            holdPenalty(SURFACE_PENALTY, targetDepth > 2 ? "Feedback.SURFACE_PENALTY_HARD" : "Feedback.SURFACE_PENALTY_SOFT")
            hasPenalized.current = true
            return
        }

        if (Math.abs(depthDifference) > 1 &&
            (holdState === HoldState.SHALLOW_ONE || holdState === HoldState.CORRECT_DEPTH || holdState === HoldState.DEEP_ONE)) {
            holdFailed()
            return
        }

        if (holdState === HoldState.COMPLETED) {
            if (depthDifference < 0) resetForNextAttempt()
            return
        }

        if (depthDifference === 0 && holdState !== HoldState.CORRECT_DEPTH) {
            setHoldState(HoldState.CORRECT_DEPTH)
            holdStart()
            return
        }

        if (holdState === HoldState.CORRECT_DEPTH && depthDifference !== 0) {
            if (depthDifference === 1) {
                setHoldState(HoldState.DEEP_ONE)
            } else if (depthDifference === -1) {
                setHoldState(HoldState.SHALLOW_ONE)
            }
        }

        if (holdState === HoldState.DEEP_ONE && depthDifference === -1) {
            setHoldState(HoldState.SHALLOW_ONE)
        }
    }, [task, holdState, holdFailed, holdStart, resetForNextAttempt, holdPenalty, targetDepth, depthDifference, diveState])

    const animationFrameRef = useRef(null)
    const lastFrameTimeRef = useRef(null)

    useEffect(() => {
        totalTimeHeldRef.current = totalTimeHeld
        longestSingleHoldRef.current = longestSingleHold
    }, [totalTimeHeld, longestSingleHold])

    useEffect(() => {
        const updateTime = () => {
            const now = performance.now()
            if (!lastFrameTimeRef.current) {
                lastFrameTimeRef.current = now
                animationFrameRef.current = requestAnimationFrame(updateTime)
                return
            }
            const deltaTime = (now - lastFrameTimeRef.current) / 1000
            lastFrameTimeRef.current = now

            if (holdState === HoldState.CORRECT_DEPTH || holdState === HoldState.DEEP_ONE) {
                setTotalTimeHeld(prev => {
                    const next = prev + deltaTime
                    totalTimeHeldRef.current = next
                    return next
                })
                if (currentHoldStartRef.current) {
                    const elapsed = (now - currentHoldStartRef.current) / 1000
                    setLongestSingleHold(prev => {
                        const next = Math.max(prev, elapsed)
                        longestSingleHoldRef.current = next
                        return next
                    })
                }
            } else if (holdState === HoldState.SHALLOW_ONE) {
                setEffectiveClaps(prev => {
                    const next = Math.max(0, prev - deltaTime * 0.67)
                    if (next <= 0) holdFailed()
                    return next
                })
            }

            animationFrameRef.current = requestAnimationFrame(updateTime)
        }
        animationFrameRef.current = requestAnimationFrame(updateTime)
        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
        }
    }, [holdState, holdFailed])

    const currentProgress = task?.claps ? Math.min(100, (effectiveClaps / task.claps) * 100) : 0
    const atCorrectDepth = holdState === HoldState.CORRECT_DEPTH || holdState === HoldState.DEEP_ONE
    const clapsRemaining = task?.claps ? Math.max(0, Math.ceil(task.claps - effectiveClaps)) : 0
    const hasInstructionAudio = Boolean(String(task?.audio ?? '').trim())
    const customLabel = holdState === HoldState.SHALLOW_ONE
        ? `${effectiveClaps.toFixed(1)}s to recover`
        : (holdState === HoldState.CORRECT_DEPTH || holdState === HoldState.DEEP_ONE)
            ? `${clapsRemaining} claps`
            : null

    useEffect(() => {
        if ((holdState === HoldState.CORRECT_DEPTH || holdState === HoldState.DEEP_ONE || holdState === HoldState.SHALLOW_ONE) && task?.claps) {
            let baseVibration = 0.05
            if (task.targetDepth === 4) baseVibration = 0.2
            else if (task.targetDepth >= 2) baseVibration = 0.1

            let maxVibration = 0.5
            let incrementFactor = 0.05
            if (task.targetDepth === 4) {
                maxVibration = 1.0
                incrementFactor = 0.1
            } else if (task.targetDepth === 3) maxVibration = 0.75

            const progress = task.claps ? effectiveClaps / task.claps : 0
            const increments = Math.min(10, progress * 10)
            const targetVibration = Math.min(maxVibration, baseVibration + (increments * incrementFactor))

            if (vibrateSpeed < targetVibration) setVibrateSpeed(targetVibration)
        } else {
            stopVibration()
        }
    }, [effectiveClaps, holdState, task?.claps, task?.targetDepth, vibrateSpeed, setVibrateSpeed, stopVibration])

    return (
        <React.Fragment>
            <div className="column-centered">
                <InstructionPhaseBanner enabled hasInstructionAudio={hasInstructionAudio} />
                <CountdownBar
                    currentProgress={currentProgress}
                    secondsRemaining={clapsRemaining}
                    atCorrectDepth={atCorrectDepth}
                    showTimeLabels={false}
                    customLabel={customLabel}
                />
                <h4 className="margin-y-sm">
                    Attempts Remaining: <span className="not-a-button padding-x">{remainingAttempts}</span>
                </h4>
            </div>
            <div className="row-centered">
                <ScoreList scores={holdScores} />
            </div>
        </React.Fragment>
    )
}

export default HoldAndClapDetector
