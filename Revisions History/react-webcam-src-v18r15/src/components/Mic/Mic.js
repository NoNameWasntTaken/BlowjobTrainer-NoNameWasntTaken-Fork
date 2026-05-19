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
                Use this page to calibrate your microphone for clap detection and adjust audio levels. Ensure "Test Clap On" is enabled to check clap levels.
                <br></br>Tune the clap detection threshold and test with different clap intensities to find the right setting. Adjust the relative volume levels of SFX, voice, and background tracks to your liking.
                <br></br>Run "Test Background Track" to verify levels with SFX and Voice, as well as clean clap detection with background music. Ensure a background track is selected in the Content Library to use this feature.
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
                <VolumeControl label="Music" volumeAtom={musicVolumeAtom} />
            </div>
            <div className="column-centered margin-y margin-y-top">
                <h2 className="margin-y-sm">Background Track Settings</h2>
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
        </div>
    )
}

export default Mic
