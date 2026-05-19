import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { AUDIO } from '../Tasks/audio';
import { useSetAtom } from 'jotai';
import { feedbackAtom, sfxAtom } from '../../atoms/audioAtom';
import useTiming from '../../hooks/useTiming';
import { Tempo, getTempoState } from '../Tasks/task';

// Constants
const HOLD_THRESHOLD = 3; // 2 seconds threshold for holds
const HOLD_INCREMENT = 0.5; // Increment hold time every 0.5 seconds

function EndlessDive() {
    // atoms
    const setSfx = useSetAtom(sfxAtom);
    const setFeedback = useSetAtom(feedbackAtom);

    // hook for dive state
    const diveState = useTiming();

    // State tracking
    const [hasStarted, setHasStarted] = useState(false);
    const [movements, setMovements] = useState([]);
    const [timeHold, setTimeHold] = useState(0);

    // Track dive motion
    const [motion, setMotion] = useState({
        up: 0,
        down: 0,
        upTempo: 0,
        downTempo: 0,
        dir: 'rest',
        holdTime: 0  // Add holdTime to track time at depth
    });

    // Refs for hold tracking
    const holdStartTimeRef = useRef(null);
    const lastIncrementTimeRef = useRef(null);
    const animationFrameRef = useRef(null);

    // Check if diving has started
    useEffect(() => {
        if (!hasStarted && diveState.current > 0) {
            setHasStarted(true);
        }
    }, [diveState.current, hasStarted]);

    // Track dive motion and calculate tempo
    useEffect(() => {
        // we where resting, do nothing until we start descending
        if (diveState.current > 0 && motion.dir === 'rest') {
            // basically reset with 1 being the up position
            setMotion({ up: 1, down: 0, upTempo: 0, downTempo: 0, dir: 'down', holdTime: 0 });
        }
        // we're ascending now - calculate what was the down tempo
        else if (diveState.current < diveState.previous && motion.dir === 'down') {
            let downDepth = diveState.previous;
            let tempo = calculateTempo(motion.up + 1, downDepth, diveState.previousDurations);
            // Store the current hold time before resetting
            setMotion({ ...motion, down: downDepth, downTempo: tempo, dir: 'up', holdTime: timeHold });
            // Reset hold time when ascending
            setTimeHold(0);
            holdStartTimeRef.current = null;
            lastIncrementTimeRef.current = null;
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        }
        // we're descending now - calculate what was the up tempo
        else if (diveState.current > diveState.previous && motion.dir === 'up') {
            let upDepth = diveState.previous;
            let tempo = calculateTempo(upDepth, motion.down - 1, diveState.previousDurations);
            setMotion({ ...motion, up: diveState.previous, upTempo: tempo, dir: 'down', holdTime: 0 });
        }
    }, [diveState]);

    // Track holds using animation frame
    useEffect(() => {
        if (diveState.current > 0) {
            const updateHoldTime = () => {
                const now = performance.now();

                // Initialize hold tracking if not started
                if (!holdStartTimeRef.current) {
                    holdStartTimeRef.current = now;
                    lastIncrementTimeRef.current = now;
                }

                const timeAtDepth = (now - holdStartTimeRef.current) / 1000; // Convert to seconds

                // If we've passed the threshold and it's time for an increment
                if (timeAtDepth >= HOLD_THRESHOLD &&
                    (!lastIncrementTimeRef.current ||
                        (now - lastIncrementTimeRef.current) / 1000 >= HOLD_INCREMENT)) {
                    setTimeHold(prev => prev + HOLD_INCREMENT);
                    lastIncrementTimeRef.current = now;
                }

                animationFrameRef.current = requestAnimationFrame(updateHoldTime);
            };

            animationFrameRef.current = requestAnimationFrame(updateHoldTime);
        } else {
            // Reset hold tracking when at surface
            setTimeHold(0);
            holdStartTimeRef.current = null;
            lastIncrementTimeRef.current = null;
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [diveState.current]);

    // Record movements when completing a dive
    useEffect(() => {
        if (motion.dir === 'up') {
            // If we held at depth for 2 or more seconds, record it as a hold
            if (motion.holdTime >= HOLD_THRESHOLD) {
                const movement = {
                    type: 'hold',
                    depth: motion.down,
                    duration: motion.holdTime,
                    timestamp: performance.now()
                };
                setMovements(prev => [...prev, movement]);
            } else {
                // Calculate average tempo for regular dive
                let avgTempo = motion.upTempo + motion.downTempo;
                if (motion.upTempo !== 0) {
                    avgTempo /= 2;
                }

                const movement = {
                    type: 'dive',
                    startDepth: motion.up,
                    endDepth: motion.down,
                    tempo: avgTempo,
                    tempoState: getTempoState(avgTempo),
                    timestamp: performance.now()
                };
                setMovements(prev => [...prev, movement]);
            }
        }
    }, [motion]);

    // Calculate tempo in BPM
    function calculateTempo(minDepth, maxDepth, previousDurations) {
        let sumTempo = 0;
        for (let i = minDepth; i <= maxDepth; i++) {
            if (previousDurations[i]) {
                sumTempo += previousDurations[i];
            }
        }
        // convert to beats per minutes
        return 60000 / sumTempo;
    }

    // Calculate average tempo for display
    let avgTempo = motion.upTempo + motion.downTempo;
    if (motion.upTempo !== 0) {
        avgTempo /= 2;
    }

    return (
        <div>
            <div className="column-centered">
                <h4 className='margin-y-sm'>
                    Current State: {motion.dir}
                </h4>
                <h4 className='margin-y-sm'>
                    Current Depth: {diveState.current}
                </h4>
                <h4 className='margin-y-sm'>
                    Tempo: {avgTempo.toFixed(0)}bpm {getTempoState(avgTempo)}
                </h4>
                {timeHold > 0 && (
                    <h4 className='margin-y-sm'>
                        Hold Time: {timeHold.toFixed(1)}s
                    </h4>
                )}
                <div className="margin-y-sm">
                    <h5>Recent Movements:</h5>
                    {movements.slice(-5).reverse().map((movement, index) => (
                        <div key={index} className="margin-y-xs">
                            {movement.type === 'hold'
                                ? `Hold at depth ${movement.depth} for ${movement.duration.toFixed(1)}s`
                                : `Dive from ${movement.startDepth} to ${movement.endDepth} (${movement.tempo.toFixed(0)}bpm ${movement.tempoState})`
                            }
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default EndlessDive; 