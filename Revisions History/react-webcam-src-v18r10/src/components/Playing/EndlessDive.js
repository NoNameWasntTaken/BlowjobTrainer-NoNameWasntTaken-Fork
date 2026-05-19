import React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSetAtom } from 'jotai';
import { feedbackAtom, sfxAtom } from '../../atoms/audioAtom';
import useTiming from '../../hooks/useTiming';
import { useTimeLimit } from '../../hooks/useTimeLimit';
import { getTempoState } from '../Tasks/task';
import { generateSummaryENDLESS } from '../Tasks/taskSummary';
import { Grade } from '../../atoms/taskAtom';
import { getDiveScore } from './Diving';
import {
    HOLD_POINTS_PER_DEPTH,
    CLAP_BONUS_BASE,
    DEPTH_CLAP_FACTOR,
    RHYTHM_BONUS_MAX,
    DIVE_WINDOW_SIZE,
    SURFACE_PENALTY,
    GRACE_INITIAL,
    GRACE_MAX,
    GRACE_RATE,
    getTempoFromBpm,
    getDepthRangeFactor,
    computeRhythmBonusMultiplier,
    computeDepthBonus
} from './endlessScoring';
import { useClapDetection } from '../../hooks/useClapDetection';
import { executableService } from '../../services/executableService';
import { ScoreList } from './Score';

// Constants
const HOLD_THRESHOLD = 3; // 2 seconds threshold for holds
const HOLD_INCREMENT = 0.5; // Increment hold time every 0.5 seconds

