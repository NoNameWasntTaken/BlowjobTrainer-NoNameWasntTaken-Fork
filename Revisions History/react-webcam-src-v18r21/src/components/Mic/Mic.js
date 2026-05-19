import React, { useEffect, useState, useCallback } from 'react'
import ClapDetector from '../Playing/ClapDetector'
import VolumeControl from '../VolumeControl'
import NumberControl from '../NumberControl'
import {
    sfxVolumeAtom,
    voiceVolumeAtom,
    musicVolumeAtom,
    musicFadeInEnabledAtom,
    musicFadeInDurationAtom,
    musicFadeOutEnabledAtom,
    musicFadeOutDurationAtom,
    musicPlaybackSessionAtom,
    feedbackAtom,
    sfxAtom,
} from '../../atoms/audioAtom'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { store } from '../../store'
import { musicTrackManager } from '../../services/musicTrackManager'
import { audioProcessingService } from '../../services/audioProcessingService'
import MicInputDevicePicker from './MicInputDevicePicker'
import SpeechDetectionCalibration from './SpeechDetectionCalibration'
import { micAudioTestModeAtom } from '../../atoms/markersAtoms'
import './Mic.css'

const VOICE_TEST_ORDER = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'BALL']
const SFX_TEST_ORDER = ['TICK', 'TOCK', 'QUIET']

/** e.g. ZERO → Zero, QUIET → Quiet */
function formatTestKeyLabel(key) {
    if (!key) return ''
    return key.charAt(0) + key.slice(1).toLowerCase()
}

