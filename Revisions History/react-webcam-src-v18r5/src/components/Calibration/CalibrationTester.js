import React from 'react'
import { useEffect } from 'react'
import { useSetAtom, useAtomValue } from 'jotai'
import { feedbackAtom } from '../../atoms/audioAtom'
import { currentStateAtom } from '../../atoms/markersAtoms'
import { selectedGridIdAtom, gridMigrationDoneAtom } from '../../atoms/gridAtoms'

function CalibrationTester() {
    const migrationDone = useAtomValue(gridMigrationDoneAtom)
    const selectedGridId = useAtomValue(selectedGridIdAtom)
    const setFeedback = useSetAtom(feedbackAtom)
    const currentState = useAtomValue(currentStateAtom)

    const isAllGridsMode = selectedGridId === null

    useEffect(() => {
        // Map depth to corresponding calibration audio
        switch (currentState) {
            case 0:
                console.log('CALIBRATE_ZERO')
                setFeedback("Calibration.ZERO")
                break
            case 1:
                console.log('CALIBRATE_ONE')
                setFeedback("Calibration.ONE")
                break
            case 2:
                console.log('CALIBRATE_TWO')
                setFeedback("Calibration.TWO")
                break
            case 3:
                console.log('CALIBRATE_THREE')
                setFeedback("Calibration.THREE")
                break
            case 4:
                console.log('CALIBRATE_FOUR')
                setFeedback("Calibration.FOUR")
                break
            default:
                break
        }
    }, [currentState, setFeedback])

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

    return (
        <React.Fragment>
            <div className="column-centered">
                {/* <h4 className='margin-y-sm'>Calibration Mode</h4> */}
                <h2 className='margin-y-sm'>Current depth: <b>{currentState}</b></h2>
            </div>

            <p>Try moving to different depths to test the audio feedback</p>
        </React.Fragment>
    )
}

export default CalibrationTester 