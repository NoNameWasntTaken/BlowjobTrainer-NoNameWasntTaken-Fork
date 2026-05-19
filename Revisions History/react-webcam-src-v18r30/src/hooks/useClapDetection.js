import { useState, useEffect, useRef } from 'react'
import { useAtom, useAtomValue } from 'jotai'
import { micInputDeviceIdAtom, taskInstructionVoicePhaseAtom } from '../atoms/audioAtom'
import { clapSensitivityAtom } from '../atoms/markersAtoms'
import { audioProcessingService } from '../services/audioProcessingService'
import { buildMicAudioConstraints } from '../utils/micCaptureConstraints'

const MIN_INTERVAL_BETWEEN_CLAPS = 500 // Minimum time (ms) between claps

/** Tier A impulse: slow EMA baseline on high band so lifted noise floor is tracked; fire on residual + rise. */
const BASELINE_ALPHA = 0.05
const WARMUP_FRAMES = 18
/** User sensitivity thr (0–1) maps to minimum residual above baseline: residual > thr × scale */
const RESIDUAL_THRESHOLD_SCALE = 0.42
/** Minimum upward step vs previous frame: rise > thr × RISE_SCALE + RISE_FLOOR */
const RISE_SCALE = 0.065
const RISE_FLOOR = 0.004
/** Canvas bar caps residual display (same units as normalized band average 0–~1) */
const RESIDUAL_VISUAL_CAP = 0.38

/** @typedef {'own' | 'gameplay'} MicLifecycle */

const FREQ_BANDS = {
    LOW: { start: 0, end: 7 },
    MID: { start: 8, end: 15 },
    HIGH: { start: 16, end: 30 },
    VERY_HIGH: { start: 31, end: 50 },
}

function getFreqBandAverage(dataArray, start, end) {
    let sum = 0
    for (let i = start; i <= end; i++) {
        sum += dataArray[i]
    }
    return sum / (end - start + 1) / 256
}

/**
 * Hook for clap detection via microphone. Uses LMS-processed analyser tap (post echo reduction).
 * Tier A: moving baseline on the high band, fire when residual and frame-to-frame rise exceed thresholds derived from sensitivity (plus debounce).
 * @param {boolean} micEnabled When false, mic is not opened (e.g. calibration tab toggle).
 * @param {MicLifecycle} micLifecycle Own: full mic lifecycle. Gameplay: shared session from gameplayMicSession — never disconnectMic on unmount.
 */
