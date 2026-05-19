import { useState, useEffect, useRef } from 'react'
import { useAtom, useAtomValue } from 'jotai'
import { micInputDeviceIdAtom } from '../atoms/audioAtom'
import { clapSensitivityAtom } from '../atoms/markersAtoms'
import { audioProcessingService } from '../services/audioProcessingService'
import { buildMicAudioConstraints } from '../utils/micCaptureConstraints'

const MIN_INTERVAL_BETWEEN_CLAPS = 500 // Minimum time (ms) between claps

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
 * @param {boolean} micEnabled When false, mic is not opened (e.g. calibration tab toggle).
 * @param {MicLifecycle} micLifecycle Own: full mic lifecycle. Gameplay: shared session from gameplayMicSession — never disconnectMic on unmount.
 */
export function useClapDetection(onClap, _isCalibration = false, micEnabled = true, micLifecycle = 'own') {
    const micInputDeviceId = useAtomValue(micInputDeviceIdAtom)
    const [currentThreshold] = useAtom(clapSensitivityAtom)
    const thresholdRef = useRef(currentThreshold)
    thresholdRef.current = currentThreshold

    const [freqData, setFreqData] = useState({
        low: 0,
        mid: 0,
        high: 0,
        veryHigh: 0,
    })
    const canvasRef = useRef(null)
    const onClapRef = useRef(onClap)
    const lastClapTimeRef = useRef(0)

    onClapRef.current = onClap

    useEffect(() => {
        if (!micEnabled) {
            setFreqData({ low: 0, mid: 0, high: 0, veryHigh: 0 })
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

            const detectSound = () => {
                if (cancelled) return
                analyser.getByteFrequencyData(dataArray)
                const freqBands = {
                    low: getFreqBandAverage(dataArray, FREQ_BANDS.LOW.start, FREQ_BANDS.LOW.end),
                    mid: getFreqBandAverage(dataArray, FREQ_BANDS.MID.start, FREQ_BANDS.MID.end),
                    high: getFreqBandAverage(dataArray, FREQ_BANDS.HIGH.start, FREQ_BANDS.HIGH.end),
                    veryHigh: getFreqBandAverage(dataArray, FREQ_BANDS.VERY_HIGH.start, FREQ_BANDS.VERY_HIGH.end),
                }
                setFreqData(freqBands)

                const thr = thresholdRef.current
                if (freqBands.high > thr) {
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
                    const height = freqBands.high * canvas.height
                    ctx2d.fillStyle = '#33C3F0'
                    ctx2d.fillRect(0, canvas.height - height, canvas.width, height)
                    ctx2d.strokeStyle = '#ff0000'
                    ctx2d.beginPath()
                    ctx2d.moveTo(0, canvas.height - (thr * canvas.height))
                    ctx2d.lineTo(canvas.width, canvas.height - (thr * canvas.height))
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
        ctx2d.strokeStyle = '#ff0000'
        ctx2d.beginPath()
        ctx2d.moveTo(0, canvas.height - (currentThreshold * canvas.height))
        ctx2d.lineTo(canvas.width, canvas.height - (currentThreshold * canvas.height))
        ctx2d.stroke()
    }, [micEnabled, currentThreshold])

    return { freqData, canvasRef }
}
