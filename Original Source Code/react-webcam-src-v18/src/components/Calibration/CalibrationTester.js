import React from 'react'
import { useState, useEffect } from 'react'
import { useSetAtom, useAtomValue } from 'jotai'
import { feedbackAtom } from '../../atoms/audioAtom'
import { currentStateAtom } from '../../atoms/markersAtoms'
import { AUDIO } from '../Tasks/audio'

function CalibrationTester() {

    const setFeedback = useSetAtom(feedbackAtom)
    const currentState = useAtomValue(currentStateAtom)

    useEffect(() => {



        // Map depth to corresponding calibration audio
        switch (currentState) {
            case 0:
                console.log('CALIBRATE_ZERO')
                setFeedback(AUDIO.Calibration.ZERO)
                break
            case 1:
                console.log('CALIBRATE_ONE')
                setFeedback(AUDIO.Calibration.ONE)
                break
            case 2:
                console.log('CALIBRATE_TWO')
                setFeedback(AUDIO.Calibration.TWO)
                break
            case 3:
                console.log('CALIBRATE_THREE')
                setFeedback(AUDIO.Calibration.THREE)
                break
            case 4:
                console.log('CALIBRATE_FOUR')
                setFeedback(AUDIO.Calibration.FOUR)
                break
            default:
                break
        }
    }, [currentState])

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