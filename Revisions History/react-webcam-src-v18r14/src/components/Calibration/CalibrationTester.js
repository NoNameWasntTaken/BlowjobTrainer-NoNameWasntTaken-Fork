import React from 'react'
import { useEffect, useRef } from 'react'
import { useSetAtom, useAtomValue } from 'jotai'
import { feedbackAtom } from '../../atoms/audioAtom'
import { currentStateAtom } from '../../atoms/markersAtoms'
import {
    selectedGridIdAtom,
    gridMigrationDoneAtom,
    combinedBallsPercentAtom,
    ballsDepthPercentAtom,
    gridsAtom
} from '../../atoms/gridAtoms'

function CalibrationTester() {
    const migrationDone = useAtomValue(gridMigrationDoneAtom)
    const selectedGridId = useAtomValue(selectedGridIdAtom)
    const setFeedback = useSetAtom(feedbackAtom)
    const currentState = useAtomValue(currentStateAtom)
    const combinedBallsPercent = useAtomValue(combinedBallsPercentAtom)
    const ballsDepthPercent = useAtomValue(ballsDepthPercentAtom)
    const grids = useAtomValue(gridsAtom)

    const isAllGridsMode = selectedGridId === null
    const hasBallsGrids = (Array.isArray(grids) ? grids : []).some(g => g.balls === true)

    const lastFeedbackRef = useRef(null)

    useEffect(() => {
        let nextFeedback
        // Depth priority: depth 1-4 plays depth feedback, suppresses balls
        if (currentState >= 1) {
            const depthKeys = [null, "Calibration.ONE", "Calibration.TWO", "Calibration.THREE", "Calibration.FOUR"]
            nextFeedback = depthKeys[currentState] ?? "Calibration.FOUR"
        } else if (hasBallsGrids && combinedBallsPercent < ballsDepthPercent) {
            // Depth 0 + balls hidden (low visibility = balls inserted/covered): play BALL
            nextFeedback = "Calibration.BALL"
        } else {
            // Depth 0, balls uncovered or no balls grids
            nextFeedback = "Calibration.ZERO"
        }

        // Only trigger audio when the decision changes, not on every percentage fluctuation
        if (nextFeedback !== lastFeedbackRef.current) {
            lastFeedbackRef.current = nextFeedback
            setFeedback(nextFeedback)
        }
    }, [currentState, combinedBallsPercent, ballsDepthPercent, hasBallsGrids, setFeedback])

    // Early return if migration not done (after hooks)
    if (!migrationDone) {
        return null
    }

    // Show message if not in All Grids mode
    if (!isAllGridsMode) {
        return (
            <React.Fragment>
                <div className="column-centered">
                    <p>Please select 'All Grids' to enable calibration test</p>
                </div>
            </React.Fragment>
        )
    }

    const ballsHidden = hasBallsGrids && combinedBallsPercent < ballsDepthPercent
    const displayValue = currentState >= 1
        ? currentState
        : (ballsHidden ? 'Balls' : 0)

    return (
        <React.Fragment>
            <div className="column-centered">
                {/* <h4 className='margin-y-sm'>Calibration Mode</h4> */}
                <h2 className='margin-y-sm'>Current depth: <b>{displayValue}</b></h2>
            </div>

            <p>Try moving to different depths to test the audio feedback</p>
        </React.Fragment>
    )
}

export default CalibrationTester 