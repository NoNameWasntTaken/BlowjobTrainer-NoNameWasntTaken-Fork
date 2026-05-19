import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useAtom, useSetAtom } from 'jotai'
import { feedbackAtom } from '../../atoms/audioAtom'
import { clapSensitivityAtom } from '../../atoms/markersAtoms'
import { generateSummaryCLAP } from '../Tasks/taskSummary'

const MIN_INTERVAL_BETWEEN_CLAPS = 500 // Minimum time (ms) between claps

// 3 per clap?
export const POINTS_PER_CLAP = 3;
export const POINTS_PER_HARD_CLAP = 4;

const ADJUST = 0.02;
const ADJUST_HUMAN = 2; // easier to read

// Define frequency bands (in Hz)
const FREQ_BANDS = {
    LOW: { start: 0, end: 7 },     // 0-1.2kHz
    MID: { start: 8, end: 15 },    // 1.2-2.4kHz
    HIGH: { start: 16, end: 30 },  // 2.4-5kHz
    VERY_HIGH: { start: 31, end: 50 } // 5kHz+
}

function ClapDetector({ targetClaps, onTaskComplete, timeLimit, isCalibration = false }) {
    const [claps, setClaps] = useState(0)
    const [lastClapTime, setLastClapTime] = useState(0)
    const [audioContext, setAudioContext] = useState(null)
    const [mediaStream, setMediaStream] = useState(null)
    const [currentThreshold, setCurrentThreshold] = useAtom(clapSensitivityAtom)
    const [lastFeedbackClap, setLastFeedbackClap] = useState(0)
    const [nextFeedbackIn, setNextFeedbackIn] = useState(Math.floor(Math.random() * 4) + 3) // Random between 4-6
    const [freqData, setFreqData] = useState({
        low: 0,
        mid: 0,
        high: 0,
        veryHigh: 0
    })
    const setFeedback = useSetAtom(feedbackAtom)
    const canvasRef = useRef(null)

    const playTestSound = () => {
        setFeedback("UpDown.ONE_THREE_MEDIUM")
    }

    const incrementThreshold = useCallback(() => {
        let newThreshold = currentThreshold + ADJUST
        newThreshold = Math.min(newThreshold, 1)
        setCurrentThreshold(newThreshold)
    }, [currentThreshold])

    const decrementThreshold = useCallback(() => {
        let newThreshold = currentThreshold - ADJUST
        newThreshold = Math.max(newThreshold, 0)
        setCurrentThreshold(newThreshold)
    }, [currentThreshold])

    const handleClap = useCallback(() => {
        const now = Date.now()
        if (now - lastClapTime > MIN_INTERVAL_BETWEEN_CLAPS) {
            setClaps(prev => {
                const newCount = prev + 1

                // Check if we should play feedback
                if (!isCalibration && newCount > lastFeedbackClap + nextFeedbackIn && targetClaps - newCount > 2) {
                    setFeedback("Clap.KEEPGOING")
                    setLastFeedbackClap(newCount)
                    setNextFeedbackIn(Math.floor(Math.random() * 3) + 4) // Set next feedback interval (4-6)
                }

                if (newCount === targetClaps) {
                    const summary = generateSummaryCLAP(targetClaps, newCount)
                    onTaskComplete(summary, true)
                }
                return newCount
            })
            setLastClapTime(now)
        }
    }, [lastClapTime, targetClaps, onTaskComplete, setFeedback, isCalibration, lastFeedbackClap, nextFeedbackIn])

    // Function to calculate average for a frequency band
    const getFreqBandAverage = (dataArray, start, end) => {
        let sum = 0
        for (let i = start; i <= end; i++) {
            sum += dataArray[i]
        }
        return sum / (end - start + 1) / 256 // Normalize to 0-1
    }

    useEffect(() => {
        let analyser
        let dataArray
        let animationFrameId

        const initAudio = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                const context = new (window.AudioContext || window.webkitAudioContext)()
                const source = context.createMediaStreamSource(stream)
                analyser = context.createAnalyser()

                analyser.fftSize = 256
                source.connect(analyser)
                dataArray = new Uint8Array(analyser.frequencyBinCount)

                setAudioContext(context)
                setMediaStream(stream)

                const detectSound = () => {
                    analyser.getByteFrequencyData(dataArray)

                    // Calculate averages for each frequency band
                    const freqBands = {
                        low: getFreqBandAverage(dataArray, FREQ_BANDS.LOW.start, FREQ_BANDS.LOW.end),
                        mid: getFreqBandAverage(dataArray, FREQ_BANDS.MID.start, FREQ_BANDS.MID.end),
                        high: getFreqBandAverage(dataArray, FREQ_BANDS.HIGH.start, FREQ_BANDS.HIGH.end),
                        veryHigh: getFreqBandAverage(dataArray, FREQ_BANDS.VERY_HIGH.start, FREQ_BANDS.VERY_HIGH.end)
                    }
                    setFreqData(freqBands)

                    // Trigger clap if high frequencies are strong and low frequencies are relatively weak
                    if (freqBands.high > currentThreshold) {
                        handleClap()
                    }

                    // Draw frequency visualization
                    const canvas = canvasRef.current
                    if (canvas) {
                        const ctx = canvas.getContext('2d')
                        ctx.clearRect(0, 0, canvas.width, canvas.height)

                        // Draw only high frequency band
                        const height = freqBands.high * canvas.height
                        ctx.fillStyle = '#33C3F0'  // Red color for high frequency
                        ctx.fillRect(0, canvas.height - height, canvas.width, height)

                        // Draw threshold line
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
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId)
            }
            if (audioContext) {
                audioContext.close()
            }
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop())
            }
        }
    }, [currentThreshold, handleClap])

    // Add timer effect only when not in calibration mode
    useEffect(() => {
        if (isCalibration) return

        const timer = setTimeout(() => {
            const summary = generateSummaryCLAP(targetClaps, claps)
            onTaskComplete(summary, false)
        }, timeLimit * 1000)

        return () => clearTimeout(timer)
    }, [timeLimit, claps, targetClaps, onTaskComplete, isCalibration])

    return (
        <div className="clap-detector">
            <div className="row-centered">
                <h2>{isCalibration ? "Calibrate Clap Detection" : "Clap Detection"}</h2>
            </div>
            {isCalibration && <p className="help margin-y-sm"><b>Adjust the threshold </b>value below and then give yourself a slaps/claps.  Keep an eye on the <b>counter</b> to see what seems correct. </p>}

            {/* always show claps detected */}
            {/* but in calibration mode, hide the target claps */}
            <div className="row-centered margin-y">
                <h5>Claps detected: <b>{claps}</b> {isCalibration ? "" : ` / ${targetClaps}`}</h5>
            </div>

            <div className="row-centered" >
                <canvas
                    ref={canvasRef}
                    width={200}
                    height={100}
                    style={{
                        border: '1px solid #ccc',
                        backgroundColor: '#f5f5f5'
                    }}
                />
            </div>
            {isCalibration && <>
                <div className="row-centered">
                    <pre>frequency reading: {(freqData.high * 100).toFixed(0)}</pre>
                </div>
                <div className="row-centered maring-y" >
                    <button
                        className="button"
                        onClick={incrementThreshold}
                    >
                        Increase Threshold (+{ADJUST_HUMAN})
                    </button>
                    <button
                        className="button"
                        onClick={decrementThreshold}
                    >
                        Decrease Threshold (-{ADJUST_HUMAN})
                    </button>
                </div>
                <div className="row-centered">
                    <h4>Current threshold: <strong>{(currentThreshold * 100).toFixed(0)}</strong></h4>
                </div>
                <div className="row-centered">
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#666' }}>
                        {/* <pre>Low: {freqData.low.toFixed(2)}</pre>
                    <pre>Mid: {freqData.mid.toFixed(2)}</pre> */}
                        {/* <pre>High: {freqData.high.toFixed(2)}</pre> */}
                        {/* <pre>VHigh: {freqData.veryHigh.toFixed(2)}</pre> */}
                    </div>
                </div>
            </>}
        </div>
    )
}

export default ClapDetector 