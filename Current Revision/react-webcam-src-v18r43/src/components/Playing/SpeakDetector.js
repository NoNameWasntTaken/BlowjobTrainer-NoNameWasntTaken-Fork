import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { sfxAtom, speakPcmFeedAllowedAtom, speakRecognitionAllowedAtom } from '../../atoms/audioAtom'
import { useSherpaMicTap } from '../../hooks/useSherpaMicTap'
import { splitSpeakSegments } from '../../services/speakSentenceSplit'
import {
    compileSpeakSegment,
    compiledMightBeBuildingTowardMatch,
    hypothesisMatchesCompiled,
    hypothesisMatchesCompiledEndpointFuzzy,
    hypothesisMatchesCompiledNorm,
    normalizeSpeakText,
} from '../../services/speakPhraseMatcher'
import { SpeakMode } from '../Tasks/task'
import { generateSummarySPEAK } from '../Tasks/taskSummary'
import { useButtplug, stopVibrationUnlessPreserved } from '../../hooks/useButtplug'
import './SpeakDetector.css'

/** Max lines shown in “Recognized utterances” (most recent kept). */
const MAX_DISPLAYED_UTTERANCES = 10

function SpeakDetector({ task, onTaskComplete, timeLimit }) {
    const setSfx = useSetAtom(sfxAtom)
    const speakPcmFeedAllowed = useAtomValue(speakPcmFeedAllowedAtom)
    const speakMatchAllowed = useAtomValue(speakRecognitionAllowedAtom)
    const pcmFeedRef = useRef(speakPcmFeedAllowed)
    pcmFeedRef.current = speakPcmFeedAllowed
    const matchAllowedRef = useRef(speakMatchAllowed)
    matchAllowedRef.current = speakMatchAllowed

    const segments = useMemo(() => splitSpeakSegments(task.phrase || ''), [task.phrase])
    const compiledSegments = useMemo(() => segments.map((s) => compileSpeakSegment(s)), [segments])
    const isLong = task.speakMode === SpeakMode.LONG
    const repeatTarget = task.repeat || 1

    const [partialUi, setPartialUi] = useState('')
    const [progressUi, setProgressUi] = useState({ pass: 0, seg: 0, units: 0 })
    const [transcriptLines, setTranscriptLines] = useState([])

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
    const compiledSegmentsRef = useRef(compiledSegments)
    compiledSegmentsRef.current = compiledSegments
    const isLongRef = useRef(isLong)
    isLongRef.current = isLong

    const onPartialTextRef = useRef(null)
    onPartialTextRef.current = (text) => {
        setPartialUi(text)
    }

    const onReArmedRef = useRef(null)
    onReArmedRef.current = () => {
        committedUtteranceRef.current = false
        earlyStableRef.current = { lastNormText: '', stableCount: 0 }
    }

    const onAfterDecodeRef = useRef(null)

    const processResultRef = useRef(() => {})

    const { modelLoadState, pcmReceived, speechPipelineLive, armedRef, silenceMsRef } = useSherpaMicTap({
        enabled: true,
        resetKey: task.id,
        pcmFeedAllowedRef: pcmFeedRef,
        completedRef,
        onPartialTextRef,
        onAfterDecodeRef,
        onReArmedRef,
    })
    const { adjustVibration, stopVibration } = useButtplug()

    useEffect(() => () => {
        stopVibrationUnlessPreserved(stopVibration)
    }, [stopVibration])

    useEffect(() => {
        setTranscriptLines([])
        setPartialUi('')
    }, [task.id])

    processResultRef.current = (text, reset, allowEndpointFuzzy = false) => {
        if (completedRef.current || !matchAllowedRef.current) return
        if (!armedRef.current) return
        if (!text || !text.trim()) return

        const segs = segmentsRef.current
        const compiled = compiledSegmentsRef.current
        const idx = segmentIdxRef.current
        const targetSeg = segs[idx]
        const compiledSeg = compiled[idx]
        if (!targetSeg || !compiledSeg) return

        const exact = hypothesisMatchesCompiled(text, compiledSeg)
        const fuzzyOk =
            allowEndpointFuzzy &&
            Boolean(taskRef.current.speakEndpointFuzzy) &&
            hypothesisMatchesCompiledEndpointFuzzy(text, compiledSeg)
        if (!exact && !fuzzyOk) return

        const repeats = taskRef.current.repeat ?? 1
        if (isLongRef.current) {
            if (segs.length > 1) adjustVibration(0.05)
        } else if (repeats > 1) {
            adjustVibration(0.1)
        }

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

        if (typeof reset === 'function') {
            try {
                reset()
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

    onAfterDecodeRef.current = ({ text, isEndpoint, reset }) => {
        const matchOk = matchAllowedRef.current

        if (!committedUtteranceRef.current && text && matchOk) {
            const segs = segmentsRef.current
            const compiled = compiledSegmentsRef.current
            const idx = segmentIdxRef.current
            const targetSeg = segs[idx]
            const compiledSeg = compiled[idx]
            if (targetSeg && compiledSeg) {
                const normText = normalizeSpeakText(text || '')
                const mightMatch = compiledMightBeBuildingTowardMatch(normText, compiledSeg)
                const lengthOk =
                    compiledSeg.kind === 'plain'
                        ? normText.length >= Math.max(8, (compiledSeg.normalized || '').length)
                        : normText.length >= Math.max(8, compiledSeg.minMatchLen)

                if (mightMatch && lengthOk) {
                    const prev = earlyStableRef.current
                    const nextStableCount =
                        prev.lastNormText === normText ? prev.stableCount + 1 : 1
                    earlyStableRef.current = { lastNormText: normText, stableCount: nextStableCount }

                    if (nextStableCount >= 2 && hypothesisMatchesCompiledNorm(normText, compiledSeg)) {
                        processResultRef.current(text, reset, false)
                    }
                } else {
                    earlyStableRef.current = { lastNormText: '', stableCount: 0 }
                }
            }
        }

        if (isEndpoint) {
            const line = (text ?? '').trim()
            if (line) {
                setTranscriptLines((prev) => [...prev, line].slice(-MAX_DISPLAYED_UTTERANCES))
            }
            if (!committedUtteranceRef.current && matchOk) {
                processResultRef.current(text, reset, false)
                if (!committedUtteranceRef.current && Boolean(taskRef.current.speakEndpointFuzzy)) {
                    processResultRef.current(text, reset, true)
                }
            }
            try {
                reset?.()
            } catch (e) {
                /* ignore */
            }
            committedUtteranceRef.current = false
            earlyStableRef.current = { lastNormText: '', stableCount: 0 }
        }
    }

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
                {modelLoadState === 'ready' && !speakPcmFeedAllowed && (
                    <p className="help margin-y-sm">Wait for instruction…</p>
                )}
                {modelLoadState === 'ready' && speakPcmFeedAllowed && !speakMatchAllowed && (
                    <p className="help margin-y-sm">Instruction playing — preparing speech recognition…</p>
                )}
                {modelLoadState === 'ready' && speakMatchAllowed && !pcmReceived && (
                    <p className="help margin-y-sm">Waiting for microphone audio…</p>
                )}
                {modelLoadState === 'ready' && speakMatchAllowed && pcmReceived && !speechPipelineLive && (
                    <p className="help margin-y-sm">Starting recognizer…</p>
                )}
                {modelLoadState === 'ready' && speakMatchAllowed && speechPipelineLive && (
                    <p className="help margin-y-sm">Listening for your phrase…</p>
                )}
            </div>
            {transcriptLines.length > 0 && (
                <div
                    className="row-centered margin-y-sm speak-detector-transcript"
                    style={{ maxWidth: '42rem', margin: '0 auto', textAlign: 'left' }}
                >
                    <p className="help margin-y-sm" style={{ marginBottom: '0.25rem' }}>
                        Recognized utterances (end of each segment):
                    </p>
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

export default SpeakDetector
