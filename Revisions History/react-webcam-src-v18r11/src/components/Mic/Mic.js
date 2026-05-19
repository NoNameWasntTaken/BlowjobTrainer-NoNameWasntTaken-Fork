import React from 'react'
import ClapDetector from '../Playing/ClapDetector'
import VolumeControl from '../VolumeControl'
import { sfxVolumeAtom, voiceVolumeAtom } from '../../atoms/audioAtom'

function Mic() {
    return (
        <div className="mic-calibration">
            <h2>Audio Calibration</h2>
            <p className="help margin-y-sm">
                Use this page to calibrate your microphone for clap detection and adjust audio levels.
                Tune the clap detection threshold and test with different clap intensities to find the right setting. Adjust the relative volume levels of voice and SFX to your liking.
            </p>
            <ClapDetector
                isCalibration={true}
                targetClaps={1}
                timeLimit={30}
                onTaskComplete={() => { }}
            />
            <div className="column-centered margin-y margin-y-top">
                <h2 className="margin-y-sm">Volume Settings</h2>
                <VolumeControl label="SFX" volumeAtom={sfxVolumeAtom} />
                <VolumeControl label="Voice" volumeAtom={voiceVolumeAtom} />
            </div>
        </div>
    )
}

export default Mic 