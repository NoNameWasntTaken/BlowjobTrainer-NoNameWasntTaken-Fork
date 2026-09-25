import React, { useState, useEffect, useCallback } from 'react'
import { useAtom, useSetAtom } from 'jotai'
import { feedbackAtom } from '../../atoms/audioAtom'
import { clapSensitivityAtom, micAudioTestModeAtom } from '../../atoms/markersAtoms'
import { generateSummaryCLAP } from '../Tasks/taskSummary'
import { useClapDetection } from '../../hooks/useClapDetection'
import { useButtplug } from '../../hooks/useButtplug'
import InstructionPhaseBanner from './InstructionPhaseBanner'

// 3 per clap?
export const POINTS_PER_CLAP = 3;
export const POINTS_PER_HARD_CLAP = 4;

const ADJUST = 0.02;
const ADJUST_HUMAN = 2; // easier to read

function ClapDetector({
    targetClaps,
    onTaskComplete,
    timeLimit,
    isCalibration = false,
    disableClapTestToggle = false,
    hasInstructionAudio = true,
}) {
    const [claps, setClaps] = useState(0)
    const [micAudioTestMode, setMicAudioTestMode] = useAtom(micAudioTestModeAtom)
    const [currentThreshold, setCurrentThreshold] = useAtom(clapSensitivityAtom)
    const [lastFeedbackClap, setLastFeedbackClap] = useState(0)
    const [nextFeedbackIn, setNextFeedbackIn] = useState(Math.floor(Math.random() * 4) + 3) // Random between 4-6
    const setFeedback = useSetAtom(feedbackAtom)
    const { adjustVibration, stopVibration } = useButtplug()

    useEffect(() => () => {
        stopVibration()
    }, [stopVibration])

    const incrementThreshold = useCallback(() => {
        setCurrentThreshold(prev => Math.min(1, prev + ADJUST))
    }, [setCurrentThreshold])

    const decrementThreshold = useCallback(() => {
        setCurrentThreshold(prev => Math.max(0, prev - ADJUST))
    }, [setCurrentThreshold])

    const handleClap = useCallback(() => {
        setClaps(prev => {
            const newCount = prev + 1

            // Buttplug: gameplay only (+0.05 per counted clap; skip calibration and post-target spikes)
            if (!isCalibration && prev < targetClaps) {
                adjustVibration(0.05)
            }

            if (!isCalibration && newCount > lastFeedbackClap + nextFeedbackIn && targetClaps - newCount > 2) {
                setFeedback("Clap.KEEPGOING")
                setLastFeedbackClap(newCount)
                setNextFeedbackIn(Math.floor(Math.random() * 3) + 4)
            }

            if (newCount === targetClaps) {
                const summary = generateSummaryCLAP(targetClaps, newCount)
                onTaskComplete(summary, true)
            }
            return newCount
        })
    }, [targetClaps, onTaskComplete, setFeedback, isCalibration, lastFeedbackClap, nextFeedbackIn, adjustVibration])

    const micEnabledForClap = !isCalibration || micAudioTestMode === 'clap'
    const { freqData, canvasRef } = useClapDetection(
        handleClap,
        isCalibration,
        micEnabledForClap,
        isCalibration ? 'own' : 'gameplay'
    )

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
            <div className="row-centered margin-y-top">
                <h3>{isCalibration ? "Clap Detection" : "Clap Detection"}</h3>
            </div>
            <div className="row-centered">
                <InstructionPhaseBanner enabled={!isCalibration} hasInstructionAudio={hasInstructionAudio} />
            </div>
            {isCalibration && <p className="help margin-y-sm"><b>Adjust the threshold </b>value below, then slap yourself (or just clap your hands). Detection uses <b>spike above noise floor</b> (residual) and <b>sharp rise</b>; keep an eye on the <b>counter</b> and meters.</p>}

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
                    <pre>frequency: {micEnabledForClap ? (freqData.high * 100).toFixed(0) : '—'} · residual: {micEnabledForClap ? (freqData.residual * 100).toFixed(0) : '—'} · rise: {micEnabledForClap ? (freqData.rise * 100).toFixed(0) : '—'}</pre>
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
                    <h5>Current threshold: <strong>{(currentThreshold * 100).toFixed(0)}</strong></h5>
                </div>
                <div className="row-centered margin-y-sm">
                    <button
                        type="button"
                        className={`button padding-x${micAudioTestMode === 'clap' ? ' button-primary' : ''}`}
                        disabled={disableClapTestToggle}
                        title={
                            disableClapTestToggle
                                ? 'Finish or cancel the in-progress level before using Clap Test.'
                                : undefined
                        }
                        onClick={() =>
                            setMicAudioTestMode(micAudioTestMode === 'clap' ? 'off' : 'clap')
                        }
                        aria-pressed={micAudioTestMode === 'clap'}
                    >
                        {micAudioTestMode === 'clap' ? 'Clap Test On' : 'Clap Test Off'}
                    </button>
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