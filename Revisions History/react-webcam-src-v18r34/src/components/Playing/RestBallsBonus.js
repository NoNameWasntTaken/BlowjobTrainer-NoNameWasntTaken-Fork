import React, { useEffect, useRef, useCallback, useState } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { useTimeLimit } from '../../hooks/useTimeLimit'
import { useTaskCountdownLeft } from '../../hooks/useTaskCountdownLeft'
import { ballsCoveredAtom, gridsAtom } from '../../atoms/gridAtoms'
import { currentStateAtom } from '../../atoms/markersAtoms'
import { sfxAtom } from '../../atoms/audioAtom'
import { BALLS_BONUS_INTERVAL_SEC, BALLS_BONUS_PER_INTERVAL } from './endlessScoring'
import { generateSummaryREST } from '../Tasks/taskSummary'
import { ScoreList } from './Score'
import { Grade } from '../../atoms/taskAtom'
import { useButtplug } from '../../hooks/useButtplug'

function RestBallsBonus({ task, onTaskOver, onSignalCaptureWindow, isLastTask }) {
    const ballsCovered = useAtomValue(ballsCoveredAtom)
    const grids = useAtomValue(gridsAtom)
    const currentState = useAtomValue(currentStateAtom)
    const setSfx = useSetAtom(sfxAtom)

    const ballsHoldStartTimeRef = useRef(null)
    const prevBallsCoveredRef = useRef(null)
    const ballsBonusScoreRef = useRef(0)
    const sessionStartBallsBonusRef = useRef(0)
    const lastIntervalsCompletedRef = useRef(0)

    const [allScores, setAllScores] = useState([])
    const allScoresRef = useRef([])
    allScoresRef.current = allScores

    const hasBallsGrids = (Array.isArray(grids) ? grids : []).some(g => g.balls === true)
    const { setVibrateSpeed, stopVibration } = useButtplug()
    const atSurface = currentState === 0
    const earningBallsBonus = hasBallsGrids && ballsCovered && atSurface

    useEffect(() => {
        if (earningBallsBonus) {
            setVibrateSpeed(0.1)
        } else {
            stopVibration()
        }
    }, [earningBallsBonus, setVibrateSpeed, stopVibration])

    useEffect(() => () => {
        stopVibration()
    }, [stopVibration])

    const handleTimeElapsed = useCallback(() => {
        onTaskOver(generateSummaryREST(task, ballsBonusScoreRef.current), true)
    }, [task, onTaskOver])

    useTimeLimit(task?.timeLimit ?? 10, handleTimeElapsed)

    const timeLeft = useTaskCountdownLeft(task)
    const timeLeftRef = useRef(timeLeft)
    timeLeftRef.current = timeLeft

    useEffect(() => {
        if (!onSignalCaptureWindow) return undefined
        const vidMin = isLastTask ? 6 : 3
        const id = setInterval(() => {
            const w = earningBallsBonus
            onSignalCaptureWindow(w, {
                photos: w,
                videos: w && timeLeftRef.current >= vidMin,
            })
        }, 1000)
        return () => clearInterval(id)
    }, [onSignalCaptureWindow, earningBallsBonus, isLastTask])

    useEffect(() => {
        if (!hasBallsGrids) return
        const prev = prevBallsCoveredRef.current
        if (prev !== null && prev !== ballsCovered) {
            setSfx(ballsCovered ? 'Sfx.TICK' : 'Sfx.TOCK')
        }
        prevBallsCoveredRef.current = ballsCovered
    }, [ballsCovered, hasBallsGrids, setSfx])

    useEffect(() => {
        if (!hasBallsGrids) return
        const interval = setInterval(() => {
            const now = performance.now()
            const atSurface = currentState === 0
            if (ballsCovered && atSurface) {
                if (!ballsHoldStartTimeRef.current) {
                    ballsHoldStartTimeRef.current = now
                    sessionStartBallsBonusRef.current = ballsBonusScoreRef.current
                }
                const holdTime = (now - ballsHoldStartTimeRef.current) / 1000
                const intervalsCompleted = Math.floor(holdTime / BALLS_BONUS_INTERVAL_SEC)
                const newScore = sessionStartBallsBonusRef.current + intervalsCompleted * BALLS_BONUS_PER_INTERVAL
                ballsBonusScoreRef.current = newScore

                if (intervalsCompleted > lastIntervalsCompletedRef.current) {
                    const newPoints = (intervalsCompleted - lastIntervalsCompletedRef.current) * BALLS_BONUS_PER_INTERVAL
                    lastIntervalsCompletedRef.current = intervalsCompleted
                    const entry = { score: newPoints, grade: Grade.PASS }
                    const updated = [...allScoresRef.current, entry]
                    allScoresRef.current = updated
                    setAllScores(updated)
                }
            } else {
                ballsHoldStartTimeRef.current = null
                lastIntervalsCompletedRef.current = 0
            }
        }, 100)
        return () => clearInterval(interval)
    }, [ballsCovered, hasBallsGrids, currentState])

    return (
        <div className="margin-y-sm">
            <h5>Score Feed</h5>
            <ScoreList scores={allScores.slice(-5)} />
        </div>
    )
}

export default RestBallsBonus