function Mic() {
    const [testMusicOn, setTestMusicOn] = useState(false)
    const [voiceTestIndex, setVoiceTestIndex] = useState(0)
    const [sfxTestIndex, setSfxTestIndex] = useState(0)
    const setFeedback = useSetAtom(feedbackAtom)
    const setSfx = useSetAtom(sfxAtom)
    const setMusicSession = useSetAtom(musicPlaybackSessionAtom)
    const musicFadeOutEnabled = useAtomValue(musicFadeOutEnabledAtom)
    const [fadeInEnabled, setFadeInEnabled] = useAtom(musicFadeInEnabledAtom)
    const [fadeInDuration, setFadeInDuration] = useAtom(musicFadeInDurationAtom)
    const [fadeOutEnabled, setFadeOutEnabled] = useAtom(musicFadeOutEnabledAtom)
    const [fadeOutDuration, setFadeOutDuration] = useAtom(musicFadeOutDurationAtom)
    const [micAudioTestMode, setMicAudioTestMode] = useAtom(micAudioTestModeAtom)

    useEffect(() => {
        return () => {
            store.set(musicPlaybackSessionAtom, (prev) => ({
                url: null,
                generation: prev.generation + 1,
                stopFade: false
            }))
        }
    }, [])

    const startTestMusic = async () => {
        const id = musicTrackManager.getActiveTrackId()
        if (!id) {
            window.alert('Select a background music track in Content Library first (Set Active).')
            return
        }
        try {
            const ctx = await audioProcessingService.ensureAudioContext()
            await ctx.resume()
            const url = await musicTrackManager.resolveTrackUrl(id)
            if (!url) {
                window.alert('Could not load the selected track.')
                return
            }
            setMusicSession((prev) => ({
                url,
                generation: prev.generation + 1,
                stopFade: false
            }))
            setTestMusicOn(true)
        } catch (e) {
            console.error(e)
            window.alert(e.message || 'Could not start test music')
        }
    }

    const stopTestMusic = () => {
        const stopFade = musicFadeOutEnabled
        setMusicSession((prev) => ({
            url: null,
            generation: prev.generation + 1,
            stopFade
        }))
        setTestMusicOn(false)
    }

    const playTestVoice = useCallback(() => {
        const key = VOICE_TEST_ORDER[voiceTestIndex]
        setFeedback(`Calibration.${key}`)
        setVoiceTestIndex((i) => (i + 1) % VOICE_TEST_ORDER.length)
    }, [setFeedback, voiceTestIndex])

    const playTestSfx = useCallback(() => {
        const key = SFX_TEST_ORDER[sfxTestIndex]
        setSfx(`Sfx.${key}`)
        setSfxTestIndex((i) => (i + 1) % SFX_TEST_ORDER.length)
    }, [setSfx, sfxTestIndex])

    return (
        <div className="mic-calibration">
            <h2>Audio Calibration</h2>
            <p className="help margin-y-sm">
                Use this page to calibrate your microphone for clap and speech detection and to adjust audio levels. 
                <br></br>Select from available microphone devices below, then turn on <b>Clap Test</b> or <b>Speech Test</b> to ensure the microphone is working correctly. Only one test runs at a time; starting one test automatically ends the other.
                <br></br>Run <b>Test Background Track</b> to verify levels with SFX and Voice, as well as clap/speech detection with background music. Ensure a background track is selected in the Content Library to use this feature.
                <br></br>When running a level with Speak tasks, a separate microphone from the default system mic is recommended. This is especially important when background music is playing. External webcams with their own microphones work well.
            </p>
            <MicInputDevicePicker />
            <div className="mic-audio-section">
                <ClapDetector
                    isCalibration={true}
                    targetClaps={1}
                    timeLimit={30}
                    onTaskComplete={() => { }}
                />
            </div>
            <div className="speech-detection-test-section mic-audio-section">
                <div className="row-centered margin-y-top">
                    <h3>Speech Detection</h3>
                </div>
                <p className="help margin-y-sm row-centered">
                    Test speech recognition and note the resulting text output; Speak tasks should be configured to match the text. 
                </p>
                <div className="row-centered margin-y-sm">
                    <button
                        type="button"
                        className={`button padding-x${micAudioTestMode === 'speech' ? ' button-primary' : ''}`}
                        onClick={() =>
                            setMicAudioTestMode(micAudioTestMode === 'speech' ? 'off' : 'speech')
                        }
                        aria-pressed={micAudioTestMode === 'speech'}
                    >
                        {micAudioTestMode === 'speech' ? 'Speech Test On' : 'Speech Test Off'}
                    </button>
                </div>
                {micAudioTestMode === 'speech' ? <SpeechDetectionCalibration /> : null}
            </div>
            <div className="column-centered mic-audio-section">
                <h3 className="margin-y-sm">Background Track Settings</h3>
                <div
                    className="column-centered margin-y-sm"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'auto auto',
                        columnGap: '12px',
                        rowGap: '1rem',
                        alignItems: 'start',
                        justifyContent: 'center',
                        width: 'fit-content',
                        marginLeft: 'auto',
                        marginRight: 'auto',
                    }}
                >
                    <label className="mic-fade-checkbox-label">
                        <input
                            type="checkbox"
                            checked={fadeInEnabled}
                            onChange={(e) => setFadeInEnabled(e.target.checked)}
                        />
                        Fade In
                    </label>
                    <div className="mic-duration-number-control-scale" style={{ justifySelf: 'start' }}>
                        <NumberControl
                            label="Duration (s)"
                            value={fadeInDuration}
                            setValue={setFadeInDuration}
                            min={1}
                            max={10}
                            step={1}
                        />
                    </div>
                    <label className="mic-fade-checkbox-label">
                        <input
                            type="checkbox"
                            checked={fadeOutEnabled}
                            onChange={(e) => setFadeOutEnabled(e.target.checked)}
                        />
                        Fade Out
                    </label>
                    <div className="mic-duration-number-control-scale" style={{ justifySelf: 'start' }}>
                        <NumberControl
                            label="Duration (s)"
                            value={fadeOutDuration}
                            setValue={setFadeOutDuration}
                            min={1}
                            max={10}
                            step={1}
                        />
                    </div>
                </div>
                <div className="row-centered margin-y-sm">
                    {!testMusicOn ? (
                        <button type="button" className="button button-primary padding-x" onClick={() => void startTestMusic()}>
                            Test Background Track
                        </button>
                    ) : (
                        <button type="button" className="button padding-x" onClick={stopTestMusic}>
                            Stop Test Music
                        </button>
                    )}
                </div>
                <div
                    className="row-centered margin-y-sm"
                    style={{
                        display: 'flex',
                        gap: '12px',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                    }}
                >
                    <button type="button" className="button padding-x" onClick={playTestVoice}>
                        Test Voice: {formatTestKeyLabel(VOICE_TEST_ORDER[voiceTestIndex])}
                    </button>
                    <button type="button" className="button padding-x" onClick={playTestSfx}>
                        Test SFX: {formatTestKeyLabel(SFX_TEST_ORDER[sfxTestIndex])}
                    </button>
                </div>
            </div>
            <div className="column-centered mic-audio-section">
                <h3 className="margin-y-sm">Volume Settings</h3>
                <VolumeControl label="SFX" volumeAtom={sfxVolumeAtom} />
                <VolumeControl label="Voice" volumeAtom={voiceVolumeAtom} />
                <VolumeControl label="Music" volumeAtom={musicVolumeAtom} />
            </div>
        </div>
    )
}

export default Mic
