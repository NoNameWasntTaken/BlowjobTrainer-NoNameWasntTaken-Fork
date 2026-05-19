import { useEffect, useRef, useState } from 'react'
import { audioProcessingService } from '../services/audioProcessingService'
import {
    acquireOnlineStream,
    getSherpaOnnxReadyPromise,
    isSherpaOnnxReady,
    releaseOnlineStream,
} from '../services/sherpaOnnxPreloadService'
import { setSpeechWantsTap, setSpeakPcmChunkHandler } from '../services/speakPcmTapSession'

export const SPEAK_SAMPLE_RATE = 16000
export const SPEAK_RMS_THRESHOLD = 0.018
export const SPEAK_SILENCE_MS = 200
export const SPEAK_CHUNK_MS = 30
export const SPEAK_PARTIAL_UI_MS = 100

/**
 * Resolves when {@link audioProcessingService.getMicConnected} is true, or when `isCancelled()` is true
 * (effect cleanup) so Promise.all does not hang. Uses rAF to avoid tight polling.
 * @param {() => boolean} isCancelled
 * @returns {Promise<{ micReady: boolean }>}
 */
function waitForMicReady(isCancelled) {
    return new Promise((resolve) => {
        function step() {
            if (isCancelled()) {
                resolve({ micReady: false })
                return
            }
            if (audioProcessingService.getMicConnected()) {
                resolve({ micReady: true })
                return
            }
            requestAnimationFrame(step)
        }
        step()
    })
}

/**
 * Shared PCM → Sherpa OnlineRecognizer via speakPcmTapSession + ensureSpeakPcmTapIfWanted.
 * Does not call r.reset — the onAfterDecodeRef callback must perform all resets.
 *
 * Tap graph is owned by audioProcessingService (mic connect/disconnect); speech arming is explicit
 * so clap-only mic sessions never attach the speak worklet.
 *
 * @param {object} opts
 * @param {boolean} opts.enabled When false, disarms speech tap and clears decode handler.
 * @param {string|number} opts.resetKey Recreate Sherpa stream + chunk handler when changed; PCM tap may persist.
 * @param {React.MutableRefObject<boolean>} opts.recognitionAllowedRef
 * @param {React.MutableRefObject<boolean>} opts.completedRef
 * @param {React.MutableRefObject<((text: string) => void) | null | undefined>} opts.onPartialTextRef
 * @param {React.MutableRefObject<((args: { text: string, isEndpoint: boolean, r: object, s: object }) => void) | null | undefined>} opts.onAfterDecodeRef
 * @param {React.MutableRefObject<(() => void) | null | undefined>} [opts.onReArmedRef] Optional; invoked when re-arming after silence (e.g. clear committedUtteranceRef).
 * @returns {{ modelLoadState: 'loading'|'ready'|'failed', pcmReceived: boolean, speechPipelineLive: boolean, armedRef: React.MutableRefObject<boolean>, silenceMsRef: React.MutableRefObject<number> }}
 */
