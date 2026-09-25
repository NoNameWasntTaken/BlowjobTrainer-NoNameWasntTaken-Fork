import React, { useRef, useState } from 'react'
import { useSherpaMicTap } from '../../hooks/useSherpaMicTap'
import { useMicStreamForCalibration } from '../../hooks/useMicStreamForCalibration'
import '../Playing/SpeakDetector.css'

function SpeechDetectionCalibration() {
    const micReady = useMicStreamForCalibration()

    const pcmFeedAllowedRef = useRef(true)
    pcmFeedAllowedRef.current = true
    const completedRef = useRef(false)

    const [partialUi, setPartialUi] = useState('')
    const [transcriptLines, setTranscriptLines] = useState([])

    const onPartialTextRef = useRef(null)
    onPartialTextRef.current = (text) => {
        setPartialUi(text)
    }

    const onAfterDecodeRef = useRef(null)
    onAfterDecodeRef.current = ({ text, isEndpoint, reset }) => {
        if (!isEndpoint) return
        const line = (text ?? '').trim()
        if (line) {
            setTranscriptLines((prev) => [...prev, line])
        }
        setPartialUi('')
        try {
            reset?.()
        } catch (e) {
            /* ignore */
        }
    }

    const { modelLoadState, pcmReceived, speechPipelineLive } = useSherpaMicTap({
        enabled: micReady,
        resetKey: 'mic-speech-calibration',
        pcmFeedAllowedRef,
        completedRef,
        onPartialTextRef,
        onAfterDecodeRef,
    })

    return (
        <div className="speech-detection-calibration margin-y-sm">
            <div className="column-centered margin-y">
                {!micReady && <p className="help margin-y-sm">Connecting microphone…</p>}
                {micReady && modelLoadState === 'loading' && (
                    <p className="help margin-y-sm">Loading speech model…</p>
                )}
                {micReady && modelLoadState === 'failed' && (
                    <p className="help margin-y-sm">
                        Speech model failed to load. Check the console and that <code>public/asr/</code> contains the
                        sherpa-onnx WASM assets (the <code>.js</code>, <code>.wasm</code>, and <code>.data</code> files)
                        and they are served as static files.
                    </p>
                )}
                {micReady && modelLoadState === 'ready' && !pcmReceived && (
                    <p className="help margin-y-sm">Waiting for microphone audio…</p>
                )}
                {micReady && modelLoadState === 'ready' && pcmReceived && !speechPipelineLive && (
                    <p className="help margin-y-sm">Starting recognizer…</p>
                )}
                {micReady && modelLoadState === 'ready' && speechPipelineLive && (
                    <p className="help margin-y-sm">Listening — speak normally. Finished utterances appear below.</p>
                )}
            </div>
            {transcriptLines.length > 0 && (
                <div className="row-centered margin-y-sm" style={{ maxWidth: '42rem', margin: '0 auto', textAlign: 'left' }}>
                    <pre
                        className="help"
                        style={{
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            width: '100%',
                            margin: 0,
                        }}
                    >
                        {transcriptLines.join('\n')}
                    </pre>
                </div>
            )}
            {partialUi ? (
                <p className="row-centered help margin-y-sm" style={{ fontStyle: 'italic' }}>
                    {partialUi}
                </p>
            ) : null}
        </div>
    )
}

export default SpeechDetectionCalibration
