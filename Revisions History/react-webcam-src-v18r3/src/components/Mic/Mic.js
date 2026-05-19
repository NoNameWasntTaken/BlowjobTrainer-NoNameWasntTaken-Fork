import React from 'react'
import ClapDetector from '../Playing/ClapDetector'

function Mic() {
    return (
        <div className="mic-calibration">
            <h2>Microphone Calibration</h2>
            <p className="help margin-y-sm">
                Use this page to calibrate your microphone for clap detection.
                Adjust the threshold and test with different clap intensities to find the right setting.
            </p>
            <ClapDetector
                isCalibration={true}
                targetClaps={1}
                timeLimit={30}
                onTaskComplete={() => { }}
            />
        </div>
    )
}

export default Mic 