export function useSherpaMicTap({
    enabled,
    resetKey,
    recognitionAllowedRef,
    completedRef,
    onPartialTextRef,
    onAfterDecodeRef,
    onReArmedRef,
}) {
    const [modelLoadState, setModelLoadState] = useState(() =>
        isSherpaOnnxReady() ? 'ready' : 'loading'
    )
    const [pcmReceived, setPcmReceived] = useState(false)
    const [speechPipelineLive, setSpeechPipelineLive] = useState(false)

    const armedRef = useRef(true)
    const silenceMsRef = useRef(0)
    const partialLastRef = useRef(0)
    const recognizerRef = useRef(null)
    const streamRef = useRef(null)
    const pcmReceivedOnceRef = useRef(false)
    const decodeOnceRef = useRef(false)

    // Arm speech tap only while enabled; connectMic/disconnectMic attach or tear down the graph when wanted.
    useEffect(() => {
        if (enabled) {
            setSpeechWantsTap(true)
            return () => {
                setSpeechWantsTap(false)
                setSpeakPcmChunkHandler(null)
                void audioProcessingService.ensureSpeakPcmTapIfWanted()
            }
        }
        setSpeechWantsTap(false)
        setSpeakPcmChunkHandler(null)
        void audioProcessingService.ensureSpeakPcmTapIfWanted()
    }, [enabled])

    useEffect(() => {
        if (!enabled) {
            pcmReceivedOnceRef.current = false
            decodeOnceRef.current = false
            setPcmReceived(false)
            setSpeechPipelineLive(false)
            releaseOnlineStream(streamRef.current)
            streamRef.current = null
            recognizerRef.current = null
            armedRef.current = true
            silenceMsRef.current = 0
            partialLastRef.current = 0
            return
        }

        let cancelled = false

        ;(async () => {
            try {
                setModelLoadState('loading')
                pcmReceivedOnceRef.current = false
                decodeOnceRef.current = false
                setPcmReceived(false)
                setSpeechPipelineLive(false)
                const micWaitP = waitForMicReady(() => cancelled)
                const [, sherpaLoaded] = await Promise.all([
                    audioProcessingService.ensureAudioContext(),
                    getSherpaOnnxReadyPromise(),
                ])
                if (cancelled) return

                const micWait = await micWaitP
                if (cancelled) return
                if (!micWait.micReady || !audioProcessingService.getMicConnected()) {
                    return
                }

                const { recognizer } = sherpaLoaded
                if (cancelled) return
                recognizerRef.current = recognizer
                const stream = await acquireOnlineStream()
                streamRef.current = stream

                setSpeakPcmChunkHandler(({ pcm, rms }) => {
                    if (cancelled || completedRef.current) return
                    if (pcm?.length > 0 && typeof rms === 'number') {
                        if (!pcmReceivedOnceRef.current) {
                            pcmReceivedOnceRef.current = true
                            setPcmReceived(true)
                        }
                    }
                    if (!recognitionAllowedRef.current) return

                    const r = recognizerRef.current
                    const s = streamRef.current
                    if (!r || !s) return

                    if (!armedRef.current) {
                        if (rms < SPEAK_RMS_THRESHOLD) {
                            silenceMsRef.current += SPEAK_CHUNK_MS
                        } else {
                            silenceMsRef.current = 0
                        }
                        if (silenceMsRef.current >= SPEAK_SILENCE_MS) {
                            armedRef.current = true
                            silenceMsRef.current = 0
                            try {
                                onReArmedRef?.current?.()
                            } catch (e) {
                                /* ignore */
                            }
                        }
                    }

                    if (!armedRef.current) return

                    const copy = new Float32Array(pcm.length)
                    copy.set(pcm)
                    try {
                        s.acceptWaveform(SPEAK_SAMPLE_RATE, copy)
                        while (r.isReady(s)) {
                            r.decode(s)
                        }
                    } catch (e) {
                        return
                    }

                    if (!decodeOnceRef.current) {
                        decodeOnceRef.current = true
                        setSpeechPipelineLive(true)
                    }

                    let text = ''
                    try {
                        text = r.getResult(s)?.text ?? ''
                    } catch (e) {
                        text = ''
                    }

                    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
                    if (now - partialLastRef.current >= SPEAK_PARTIAL_UI_MS) {
                        partialLastRef.current = now
                        const onPartial = onPartialTextRef.current
                        if (onPartial) onPartial(text)
                    }

                    let isEndpoint = false
                    try {
                        isEndpoint = r.isEndpoint(s)
                    } catch (e) {
                        isEndpoint = false
                    }

                    const onAfter = onAfterDecodeRef.current
                    if (onAfter) {
                        onAfter({ text, isEndpoint, r, s })
                    }
                })

                await audioProcessingService.ensureSpeakPcmTapIfWanted()

                if (!cancelled) setModelLoadState('ready')
            } catch (e) {
                console.error('useSherpaMicTap init failed', e)
                if (!cancelled) setModelLoadState('failed')
            }
        })()

        return () => {
            cancelled = true
            pcmReceivedOnceRef.current = false
            decodeOnceRef.current = false
            setPcmReceived(false)
            setSpeechPipelineLive(false)
            setSpeakPcmChunkHandler(null)
            releaseOnlineStream(streamRef.current)
            streamRef.current = null
            recognizerRef.current = null
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- recognitionAllowedRef, completedRef, callback refs intentionally omitted
    }, [enabled, resetKey])

    return { modelLoadState, pcmReceived, speechPipelineLive, armedRef, silenceMsRef }
}
