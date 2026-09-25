import { useState, useEffect, useCallback, useRef } from 'react'
import { useSetAtom } from 'jotai'
import { feedbackAtom, sfxAtom } from '../../atoms/audioAtom'
import CountdownBar from './CountdownBar'
import { ScoreList } from './Score'
import { Grade } from '../../atoms/taskAtom'
import { useTimeLimit } from '../../hooks/useTimeLimit'
import { useTaskCountdownLeft } from '../../hooks/useTaskCountdownLeft'
import { generateSummaryHITDEPTH } from '../Tasks/taskSummary'
import { calculateHitDepthTimeLimit } from '../Tasks/task'
// hook 
import useTiming from '../../hooks/useTiming'
import { useButtplug } from '../../hooks/useButtplug'

// Hit state enum
const HitState = {
    NOT_STARTED: 'NOT_STARTED',
    IN_PROGRESS: 'IN_PROGRESS',
    AT_DEPTH: 'AT_DEPTH'
}

// scoring constants
export const POINTS_PER_DEPTH = [0, 1, 2, 3, 8]
const SURFACE_PENALTY = -4

function HitDepth({ task, onTaskOver, onSignalCaptureWindow, isLastTask }) {
    const setSfx = useSetAtom(sfxAtom)
    const setFeedback = useSetAtom(feedbackAtom)

    // hook
    const diveState = useTiming()
    const { adjustVibration, stopVibration } = useButtplug()

    // pause this task
    // eslint-disable-next-line no-unused-vars -- setPaused reserved for future pause UI
    const [paused, setPaused] = useState(false)

    // Track if diving has started
    const [hasStarted, setHasStarted] = useState(false)

    // State tracking
    const [instruction, setInstruction] = useState('')
    const [hitState, setHitState] = useState(HitState.NOT_STARTED)
    const [hitsCompleted, setHitsCompleted] = useState(0)
    const [hitScores, setHitScores] = useState([])

    // Add ref for hitScores
    const hitScoresRef = useRef([])

    // Update ref whenever hitScores changes
    useEffect(() => {
        hitScoresRef.current = hitScores
    }, [hitScores])

    // Handle time elapsed
    const handleTimeElapsed = useCallback(() => {
        // Get the latest scores from ref instead of relying on closure
        const summary = generateSummaryHITDEPTH(task, hitScoresRef.current)
        summary.failed = true
        onTaskOver(summary, false)
    }, [task, onTaskOver])

    // Use the time limit hook (fallback to auto-calculated when 0/missing)
    const effectiveTimeLimit = task.timeLimit || calculateHitDepthTimeLimit(task.repeat)
    useTimeLimit(effectiveTimeLimit, handleTimeElapsed)

    const timeLeft = useTaskCountdownLeft(task)
    const timeLeftRef = useRef(timeLeft)
    timeLeftRef.current = timeLeft

    useEffect(() => {
        if (!onSignalCaptureWindow) return undefined
        const id = setInterval(() => {
            const atT =
                hitState === HitState.AT_DEPTH && timeLeftRef.current > 1
            onSignalCaptureWindow(atT, { photos: atT, videos: false })
        }, 1000)
        return () => clearInterval(id)
    }, [onSignalCaptureWindow, hitState])

    // Calculate score based on depth
    const calculateScore = useCallback(() => {
        if (!task?.targetDepth) return { grade: Grade.FAIL, score: 0, bonus: 0 }

        // Points per depth: 1,2,5,10 for depths 1,2,3,4
        const pointsPerDepth = POINTS_PER_DEPTH
        const score = pointsPerDepth[task.targetDepth]

        // For depth 4, use PERFECT_DEEP grade
        if (task.targetDepth === 4) {
            return {
                grade: Grade.PERFECT_DEEP,
                score,
                bonus: 0
            }
        }

        return {
            grade: Grade.PASS,
            score,
            bonus: 0
        }
    }, [task?.targetDepth])

    const hitSuccess = useCallback(() => {
        setSfx("Sfx.TICK")
        const newHitsCompleted = hitsCompleted + 1
        setHitsCompleted(newHitsCompleted)

        // Calculate and record score
        const hitScore = calculateScore()
        setHitScores(prev => [...prev, hitScore])

        // Add vibration feedback based on depth
        if (task.targetDepth === 4) {
            adjustVibration(0.1)
        } else if (task.targetDepth >= 2) {
            adjustVibration(0.05)
        }

        if (newHitsCompleted >= task.repeat) {
            setInstruction('All hits completed!')
            const summary = generateSummaryHITDEPTH(task, [...hitScores, hitScore])
            setTimeout(() => onTaskOver(summary, true), 500)
        } else {
            setInstruction(`Good! ${newHitsCompleted}/${task.repeat} hits. Move up to reset`)
        }
    }, [hitsCompleted, task, hitScores, setSfx, calculateScore, onTaskOver, adjustVibration])

    const hitFailed = useCallback(() => {
        setSfx("Sfx.QUIET")
        setInstruction('Hit failed! Try again')
        setHitScores(prev => [...prev, { grade: Grade.FAIL, score: 0, bonus: 0 }])
    }, [setSfx])

    // Set up the task
    useEffect(() => {
        setInstruction(`Hit depth ${task.targetDepth} ${task.repeat} times`)
        setFeedback(0)
        setSfx(0)
        setHitsCompleted(0)
        setHitState(HitState.NOT_STARTED)
        setHitScores([])
        setHasStarted(false)
    }, [task, setFeedback, setSfx])

    // Check if diving has started
    useEffect(() => {
        if (!hasStarted && diveState.current > 0) {
            setHasStarted(true)
        }
    }, [hasStarted, diveState])

    // State machine for hit tracking
    useEffect(() => {
        if (paused) return

        const currentDepth = diveState.current
        const targetDepth = task.targetDepth
        const depthDifference = currentDepth - targetDepth

        // console.log('State Update:', { currentDepth, targetDepth, hitState, depthDifference })

        // Reset for next attempt when one level shallower than target (depthDifference === -1).
        // For target depth 1, that level is the surface (0), so this must run before the
        // generic surface-failure rule below—otherwise each reset would call hitFailed().
        if (hitState === HitState.AT_DEPTH && depthDifference === -1) {
            // console.log('Ready for next attempt')
            setSfx("Sfx.TOCK")
            setHitState(HitState.NOT_STARTED)
            setInstruction(`Hit depth ${targetDepth}`)
            return
        }

        // If we return to surface (depth 0) after starting, mark as failed and reset
        // (abandoned attempt: not AT_DEPTH with depthDifference === -1, handled above)
        if (currentDepth === 0 && hitState !== HitState.NOT_STARTED && hasStarted) {
            // console.log('Failed - returned to surface')
            setHitState(HitState.NOT_STARTED)
            setInstruction(`Hit depth ${targetDepth}`)
            hitFailed()
            return
        }

        // Start tracking when we move off surface
        if (hitState === HitState.NOT_STARTED && currentDepth > 0) {
            // console.log('Starting new attempt')
            setHitState(HitState.IN_PROGRESS)
            return
        }

        // Check for success when we reach or exceed target depth
        if (hitState === HitState.IN_PROGRESS && depthDifference >= 0) {
            // console.log('Success - hit target depth')
            setHitState(HitState.AT_DEPTH)
            hitSuccess()
            return
        }
    }, [task.targetDepth, hitState, hitSuccess, hitFailed, paused, setInstruction, hasStarted, diveState, setSfx])

    // Apply surface penalty
    useEffect(() => {
        if (diveState.current === 0 && hitState !== HitState.NOT_STARTED
            && hasStarted && task.targetDepth !== 1) {
            setHitScores(prev => [...prev, {
                grade: Grade.PENALTY,
                score: SURFACE_PENALTY,
                bonus: 0,
                issues: ['surfaced']
            }])
            if (task.targetDepth > 2) {
                setFeedback("Feedback.SURFACE_PENALTY_HARD")
            } else {
                setFeedback("Feedback.SURFACE_PENALTY_SOFT")
            }
            // Stop vibration when surfacing without permission
            stopVibration()
        }
    }, [hitState, hasStarted, setFeedback, task.targetDepth, stopVibration, diveState])

    // Calculate progress percentage
    const progressPercentage = Math.min(100, (hitsCompleted / task.repeat) * 100)

    return (
        <div>
            <h4>Hit depth {task.targetDepth}</h4>
            <h5>
                {paused ? 'PAUSED' : `Instruction: ${instruction}`}
            </h5>
            <h6>Progress: {hitsCompleted}/{task.repeat} hits</h6>

            <CountdownBar
                currentProgress={progressPercentage}
                secondsRemaining={task.repeat - hitsCompleted}
                atCorrectDepth={hitState === HitState.AT_DEPTH && !paused}
                showTimeLabels={false}
                customLabel={`${hitsCompleted}/${task.repeat} hits`}
            />

            <div className="row-centered">
                <ScoreList scores={hitScores} />
            </div>
        </div>
    )
}

export default HitDepth 