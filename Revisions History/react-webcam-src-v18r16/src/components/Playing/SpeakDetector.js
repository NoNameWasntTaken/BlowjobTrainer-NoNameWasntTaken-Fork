import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { sfxAtom, speakRecognitionAllowedAtom } from '../../atoms/audioAtom'
import { audioProcessingService } from '../../services/audioProcessingService'
import { getSherpaOnnxReadyPromise, isSherpaOnnxReady } from '../../services/sherpaOnnxPreloadService'
import { splitSpeakSegments } from '../../services/speakSentenceSplit'
import { normalizeSpeakText, phraseMatchesTarget } from '../../services/speakPhraseMatcher'
import { SpeakMode } from '../Tasks/task'
import { generateSummarySPEAK } from '../Tasks/taskSummary'
import './SpeakDetector.css'

const SAMPLE_RATE = 16000
const RMS_THRESHOLD = 0.018
const SILENCE_MS = 200
const CHUNK_MS = 30
const PARTIAL_UI_MS = 100

function SpeakDetector({ task, onTaskComplete, timeLimit }) {
    const setSfx = useSetAtom(sfxAtom)
    const speakAllowed = useAtomValue(speakRecognitionAllowedAtom)
    const allowedRef = useRef(true)
    useEffect(() => {
        allowedRef.current = speakAllowed
    }, [speakAllowed])

    const segments = useMemo(() => splitSpeakSegments(task.phrase || ''), [task.phrase])
    const isLong = task.speakMode === SpeakMode.LONG
    const repeatTarget = task.repeat || 1

    /** loading: awaiting sherpa-onnx; ready: model usable; failed: load error or model not ready */
    const [modelLoadState, setModelLoadState] = useState(() => (isSherpaOnnxReady() ? 'ready' : 'loading'))
    const [partialUi, setPartialUi] = useState('')
    const [progressUi, setProgressUi] = useState({ pass: 0, seg: 0, units: 0 })
    const partialLastRef = useRef(0)

    const recognizerRef = useRef(null) // shared OnlineRecognizer
    const streamRef = useRef(null) // per-mount OnlineStream
    const armedRef = useRef(true)
    const silenceMsRef = useRef(0)
    const committedUtteranceRef = useRef(false)
    const earlyStableRef = useRef({ lastNormText: '', stableCount: 0 })

    const segmentIdxRef = useRef(0)
    const passCountRef = useRef(0)
    const successfulSegmentsRef = useRef(0)

    const completedRef = useRef(false)
    const taskRef = useRef(task)
    taskRef.current = task
    const onCompleteRef = useRef(onTaskComplete)
    onCompleteRef.current = onTaskComplete

    const segmentsRef = useRef(segments)
    segmentsRef.current = segments
    const isLongRef = useRef(isLong)
    isLongRef.current = isLong

    const processResultRef = useRef(() => {})

    processResultRef.current = (text) => {
        if (completedRef.current || !allowedRef.current) return
        if (!armedRef.current) return
        if (!text || !text.trim()) return

        const segs = segmentsRef.current
        const idx = segmentIdxRef.current
        const targetSeg = segs[idx]
        if (!targetSeg) return
        if (!phraseMatchesTarget(text, targetSeg)) return

        // Same pattern as HitDepth (TICK every success incl. last) / HoldDepth (TOCK on completed rep): always play SFX.
        const completesLongRepetition =
            isLongRef.current && segs.length > 0 && idx === segs.length - 1
        if (completesLongRepetition) {
            setSfx('Sfx.TOCK')
        } else {
            setSfx('Sfx.TICK')
        }

        successfulSegmentsRef.current += 1
        armedRef.current = false
        silenceMsRef.current = 0
        committedUtteranceRef.current = true

        // We reset the online stream after a committed match so the next segment starts clean.
        const r = recognizerRef.current
        const s = streamRef.current
        if (r && s) {
            try {
                r.reset(s)
            } catch (e) {
                /* ignore */
            }
        }

        if (isLongRef.current) {
            segmentIdxRef.current += 1
            if (segmentIdxRef.current >= segs.length) {
                segmentIdxRef.current = 0
                passCountRef.current += 1
            }
        } else {
            passCountRef.current += 1
        }

        setProgressUi({
            pass: passCountRef.current,
            seg: segmentIdxRef.current,
            units: successfulSegmentsRef.current,
        })

        if (passCountRef.current >= repeatTarget) {
            if (completedRef.current) return
            completedRef.current = true
            const t = taskRef.current
            const summary = generateSummarySPEAK(t, {
                successfulSegments: successfulSegmentsRef.current,
                timedOut: false,
            })
            onCompleteRef.current(summary, true)
        }
    }

    useEffect(() => {
        let cancelled = false

        ;(async () => {
            try {
                await audioProcessingService.ensureAudioContext()
                const { recognizer } = await getSherpaOnnxReadyPromise()
                if (cancelled) return
                setModelLoadState('ready')

                recognizerRef.current = recognizer
                const stream = recognizer.createStream()
                streamRef.current = stream

                await audioProcessingService.connectSpeakPcmTap(({ pcm, rms }) => {
                    if (cancelled || completedRef.current) return
                    if (!allowedRef.current || !recognizerRef.current || !streamRef.current) return

                    const r = recognizerRef.current
                    if (!r) return
                    const s = streamRef.current
                    if (!s) return

                    if (!armedRef.current) {
                        if (rms < RMS_THRESHOLD) {
                            silenceMsRef.current += CHUNK_MS
                        } else {
                            silenceMsRef.current = 0
                        }
                        if (silenceMsRef.current >= SILENCE_MS) {
                            armedRef.current = true
                            silenceMsRef.current = 0
                            committedUtteranceRef.current = false
                            earlyStableRef.current = { lastNormText: '', stableCount: 0 }
                        }
                    }

                    if (!armedRef.current) return

                    const copy = new Float32Array(pcm.length)
                    copy.set(pcm)
                    try {
                        s.acceptWaveform(SAMPLE_RATE, copy)
                        while (r.isReady(s)) {
                            r.decode(s)
                        }
                    } catch (e) {
                        // If WASM throws for any reason, fail closed.
                        return
                    }

                    // Read current hypothesis (used for partial UI + optional early accept).
                    let text = ''
                    try {
                        text = r.getResult(s)?.text ?? ''
                    } catch (e) {
                        text = ''
                    }

                    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
                    if (now - partialLastRef.current >= PARTIAL_UI_MS) {
                        partialLastRef.current = now
                        setPartialUi(text)
                    }

                    // Optional early accept: require stable containment across 2 throttled ticks.
                    if (!committedUtteranceRef.current && text) {
                        const segs = segmentsRef.current
                        const idx = segmentIdxRef.current
                        const targetSeg = segs[idx]
                        if (targetSeg) {
                            const normText = normalizeSpeakText(text || '')
                            const normTarget = normalizeSpeakText(targetSeg || '')
                            const containsTarget = normTarget && normText.includes(normTarget)
                            const lengthOk = normText.length >= Math.max(8, normTarget.length)

                            if (containsTarget && lengthOk) {
                                const prev = earlyStableRef.current
                                const nextStableCount =
                                    prev.lastNormText === normText ? prev.stableCount + 1 : 1
                                earlyStableRef.current = { lastNormText: normText, stableCount: nextStableCount }

                                if (nextStableCount >= 2 && phraseMatchesTarget(text, targetSeg)) {
                                    processResultRef.current(text)
                                }
                            } else {
                                earlyStableRef.current = { lastNormText: '', stableCount: 0 }
                            }
                        }
                    }

                    // Canonical endpoint-based scoring: only score on endpoint unless early accept already committed.
                    let isEndpoint = false
                    try {
                        isEndpoint = r.isEndpoint(s)
                    } catch (e) {
                        isEndpoint = false
                    }

                    if (isEndpoint) {
                        if (!committedUtteranceRef.current) {
                            processResultRef.current(text)
                        }
                        try {
                            r.reset(s)
                        } catch (e) {
                            /* ignore */
                        }
                        committedUtteranceRef.current = false
                        earlyStableRef.current = { lastNormText: '', stableCount: 0 }
                    }
                })
            } catch (e) {
                console.error('SpeakDetector init failed', e)
                if (!cancelled) setModelLoadState('failed')
            }
        })()

        return () => {
            cancelled = true
            // Do not setSfx QUIET here: pausing unmounts this component like task change, and QUIET is audible.
            audioProcessingService.disconnectSpeakPcmTap()
            const s = streamRef.current
            if (s) {
                try {
                    s.free()
                } catch (e) {
                    /* ignore */
                }
            }
            recognizerRef.current = null
            streamRef.current = null
        }
    }, [task.id, setSfx])

    useEffect(() => {
        const tl = timeLimit ?? 60
        const t = setTimeout(() => {
            if (completedRef.current) return
            completedRef.current = true
            const tsk = taskRef.current
            const summary = generateSummarySPEAK(tsk, {
                successfulSegments: successfulSegmentsRef.current,
                timedOut: true,
            })
            const success = passCountRef.current >= (tsk.repeat || 1)
            onCompleteRef.current(summary, success)
        }, Math.max(1, tl) * 1000)
        return () => clearTimeout(t)
    }, [timeLimit, task.id])

    const help = task.helpText

    return (
        <div className="speak-detector">
            {help ? (
                <p className="help margin-y-sm margin-y-top row-centered speak-detector-help">{help}</p>
            ) : null}
            <div className={`column-centered margin-y${help ? '' : ' margin-y-top'}`}>
                <h6 className="margin-y-sm">
                    {isLong ? (
                        <>
                            Progress: sentence {Math.min(progressUi.seg + 1, segments.length)} of {segments.length}{' '}
                            · pass {Math.min(progressUi.pass + 1, repeatTarget)} / {repeatTarget}
                        </>
                    ) : (
                        <>
                            Progress: {Math.min(progressUi.pass, repeatTarget)} / {repeatTarget}
                        </>
                    )}
                </h6>
                <p className="help margin-y-sm">Score units: {progressUi.units}</p>
                {modelLoadState === 'loading' && (
                    <p className="help margin-y-sm">Loading speech model…</p>
                )}
                {modelLoadState === 'failed' && (
                    <p className="help margin-y-sm">
                        Speech model failed to load. Check the console and that{' '}
                        <code>public/asr/</code> contains the sherpa-onnx WASM assets (the <code>.js</code>,{' '}
                        <code>.wasm</code>, and <code>.data</code> files) and they are served as static files.
                    </p>
                )}
                {modelLoadState === 'ready' && !speakAllowed && (
                    <p className="help margin-y-sm">Wait for instruction…</p>
                )}
            </div>
            {partialUi ? (
                <p className="row-centered help margin-y-sm" style={{ fontStyle: 'italic' }}>
                    {partialUi}
                </p>
            ) : null}
        </div>
    )
}

export default SpeakDetector