function EndlessDive({ task, onTaskOver, priorScore = 0 }) {
    const setFeedback = useSetAtom(feedbackAtom);
    useSetAtom(sfxAtom);

    // hook for dive state
    const diveState = useTiming();

    // State tracking
    const [hasStarted, setHasStarted] = useState(false);
    const [allScores, setAllScores] = useState([]);
    const [totals, setTotals] = useState({ hold: 0, dive: 0, clap: 0, rhythm: 0, depth: 0, penalty: 0 });
    const totalsRef = useRef({ hold: 0, dive: 0, clap: 0, rhythm: 0, depth: 0, penalty: 0 });
    const setAllScoresRef = useRef(() => {});
    const setTotalsRef = useRef(() => {});
    setAllScoresRef.current = setAllScores;
    setTotalsRef.current = setTotals;
    totalsRef.current = totals;
    const [timeHold, setTimeHold] = useState(0);

    // Track dive motion
    const [motion, setMotion] = useState({
        up: 0,
        down: 0,
        upTempo: 0,
        downTempo: 0,
        dir: 'rest',
        holdTime: 0,
        holdDuration: 0  // Full time at depth for scoring (from holdStartTimeRef)
    });

    // Refs for hold tracking
    const holdStartTimeRef = useRef(null);
    const lastIncrementTimeRef = useRef(null);
    const animationFrameRef = useRef(null);

    // Refs for handleTimeElapsed (read latest values without triggering useCallback deps)
    const holdScoresRef = useRef([]);
    const diveScoresRef = useRef([]);
    const totalHoldScoreRef = useRef(0);
    const totalDiveScoreRef = useRef(0);
    const clapBonusRef = useRef(0);
    const rhythmBonusRef = useRef(0);
    const depthBonusRef = useRef(0);
    const totalTimeHeldRef = useRef(0);
    const totalDivesRef = useRef(0);
    const countsRef = useRef({ holds: 0, dives: 0, clapsDuringHold: 0, penalties: 0, fail: 0 });
    const holdTimeByDepthRef = useRef({ 1: 0, 2: 0, 3: 0, 4: 0 });
    const divesByDepthRef = useRef({ 1: 0, 2: 0, 3: 0, 4: 0 });
    const currentHoldClapBonusRef = useRef(0);
    const diveWindowRef = useRef([]);
    const allScoresRef = useRef([]);

    const gracePeriodRef = useRef(GRACE_INITIAL);
    const tempGraceRef = useRef(0);
    const lastSurfacePenaltyTimeRef = useRef(0);
    const hasStartedRef = useRef(false);
    hasStartedRef.current = hasStarted;

    const eventIndexRef = useRef(0);
    const nextThresholdRef = useRef(null);
    const lastThresholdRef = useRef(priorScore);
    const checkScoreEventsRef = useRef(() => {});

    const checkScoreEvents = useCallback(() => {
        if (!task?.scoreEvents?.length) return;
        const events = task.scoreEvents;
        let idx = eventIndexRef.current;
        if (idx >= events.length && !task.repeatEvents) return;
        if (idx >= events.length) {
            idx = 0;
            eventIndexRef.current = 0;
        }
        const penaltyTotal = (countsRef.current.penalties || 0) * SURFACE_PENALTY;
        const totalScore = priorScore + totalHoldScoreRef.current + totalDiveScoreRef.current +
            clapBonusRef.current + rhythmBonusRef.current + depthBonusRef.current + penaltyTotal;
        if (nextThresholdRef.current == null) {
            const ev = events[idx];
            const scoreMin = ev.scoreMin ?? 0;
            const scoreMax = ev.scoreMax ?? scoreMin;
            const delta = scoreMin + Math.random() * Math.max(0, scoreMax - scoreMin);
            nextThresholdRef.current = lastThresholdRef.current + delta;
        }
        if (totalScore >= nextThresholdRef.current) {
            const ev = events[idx];
            if (ev.type === 'play_sound' && ev.soundKey) setFeedback(ev.soundKey);
            else if (ev.type === 'run_script' && ev.executablePath) {
                executableService.execute(ev.executablePath).catch(e => console.error('Event script error:', e));
            } else if (ev.type === 'add_grace') {
                const gMin = ev.graceMin ?? 1;
                const gMax = ev.graceMax ?? gMin;
                const add = gMin + Math.random() * Math.max(0, gMax - gMin);
                tempGraceRef.current = Math.min(GRACE_MAX, tempGraceRef.current + add);
            }
            lastThresholdRef.current = nextThresholdRef.current;
            eventIndexRef.current = idx + 1;
            nextThresholdRef.current = null;
            if (eventIndexRef.current >= events.length && task.repeatEvents) {
                eventIndexRef.current = 0;
            }
        }
    }, [task, setFeedback, priorScore]);
    checkScoreEventsRef.current = checkScoreEvents;

    // Refs for clap handler (Issue 2 - avoid stale closure)
    const depthRef = useRef(0);
    const timeHoldRef = useRef(0);
    depthRef.current = diveState.current;
    timeHoldRef.current = timeHold;

    const handleClap = useCallback(() => {
        const isInHold = depthRef.current > 0 && timeHoldRef.current >= HOLD_THRESHOLD;
        if (isInHold) {
            const depth = depthRef.current;
            const bonus = CLAP_BONUS_BASE * (DEPTH_CLAP_FACTOR[depth] ?? 1);
            currentHoldClapBonusRef.current += bonus;
            countsRef.current = { ...countsRef.current, clapsDuringHold: (countsRef.current.clapsDuringHold || 0) + 1 };
        }
    }, []);

    useClapDetection(handleClap, false);

    // handleTimeElapsed: stable deps [task, onTaskOver]; reads from refs
    const handleTimeElapsed = useCallback(() => {
        const summary = generateSummaryENDLESS(task, holdScoresRef.current, diveScoresRef.current, {
            totalHoldScore: totalHoldScoreRef.current,
            totalDiveScore: totalDiveScoreRef.current,
            clapBonus: clapBonusRef.current,
            rhythmBonus: rhythmBonusRef.current,
            depthBonus: depthBonusRef.current,
            totalTimeHeld: totalTimeHeldRef.current,
            totalDives: totalDivesRef.current,
            counts: countsRef.current,
            holdTimeByDepth: holdTimeByDepthRef.current,
            divesByDepth: divesByDepthRef.current
        });
        onTaskOver(summary, true);
    }, [task, onTaskOver]);

    useTimeLimit(task?.timeLimit ?? 999, handleTimeElapsed);

    // Check if diving has started
    useEffect(() => {
        if (!hasStarted && diveState.current > 0) {
            setHasStarted(true);
        }
    }, [hasStarted, diveState]);

    // Track dive motion and calculate tempo
    useEffect(() => {
        // we where resting, do nothing until we start descending
        if (diveState.current > 0 && motion.dir === 'rest') {
            // basically reset with 1 being the up position
            setMotion({ up: 1, down: 0, upTempo: 0, downTempo: 0, dir: 'down', holdTime: 0, holdDuration: 0 });
        }
        // we're ascending now - calculate what was the down tempo
        else if (diveState.current < diveState.previous && motion.dir === 'down') {
            let downDepth = diveState.previous;
            let tempo = calculateTempo(motion.up + 1, downDepth, diveState.previousDurations);
            const totalHoldDuration = holdStartTimeRef.current
                ? (performance.now() - holdStartTimeRef.current) / 1000
                : timeHold;
            setMotion({ ...motion, down: downDepth, downTempo: tempo, dir: 'up', holdTime: timeHold, holdDuration: totalHoldDuration });
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
            setMotion({ ...motion, up: diveState.previous, upTempo: tempo, dir: 'down', holdTime: 0, holdDuration: 0 });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- diveState ref, motion/timeHold
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
        // eslint-disable-next-line react-hooks/exhaustive-deps -- diveState ref, not a valid dep
    }, [diveState.current]);

    // Grace period decay and surface penalty loop (use depthRef so interval sees current depth)
    useEffect(() => {
        let lastTime = performance.now();
        const interval = setInterval(() => {
            const now = performance.now();
            const delta = (now - lastTime) / 1000;
            lastTime = now;
            const atSurface = depthRef.current === 0;

            tempGraceRef.current = Math.max(0, tempGraceRef.current - delta);
            if (atSurface && tempGraceRef.current <= 0 && gracePeriodRef.current > 0) {
                gracePeriodRef.current = Math.max(0, gracePeriodRef.current - delta);
            }
            if (atSurface && hasStartedRef.current && gracePeriodRef.current <= 0 && tempGraceRef.current <= 0) {
                if (now - lastSurfacePenaltyTimeRef.current >= 2000) {
                    lastSurfacePenaltyTimeRef.current = now;
                    countsRef.current = { ...countsRef.current, penalties: (countsRef.current.penalties || 0) + 1 };
                    const penaltyEntry = { type: 'penalty', score: SURFACE_PENALTY, grade: Grade.PENALTY, timestamp: now };
                    allScoresRef.current = [...allScoresRef.current, penaltyEntry];
                    setAllScoresRef.current([...allScoresRef.current]);
                    const p = (countsRef.current.penalties || 0) * SURFACE_PENALTY;
                    const newTotals = { ...totalsRef.current, penalty: p };
                    setTotalsRef.current(newTotals);
                    totalsRef.current = newTotals;
                    checkScoreEventsRef.current();
                }
            }
        }, 100);
        return () => clearInterval(interval);
    }, []);

    // Record movements and scores when completing a hold or dive
    useEffect(() => {
        if (motion.dir === 'up') {
            const timestamp = performance.now();
            if (motion.holdTime >= HOLD_THRESHOLD) {
                const depth = motion.down;
                const duration = motion.holdDuration || motion.holdTime;
                const holdScore = (HOLD_POINTS_PER_DEPTH[depth] || 0) * duration;
                const clapBonusForHold = currentHoldClapBonusRef.current;
                currentHoldClapBonusRef.current = 0;
                const totalScore = holdScore + clapBonusForHold;
                const movement = {
                    type: 'hold',
                    depth,
                    duration,
                    score: totalScore,
                    bonus: clapBonusForHold,
                    grade: Grade.PASS,
                    timestamp
                };
                holdScoresRef.current = [...holdScoresRef.current, movement];
                totalHoldScoreRef.current += holdScore;
                clapBonusRef.current += clapBonusForHold;
                countsRef.current = { ...countsRef.current, holds: (countsRef.current.holds || 0) + 1 };
                totalTimeHeldRef.current += duration;
                const htd = { ...holdTimeByDepthRef.current };
                htd[depth] = (htd[depth] || 0) + duration;
                holdTimeByDepthRef.current = htd;
                allScoresRef.current = [...allScoresRef.current, movement];
                setAllScoresRef.current(allScoresRef.current);
                const newTotals = {
                    hold: totalHoldScoreRef.current,
                    dive: totalDiveScoreRef.current,
                    clap: clapBonusRef.current,
                    rhythm: rhythmBonusRef.current,
                    depth: depthBonusRef.current,
                    penalty: (countsRef.current.penalties || 0) * SURFACE_PENALTY
                };
                setTotals(newTotals);
                totalsRef.current = newTotals;
                const earned = totalScore * GRACE_RATE / 10;
                gracePeriodRef.current = Math.min(GRACE_MAX, gracePeriodRef.current + earned);
                checkScoreEvents();
            } else {
                currentHoldClapBonusRef.current = 0;
                let avgTempo = motion.upTempo + motion.downTempo;
                if (motion.upTempo !== 0) avgTempo /= 2;
                const tempoEnum = getTempoFromBpm(avgTempo);
                const baseScore = getDiveScore(tempoEnum, Grade.PASS);
                const minD = Math.min(motion.up, motion.down);
                const maxD = Math.max(motion.up, motion.down);
                const depthFactor = getDepthRangeFactor(minD, maxD);
                const score = baseScore * depthFactor;
                const endDepth = motion.down;
                const movement = {
                    type: 'dive',
                    startDepth: motion.up,
                    endDepth,
                    tempo: avgTempo,
                    tempoState: getTempoState(avgTempo),
                    score,
                    grade: Grade.PASS,
                    timestamp
                };
                diveScoresRef.current = [...diveScoresRef.current, movement];
                totalDiveScoreRef.current += score;
                countsRef.current = { ...countsRef.current, dives: (countsRef.current.dives || 0) + 1 };
                totalDivesRef.current += 1;
                const dbd = { ...divesByDepthRef.current };
                dbd[endDepth] = (dbd[endDepth] || 0) + 1;
                divesByDepthRef.current = dbd;
                const window = [...diveWindowRef.current, movement].slice(-DIVE_WINDOW_SIZE);
                diveWindowRef.current = window;
                const sumOfWindow = window.reduce((s, d) => s + (d.score || 0), 0);
                rhythmBonusRef.current = sumOfWindow * RHYTHM_BONUS_MAX * computeRhythmBonusMultiplier(window);
                depthBonusRef.current = sumOfWindow * computeDepthBonus(window);
                allScoresRef.current = [...allScoresRef.current, movement];
                setAllScoresRef.current(allScoresRef.current);
                const newTotals = {
                    hold: totalHoldScoreRef.current,
                    dive: totalDiveScoreRef.current,
                    clap: clapBonusRef.current,
                    rhythm: rhythmBonusRef.current,
                    depth: depthBonusRef.current,
                    penalty: (countsRef.current.penalties || 0) * SURFACE_PENALTY
                };
                setTotals(newTotals);
                totalsRef.current = newTotals;
                const earned = score * GRACE_RATE / 10;
                gracePeriodRef.current = Math.min(GRACE_MAX, gracePeriodRef.current + earned);
                checkScoreEvents();
            }
        }
    }, [motion, checkScoreEvents]);

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
                    <h5>Score Feed</h5>
                    <ScoreList scores={allScores} />
                </div>
                <div className="margin-y-sm" style={{ fontSize: '0.9em', opacity: 0.9 }}>
                    Hold: {totals.hold.toFixed(1)} · Dive: {totals.dive.toFixed(1)} · Clap: {totals.clap.toFixed(1)} · Rhythm: {totals.rhythm.toFixed(1)} · Depth: {totals.depth.toFixed(1)} · Penalty: {totals.penalty} · Total: {(totals.hold + totals.dive + totals.clap + totals.rhythm + totals.depth + totals.penalty).toFixed(1)}
                </div>
            </div>
        </div>
    );
}

export default EndlessDive; 