export function useClapDetection(onClap, _isCalibration = false, micEnabled = true, micLifecycle = 'own') {
    const micInputDeviceId = useAtomValue(micInputDeviceIdAtom)
    const instructionPhase = useAtomValue(taskInstructionVoicePhaseAtom)
    const [currentThreshold] = useAtom(clapSensitivityAtom)
    const thresholdRef = useRef(currentThreshold)
    thresholdRef.current = currentThreshold

    const [freqData, setFreqData] = useState({
        low: 0,
        mid: 0,
        high: 0,
        veryHigh: 0,
        residual: 0,
        rise: 0,
        baseline: 0,
    })
    const canvasRef = useRef(null)
    const onClapRef = useRef(onClap)
    const lastClapTimeRef = useRef(0)
    const baselineHighRef = useRef(0)
    const prevHighRef = useRef(0)
    const detectionFrameRef = useRef(0)

    /** When gameplay mic is shared, suppress claps during instruction lifecycle (Speak uses same atom phases). */
    const instructionBlockingClapsRef = useRef(false)
    instructionBlockingClapsRef.current =
        micLifecycle === 'gameplay' &&
        (instructionPhase === 'pending' ||
            instructionPhase === 'playing' ||
            instructionPhase === 'cooldown')

    onClapRef.current = onClap

    useEffect(() => {
        if (!micEnabled) {
            setFreqData({ low: 0, mid: 0, high: 0, veryHigh: 0, residual: 0, rise: 0, baseline: 0 })
            if (micLifecycle === 'own') {
                audioProcessingService.disconnectMic()
            }
            return () => {}
        }

        let cancelled = false
        const abortController = new AbortController()
        let animationFrameId
        let dataArray

        const runDetectLoop = (analyser) => {
            dataArray = new Uint8Array(analyser.frequencyBinCount)
            detectionFrameRef.current = 0
            baselineHighRef.current = 0
            prevHighRef.current = 0

            const detectSound = () => {
                if (cancelled) return
                analyser.getByteFrequencyData(dataArray)
                const freqBands = {
                    low: getFreqBandAverage(dataArray, FREQ_BANDS.LOW.start, FREQ_BANDS.LOW.end),
                    mid: getFreqBandAverage(dataArray, FREQ_BANDS.MID.start, FREQ_BANDS.MID.end),
                    high: getFreqBandAverage(dataArray, FREQ_BANDS.HIGH.start, FREQ_BANDS.HIGH.end),
                    veryHigh: getFreqBandAverage(dataArray, FREQ_BANDS.VERY_HIGH.start, FREQ_BANDS.VERY_HIGH.end),
                }

                const high = freqBands.high
                detectionFrameRef.current += 1
                const frameIdx = detectionFrameRef.current

                if (frameIdx === 1) {
                    baselineHighRef.current = high
                } else {
                    baselineHighRef.current =
                        BASELINE_ALPHA * high + (1 - BASELINE_ALPHA) * baselineHighRef.current
                }

                const residual = high - baselineHighRef.current
                const rise = Math.max(0, high - prevHighRef.current)
                prevHighRef.current = high

                const thr = thresholdRef.current
                const residualThr = thr * RESIDUAL_THRESHOLD_SCALE
                const riseThr = thr * RISE_SCALE + RISE_FLOOR
                const warmupDone = frameIdx >= WARMUP_FRAMES

                setFreqData({
                    ...freqBands,
                    residual,
                    rise,
                    baseline: baselineHighRef.current,
                })

                if (
                    warmupDone &&
                    residual > residualThr &&
                    rise > riseThr &&
                    !instructionBlockingClapsRef.current
                ) {
                    const now = Date.now()
                    if (now - lastClapTimeRef.current > MIN_INTERVAL_BETWEEN_CLAPS) {
                        lastClapTimeRef.current = now
                        onClapRef.current?.()
                    }
                }

                if (canvasRef.current) {
                    const canvas = canvasRef.current
                    const ctx2d = canvas.getContext('2d')
                    ctx2d.clearRect(0, 0, canvas.width, canvas.height)
                    const barFrac = Math.min(1, Math.max(0, residual / RESIDUAL_VISUAL_CAP))
                    const height = barFrac * canvas.height
                    ctx2d.fillStyle = '#33C3F0'
                    ctx2d.fillRect(0, canvas.height - height, canvas.width, height)
                    const thrFrac = Math.min(1, residualThr / RESIDUAL_VISUAL_CAP)
                    ctx2d.strokeStyle = '#ff0000'
                    ctx2d.beginPath()
                    ctx2d.moveTo(0, canvas.height - thrFrac * canvas.height)
                    ctx2d.lineTo(canvas.width, canvas.height - thrFrac * canvas.height)
                    ctx2d.stroke()
                }

                animationFrameId = requestAnimationFrame(detectSound)
            }

            detectSound()
        }

        const resolveAnalyserWithRetry = async () => {
            let analyser = audioProcessingService.getAnalyserNode()
            if (!analyser) {
                await new Promise((r) => requestAnimationFrame(r))
                if (cancelled) return null
                analyser = audioProcessingService.getAnalyserNode()
            }
            return analyser
        }

        const initAudio = async () => {
            try {
                const ctx = await audioProcessingService.ensureAudioContext()
                await ctx.resume()
                if (cancelled) return

                if (micLifecycle === 'gameplay') {
                    const analyser = await resolveAnalyserWithRetry()
                    if (cancelled) return
                    if (!analyser) {
                        const msg = 'Clap detection could not access the audio analyser.'
                        console.error(msg)
                        window.alert(msg)
                        return
                    }
                    runDetectLoop(analyser)
                    return
                }

                let stream
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        audio: buildMicAudioConstraints(micInputDeviceId),
                        signal: abortController.signal,
                    })
                } catch (err) {
                    if (err.name === 'AbortError') return
                    throw err
                }
                if (cancelled) {
                    stream.getTracks().forEach((t) => t.stop())
                    return
                }

                audioProcessingService.connectMic(stream)
                if (!audioProcessingService.getMicConnected()) {
                    throw new Error('Microphone could not be connected to the audio graph')
                }
                if (cancelled) {
                    audioProcessingService.disconnectMic()
                    return
                }

                const analyser = audioProcessingService.getAnalyserNode()
                if (!analyser) {
                    const msg = 'Clap detection could not access the audio analyser.'
                    console.error(msg)
                    window.alert(msg)
                    return
                }
                if (cancelled) {
                    audioProcessingService.disconnectMic()
                    return
                }
                runDetectLoop(analyser)
            } catch (error) {
                if (error.name === 'AbortError') return
                console.error('Error accessing microphone:', error)
            }
        }

        initAudio()

        return () => {
            cancelled = true
            abortController.abort()
            if (animationFrameId) cancelAnimationFrame(animationFrameId)
            if (micLifecycle === 'own') {
                audioProcessingService.disconnectMic()
            }
        }
    }, [micEnabled, micLifecycle, micInputDeviceId])

    useEffect(() => {
        if (micEnabled || !canvasRef.current) return
        const canvas = canvasRef.current
        const ctx2d = canvas.getContext('2d')
        ctx2d.clearRect(0, 0, canvas.width, canvas.height)
        const residualThr = currentThreshold * RESIDUAL_THRESHOLD_SCALE
        const thrFrac = Math.min(1, residualThr / RESIDUAL_VISUAL_CAP)
        ctx2d.strokeStyle = '#ff0000'
        ctx2d.beginPath()
        ctx2d.moveTo(0, canvas.height - thrFrac * canvas.height)
        ctx2d.lineTo(canvas.width, canvas.height - thrFrac * canvas.height)
        ctx2d.stroke()
    }, [micEnabled, currentThreshold])

    return { freqData, canvasRef }
}
