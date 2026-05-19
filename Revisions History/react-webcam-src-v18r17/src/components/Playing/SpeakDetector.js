import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { sfxAtom, speakRecognitionAllowedAtom } from '../../atoms/audioAtom'
import { useSherpaMicTap } from '../../hooks/useSherpaMicTap'
import { splitSpeakSegments } from '../../services/speakSentenceSplit'
import { normalizeSpeakText, phraseMatchesTarget } from '../../services/speakPhraseMatcher'
import { SpeakMode } from '../Tasks/task'
import { generateSummarySPEAK } from '../Tasks/taskSummary'
import './SpeakDetector.css'

function SpeakDetector({ task, onTaskComplete, timeLimit }) {
    const setSfx = useSetAtom(sfxAtom)
    const speakAllowed = useAtomValue(speakRecognitionAllowedAtom)
    const allowedRef = useRef(speakAllowed)
    allowedRef.current = speakAllowed

    const segments = useMemo(() => splitSpeakSegments(task.phrase || ''), [task.phrase])
    const isLong = task.speakMode === SpeakMode.LONG
    const repeatTarget = task.repeat || 1

    const [partialUi, setPartialUi] = useState('')
    const [progressUi, setProgressUi] = useState({ pass: 0, seg: 0, units: 0 })

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
        recognitionAllowedRef: allowedRef,
        completedRef,
        onPartialTextRef,
        onAfterDecodeRef,
        onReArmedRef,
    })

    processResultRef.current = (text, r, s) => {
        if (completedRef.current || !allowedRef.current) return
        if (!armedRef.current) return
        if (!text || !text.trim()) return

        const segs = segmentsRef.current
        const idx = segmentIdxRef.current
        const targetSeg = segs[idx]
        if (!targetSeg) return
        if (!phraseMatchesTarget(text, targetSeg)) return

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

    onAfterDecodeRef.current = ({ text, isEndpoint, r, s }) => {
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
                        processResultRef.current(text, r, s)
                    }
                } else {
                    earlyStableRef.current = { lastNormText: '', stableCount: 0 }
                }
            }
        }

        if (isEndpoint) {
            if (!committedUtteranceRef.current) {
                processResultRef.current(text, r, s)
            }
            try {
                r.reset(s)
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
                {modelLoadState === 'ready' && !speakAllowed && (
                    <p className="help margin-y-sm">Wait for instruction…</p>
                )}
                {modelLoadState === 'ready' && speakAllowed && !pcmReceived && (
                    <p className="help margin-y-sm">Waiting for microphone audio…</p>
                )}
                {modelLoadState === 'ready' && speakAllowed && pcmReceived && !speechPipelineLive && (
                    <p className="help margin-y-sm">Starting recognizer…</p>
                )}
                {modelLoadState === 'ready' && speakAllowed && speechPipelineLive && (
                    <p className="help margin-y-sm">Listening for your phrase…</p>
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
