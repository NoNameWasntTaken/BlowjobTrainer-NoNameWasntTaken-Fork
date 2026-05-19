import { useState, useEffect, useRef } from 'react'
import { useAtom } from 'jotai'
import { clapSensitivityAtom } from '../atoms/markersAtoms'

const MIN_INTERVAL_BETWEEN_CLAPS = 500 // Minimum time (ms) between claps

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
 * Hook for clap detection via microphone. Uses ref for onClap to avoid effect re-runs
 * when the callback changes (prevents full audio pipeline re-init on every clap).
 * @param {Function} onClap - Callback when clap detected (called via ref)
 * @param {boolean} isCalibration - If true, returns freqData/canvasRef for calibration UI
 * @returns {{ freqData: object, canvasRef: React.RefObject }}
 */
export function useClapDetection(onClap, isCalibration = false) {
    const [currentThreshold] = useAtom(clapSensitivityAtom)
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
        let analyser
        let dataArray
        let animationFrameId
        let stream

        const initAudio = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                const context = new (window.AudioContext || window.webkitAudioContext)()
                const source = context.createMediaStreamSource(stream)
                analyser = context.createAnalyser()
                analyser.fftSize = 256
                source.connect(analyser)
                dataArray = new Uint8Array(analyser.frequencyBinCount)

                const detectSound = () => {
                    analyser.getByteFrequencyData(dataArray)
                    const freqBands = {
                        low: getFreqBandAverage(dataArray, FREQ_BANDS.LOW.start, FREQ_BANDS.LOW.end),
                        mid: getFreqBandAverage(dataArray, FREQ_BANDS.MID.start, FREQ_BANDS.MID.end),
                        high: getFreqBandAverage(dataArray, FREQ_BANDS.HIGH.start, FREQ_BANDS.HIGH.end),
                        veryHigh: getFreqBandAverage(dataArray, FREQ_BANDS.VERY_HIGH.start, FREQ_BANDS.VERY_HIGH.end),
                    }
                    setFreqData(freqBands)

                    if (freqBands.high > currentThreshold) {
                        const now = Date.now()
                        if (now - lastClapTimeRef.current > MIN_INTERVAL_BETWEEN_CLAPS) {
                            lastClapTimeRef.current = now
                            onClapRef.current?.()
                        }
                    }

                    if (canvasRef.current) {
                        const canvas = canvasRef.current
                        const ctx = canvas.getContext('2d')
                        ctx.clearRect(0, 0, canvas.width, canvas.height)
                        const height = freqBands.high * canvas.height
                        ctx.fillStyle = '#33C3F0'
                        ctx.fillRect(0, canvas.height - height, canvas.width, height)
                        ctx.strokeStyle = '#ff0000'
                        ctx.beginPath()
                        ctx.moveTo(0, canvas.height - (currentThreshold * canvas.height))
                        ctx.lineTo(canvas.width, canvas.height - (currentThreshold * canvas.height))
                        ctx.stroke()
                    }

                    animationFrameId = requestAnimationFrame(detectSound)
                }

                detectSound()
            } catch (error) {
                console.error('Error accessing microphone:', error)
            }
        }

        initAudio()

        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId)
            if (stream) stream.getTracks().forEach((track) => track.stop())
        }
    }, [currentThreshold])

    return { freqData, canvasRef }
}
