import React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { feedbackAtom, sfxAtom } from '../../atoms/audioAtom';
import { currentLevelAtom } from '../../atoms/taskAtom';
import useTiming from '../../hooks/useTiming';
import { useTimeLimit } from '../../hooks/useTimeLimit';
import { getTempoState } from '../Tasks/task';
import { generateSummaryENDLESS } from '../Tasks/taskSummary';
import { Grade } from '../../atoms/taskAtom';
import { TaskType } from '../Tasks/task';
import { getDiveScore } from './Diving';
import {
    HOLD_POINTS_PER_DEPTH,
    HOLD_DEEP_ONE_SCORE_MULT,
    CLAP_BONUS_BASE,
    DEPTH_CLAP_FACTOR,
    RHYTHM_BONUS_MAX,
    DIVE_WINDOW_SIZE,
    SURFACE_PENALTY,
    GRACE_INITIAL,
    GRACE_MAX,
    HOLD_GRACE_RATE,
    DIVE_GRACE_RATE,
    DEPTH_GRACE_FACTOR,
    BALLS_BONUS_INTERVAL_SEC,
    BALLS_BONUS_PER_INTERVAL,
    getTempoFromBpm,
    getDepthRangeFactor,
    computeRhythmBonusMultiplier,
    computeDepthBonus
} from './endlessScoring';
import { ballsCoveredAtom, gridsAtom } from '../../atoms/gridAtoms';
import { currentStateAtom } from '../../atoms/markersAtoms';
import { useClapDetection } from '../../hooks/useClapDetection';
import { executableService } from '../../services/executableService';
import { ScoreList } from './Score';
import GraceStatusBar from './GraceStatusBar';

// Seconds at a depth before that depth becomes the hold anchor (start scoring segment)
const HOLD_THRESHOLD = 3;

function EndlessDive({ task, onTaskOver, priorScore = 0 }) {
    const setFeedback = useSetAtom(feedbackAtom);
    useSetAtom(sfxAtom);
    const currentLevel = useAtomValue(currentLevelAtom);
    const setCurrentLevel = useSetAtom(currentLevelAtom);
    const ballsCovered = useAtomValue(ballsCoveredAtom);
    const grids = useAtomValue(gridsAtom);
    const currentState = useAtomValue(currentStateAtom);

    const currentStateRef = useRef(0);
    currentStateRef.current = currentState;

    // hook for dive state
    const diveState = useTiming();
    const depthRef = useRef(0);
    depthRef.current = diveState.current;

    // State tracking
    const [hasStarted, setHasStarted] = useState(false);
    const [allScores, setAllScores] = useState([]);
    const [totals, setTotals] = useState({ hold: 0, dive: 0, clap: 0, rhythm: 0, depth: 0, penalty: 0, ballsBonus: 0 });
    const totalsRef = useRef({ hold: 0, dive: 0, clap: 0, rhythm: 0, depth: 0, penalty: 0, ballsBonus: 0 });
    const setAllScoresRef = useRef(() => {});
    const setTotalsRef = useRef(() => {});
    setAllScoresRef.current = setAllScores;
    setTotalsRef.current = setTotals;
    totalsRef.current = totals;
    const [timeHold, setTimeHold] = useState(0);
    const [holdDepthDisplay, setHoldDepthDisplay] = useState(null);
    const [graceDisplay, setGraceDisplay] = useState({ standard: GRACE_INITIAL, temp: 0, atSurface: false });

    // Track dive motion
    const [motion, setMotion] = useState({
        up: 0,
        down: 0,
        upTempo: 0,
        downTempo: 0,
        dir: 'rest',
        holdTime: 0,
        holdDuration: 0
    });

    // Anchor hold model: arm at depth, then score at anchor rate / 25% at anchor+1; +2 depths aborts; shallower or surface commits
    const holdAnchorDepthRef = useRef(null);
    const holdPointsAccumulatorRef = useRef(0);
    const holdSegmentWallRef = useRef(0);
    const armingDepthRef = useRef(null);
    const armingElapsedRef = useRef(0);
    const prevDepthForHoldRef = useRef(null);
    const holdRafLastTimeRef = useRef(null);
    const holdUiLastSentRef = useRef(null);
    const holdUiDepthLastSentRef = useRef(null);
    const commitHoldRef = useRef(() => {});
    const abortHoldRef = useRef(() => {});

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

    const ballsHoldStartTimeRef = useRef(null);
    const ballsBonusScoreRef = useRef(0);
    const sessionStartBallsBonusRef = useRef(0);
    const lastIntervalsCompletedRef = useRef(0);

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
            clapBonusRef.current + rhythmBonusRef.current + depthBonusRef.current +
            ballsBonusScoreRef.current + penaltyTotal;
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

    commitHoldRef.current = (timestamp) => {
        const anchor = holdAnchorDepthRef.current;
        if (anchor == null) return;
        const holdScore = holdPointsAccumulatorRef.current;
        const wallDur = holdSegmentWallRef.current;
        const clapBonusForHold = currentHoldClapBonusRef.current;
        currentHoldClapBonusRef.current = 0;
        if (holdScore <= 0 && clapBonusForHold <= 0) {
            holdAnchorDepthRef.current = null;
            holdPointsAccumulatorRef.current = 0;
            holdSegmentWallRef.current = 0;
            const cur0 = depthRef.current;
            if (cur0 > 0) {
                armingDepthRef.current = cur0;
                armingElapsedRef.current = 0;
            } else {
                armingDepthRef.current = null;
                armingElapsedRef.current = 0;
            }
            return;
        }
        const totalScore = holdScore + clapBonusForHold;
        const movement = {
            type: 'hold',
            depth: anchor,
            duration: wallDur,
            score: totalScore,
            bonus: clapBonusForHold,
            grade: Grade.PASS,
            timestamp
        };
        holdScoresRef.current = [...holdScoresRef.current, movement];
        totalHoldScoreRef.current += holdScore;
        clapBonusRef.current += clapBonusForHold;
        countsRef.current = { ...countsRef.current, holds: (countsRef.current.holds || 0) + 1 };
        totalTimeHeldRef.current += wallDur;
        const htd = { ...holdTimeByDepthRef.current };
        htd[anchor] = (htd[anchor] || 0) + wallDur;
        holdTimeByDepthRef.current = htd;
        allScoresRef.current = [...allScoresRef.current, movement];
        setAllScoresRef.current(allScoresRef.current);
        const penaltyTotal = (countsRef.current.penalties || 0) * SURFACE_PENALTY;
        const newTotals = {
            hold: totalHoldScoreRef.current,
            dive: totalDiveScoreRef.current,
            clap: clapBonusRef.current,
            rhythm: rhythmBonusRef.current,
            depth: depthBonusRef.current,
            penalty: penaltyTotal,
            ballsBonus: ballsBonusScoreRef.current
        };
        totalsRef.current = newTotals;
        setTotalsRef.current(newTotals);
        setTotals(newTotals);
        const depthFactor = DEPTH_GRACE_FACTOR[anchor] ?? 1;
        const earned = totalScore * HOLD_GRACE_RATE / 10 * depthFactor;
        gracePeriodRef.current = Math.min(GRACE_MAX, gracePeriodRef.current + earned);
        setGraceDisplay(prev => ({ ...prev, standard: gracePeriodRef.current }));

        holdAnchorDepthRef.current = null;
        holdPointsAccumulatorRef.current = 0;
        holdSegmentWallRef.current = 0;
        const cur = depthRef.current;
        if (cur > 0) {
            armingDepthRef.current = cur;
            armingElapsedRef.current = 0;
        } else {
            armingDepthRef.current = null;
            armingElapsedRef.current = 0;
        }
        checkScoreEventsRef.current();
    };

    abortHoldRef.current = () => {
        holdAnchorDepthRef.current = null;
        holdPointsAccumulatorRef.current = 0;
        holdSegmentWallRef.current = 0;
        currentHoldClapBonusRef.current = 0;
        const cur = depthRef.current;
        if (cur > 0) {
            armingDepthRef.current = cur;
            armingElapsedRef.current = 0;
        } else {
            armingDepthRef.current = null;
            armingElapsedRef.current = 0;
        }
    };

    const handleClap = useCallback(() => {
        const anchor = holdAnchorDepthRef.current;
        if (anchor == null) return;
        const d = depthRef.current;
        if (d <= 0) return;
        const rel = d - anchor;
        if (rel < 0 || rel > 1) return;
        const bonus = CLAP_BONUS_BASE * (DEPTH_CLAP_FACTOR[d] ?? 1);
        currentHoldClapBonusRef.current += bonus;
        countsRef.current = { ...countsRef.current, clapsDuringHold: (countsRef.current.clapsDuringHold || 0) + 1 };
    }, []);

    useClapDetection(handleClap, false, true, 'gameplay');

    // handleTimeElapsed: stable deps [task, onTaskOver]; reads from refs
    const handleTimeElapsed = useCallback(() => {
        const summary = generateSummaryENDLESS(task, holdScoresRef.current, diveScoresRef.current, {
            totalHoldScore: totalHoldScoreRef.current,
            totalDiveScore: totalDiveScoreRef.current,
            clapBonus: clapBonusRef.current,
            rhythmBonus: rhythmBonusRef.current,
            depthBonus: depthBonusRef.current,
            ballsBonus: ballsBonusScoreRef.current,
            totalTimeHeld: totalTimeHeldRef.current,
            totalDives: totalDivesRef.current,
            counts: countsRef.current,
            holdTimeByDepth: holdTimeByDepthRef.current,
            divesByDepth: divesByDepthRef.current
        });
        onTaskOver(summary, true);
    }, [task, onTaskOver]);

    useTimeLimit(task?.timeLimit ?? 999, handleTimeElapsed);

    // Restore grace from level state on mount (e.g. after resume from pause)
    useEffect(() => {
        const saved = currentLevel?.endlessGrace;
        if (saved) {
            gracePeriodRef.current = saved.standard;
            tempGraceRef.current = saved.temp;
            setGraceDisplay(prev => ({ ...prev, standard: saved.standard, temp: saved.temp }));
            if (saved.hasStarted) setHasStarted(true);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Restore scores and totals from level state on mount (e.g. after resume from pause)
    useEffect(() => {
        const saved = currentLevel?.endlessScores;
        if (saved) {
            const scores = saved.allScores ?? [];
            setAllScores(scores);
            allScoresRef.current = scores;
            setTotals(saved.totals ?? { hold: 0, dive: 0, clap: 0, rhythm: 0, depth: 0, penalty: 0, ballsBonus: 0 });
            totalsRef.current = saved.totals ?? { hold: 0, dive: 0, clap: 0, rhythm: 0, depth: 0, penalty: 0, ballsBonus: 0 };
            holdScoresRef.current = saved.holdScores ?? [];
            diveScoresRef.current = saved.diveScores ?? [];
            totalHoldScoreRef.current = saved.totalHoldScore ?? 0;
            totalDiveScoreRef.current = saved.totalDiveScore ?? 0;
            clapBonusRef.current = saved.clapBonus ?? 0;
            rhythmBonusRef.current = saved.rhythmBonus ?? 0;
            depthBonusRef.current = saved.depthBonus ?? 0;
            totalTimeHeldRef.current = saved.totalTimeHeld ?? 0;
            totalDivesRef.current = saved.totalDives ?? 0;
            ballsBonusScoreRef.current = saved.ballsBonus ?? 0;
            countsRef.current = saved.counts ?? { holds: 0, dives: 0, clapsDuringHold: 0, penalties: 0, fail: 0 };
            holdTimeByDepthRef.current = saved.holdTimeByDepth ?? { 1: 0, 2: 0, 3: 0, 4: 0 };
            divesByDepthRef.current = saved.divesByDepth ?? { 1: 0, 2: 0, 3: 0, 4: 0 };
            diveWindowRef.current = saved.diveWindow ?? [];
            eventIndexRef.current = saved.eventIndex ?? 0;
            nextThresholdRef.current = saved.nextThreshold ?? null;
            lastThresholdRef.current = saved.lastThreshold ?? priorScore;
            const hs = saved.holdSegmentState;
            if (hs) {
                holdAnchorDepthRef.current = hs.anchor ?? null;
                holdPointsAccumulatorRef.current = hs.accumulator ?? 0;
                holdSegmentWallRef.current = hs.wall ?? 0;
                armingDepthRef.current = hs.armingDepth ?? null;
                armingElapsedRef.current = hs.armingElapsed ?? 0;
                prevDepthForHoldRef.current = hs.prevDepth ?? null;
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Persist grace and scores to level state on unmount (e.g. when pausing)
    useEffect(() => {
        return () => {
            setCurrentLevel(prev => {
                if (prev?.currentTask?.type === TaskType.ENDLESS) {
                    return {
                        ...prev,
                        endlessGrace: {
                            standard: gracePeriodRef.current,
                            temp: tempGraceRef.current,
                            hasStarted: hasStartedRef.current
                        },
                        endlessScores: {
                            allScores: allScoresRef.current.slice(-20),
                            totals: { ...totalsRef.current },
                            ballsBonus: ballsBonusScoreRef.current,
                            holdScores: [...holdScoresRef.current],
                            diveScores: [...diveScoresRef.current],
                            totalHoldScore: totalHoldScoreRef.current,
                            totalDiveScore: totalDiveScoreRef.current,
                            clapBonus: clapBonusRef.current,
                            rhythmBonus: rhythmBonusRef.current,
                            depthBonus: depthBonusRef.current,
                            totalTimeHeld: totalTimeHeldRef.current,
                            totalDives: totalDivesRef.current,
                            counts: { ...countsRef.current },
                            holdTimeByDepth: { ...holdTimeByDepthRef.current },
                            divesByDepth: { ...divesByDepthRef.current },
                            diveWindow: [...diveWindowRef.current],
                            eventIndex: eventIndexRef.current,
                            nextThreshold: nextThresholdRef.current,
                            lastThreshold: lastThresholdRef.current,
                            holdSegmentState: {
                                anchor: holdAnchorDepthRef.current,
                                accumulator: holdPointsAccumulatorRef.current,
                                wall: holdSegmentWallRef.current,
                                armingDepth: armingDepthRef.current,
                                armingElapsed: armingElapsedRef.current,
                                prevDepth: prevDepthForHoldRef.current
                            }
                        }
                    };
                }
                return prev;
            });
        };
    }, [setCurrentLevel]);

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
            setMotion({ ...motion, down: downDepth, downTempo: tempo, dir: 'up', holdTime: 0, holdDuration: 0 });
        }
        // we're descending now - calculate what was the up tempo
        else if (diveState.current > diveState.previous && motion.dir === 'up') {
            let upDepth = diveState.previous;
            let tempo = calculateTempo(upDepth, motion.down - 1, diveState.previousDurations);
            setMotion({ ...motion, up: diveState.previous, upTempo: tempo, dir: 'down', holdTime: 0, holdDuration: 0 });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- diveState ref, motion
    }, [diveState]);

    // Anchor hold: arm, accumulate, commit on shallower/surface, abort on +2 depths
    useEffect(() => {
        let rafId;
        const basePts = (a) => HOLD_POINTS_PER_DEPTH[a] || 0;
        const setHoldUi = (v) => {
            const q = Math.round(v * 10) / 10;
            if (holdUiLastSentRef.current !== q) {
                holdUiLastSentRef.current = q;
                setTimeHold(q);
            }
        };
        const setHoldDepthUi = (d) => {
            if (holdUiDepthLastSentRef.current !== d) {
                holdUiDepthLastSentRef.current = d;
                setHoldDepthDisplay(d);
            }
        };
        const tick = (now) => {
            if (holdRafLastTimeRef.current == null) {
                holdRafLastTimeRef.current = now;
            }
            const dt = Math.min(0.1, (now - holdRafLastTimeRef.current) / 1000);
            holdRafLastTimeRef.current = now;

            const curr = depthRef.current;
            const anchor = holdAnchorDepthRef.current;

            if (curr === 0) {
                if (anchor != null) {
                    const prev = prevDepthForHoldRef.current;
                    if (prev != null && dt > 0) {
                        const prevRel = prev - anchor;
                        if (prevRel >= 0 && prevRel <= 1) {
                            const rate = prevRel === 0 ? 1 : HOLD_DEEP_ONE_SCORE_MULT;
                            holdPointsAccumulatorRef.current += basePts(anchor) * rate * dt;
                            holdSegmentWallRef.current += dt;
                        }
                    }
                    commitHoldRef.current(now);
                }
                armingDepthRef.current = null;
                armingElapsedRef.current = 0;
                prevDepthForHoldRef.current = 0;
                setHoldUi(0);
                setHoldDepthUi(null);
                rafId = requestAnimationFrame(tick);
                return;
            }

            if (anchor == null) {
                if (armingDepthRef.current !== curr) {
                    armingDepthRef.current = curr;
                    armingElapsedRef.current = 0;
                } else {
                    armingElapsedRef.current += dt;
                }
                if (armingElapsedRef.current >= HOLD_THRESHOLD) {
                    holdAnchorDepthRef.current = curr;
                    holdPointsAccumulatorRef.current = 0;
                    holdSegmentWallRef.current = 0;
                    armingDepthRef.current = null;
                    armingElapsedRef.current = 0;
                    prevDepthForHoldRef.current = curr;
                    setHoldUi(0);
                    setHoldDepthUi(curr);
                } else {
                    setHoldUi(armingElapsedRef.current);
                    setHoldDepthUi(curr);
                    prevDepthForHoldRef.current = curr;
                }
                rafId = requestAnimationFrame(tick);
                return;
            }

            const rel = curr - anchor;
            const prev = prevDepthForHoldRef.current;

            if (curr < anchor) {
                if (prev != null && dt > 0) {
                    const prevRel = prev - anchor;
                    if (prevRel >= 0 && prevRel <= 1) {
                        const rate = prevRel === 0 ? 1 : HOLD_DEEP_ONE_SCORE_MULT;
                        holdPointsAccumulatorRef.current += basePts(anchor) * rate * dt;
                        holdSegmentWallRef.current += dt;
                    }
                }
                commitHoldRef.current(now);
                prevDepthForHoldRef.current = curr;
                setHoldUi(0);
                setHoldDepthUi(null);
                rafId = requestAnimationFrame(tick);
                return;
            }

            if (rel >= 2) {
                abortHoldRef.current();
                prevDepthForHoldRef.current = curr;
                setHoldUi(0);
                setHoldDepthUi(null);
                rafId = requestAnimationFrame(tick);
                return;
            }

            if (rel === 0 || rel === 1) {
                const rate = rel === 0 ? 1 : HOLD_DEEP_ONE_SCORE_MULT;
                holdPointsAccumulatorRef.current += basePts(anchor) * rate * dt;
                holdSegmentWallRef.current += dt;
            }

            prevDepthForHoldRef.current = curr;
            setHoldDepthUi(anchor);
            setHoldUi(holdSegmentWallRef.current);
            rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, []);

    // Grace period decay and surface penalty loop (use depthRef so interval sees current depth)
    useEffect(() => {
        let lastTime = performance.now();
        const interval = setInterval(() => {
            const now = performance.now();
            const delta = (now - lastTime) / 1000;
            lastTime = now;
            const atSurface = depthRef.current === 0;

            if (hasStartedRef.current) {
                tempGraceRef.current = Math.max(0, tempGraceRef.current - delta);
            }
            if (atSurface && hasStartedRef.current && tempGraceRef.current <= 0 && gracePeriodRef.current > 0) {
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
            setGraceDisplay({
                standard: gracePeriodRef.current,
                temp: tempGraceRef.current,
                atSurface: depthRef.current === 0
            });
        }, 100);
        return () => clearInterval(interval);
    }, []);

    // Balls bonus: 3 pts at 3s, +3 per 3s when balls covered and depth 0 (mutually exclusive with shaft depth)
    const hasBallsGrids = (Array.isArray(grids) ? grids : []).some(g => g.balls === true);
    useEffect(() => {
        if (!hasBallsGrids) return;
        const interval = setInterval(() => {
            const now = performance.now();
            const atSurface = currentStateRef.current === 0;
            if (ballsCovered && atSurface) {
                if (!ballsHoldStartTimeRef.current) {
                    ballsHoldStartTimeRef.current = now;
                    sessionStartBallsBonusRef.current = ballsBonusScoreRef.current;
                }
                const holdTime = (now - ballsHoldStartTimeRef.current) / 1000;
                const intervalsCompleted = Math.floor(holdTime / BALLS_BONUS_INTERVAL_SEC);
                const newScore = sessionStartBallsBonusRef.current + intervalsCompleted * BALLS_BONUS_PER_INTERVAL;
                if (newScore !== ballsBonusScoreRef.current) {
                    ballsBonusScoreRef.current = newScore;
                    const newTotals = { ...totalsRef.current, ballsBonus: newScore };
                    setTotalsRef.current(newTotals);
                    totalsRef.current = newTotals;
                }
                if (intervalsCompleted > lastIntervalsCompletedRef.current) {
                    const newPoints = (intervalsCompleted - lastIntervalsCompletedRef.current) * BALLS_BONUS_PER_INTERVAL;
                    lastIntervalsCompletedRef.current = intervalsCompleted;
                    const entry = { type: 'balls', score: newPoints, grade: Grade.PASS, timestamp: now };
                    allScoresRef.current = [...allScoresRef.current, entry];
                    setAllScoresRef.current([...allScoresRef.current]);
                }
            } else {
                ballsHoldStartTimeRef.current = null;
                lastIntervalsCompletedRef.current = 0;
            }
        }, 100);
        return () => clearInterval(interval);
    }, [ballsCovered, hasBallsGrids, currentState]);

    // Record dive scores on ascent (holds commit via anchor RAF when going shallower or to surface)
    useEffect(() => {
        if (motion.dir === 'up') {
            const timestamp = performance.now();
            if (holdAnchorDepthRef.current == null) {
                currentHoldClapBonusRef.current = 0;
            }
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
                penalty: (countsRef.current.penalties || 0) * SURFACE_PENALTY,
                ballsBonus: ballsBonusScoreRef.current
            };
            setTotals(newTotals);
            totalsRef.current = newTotals;
            const graceDepthFactor = DEPTH_GRACE_FACTOR[endDepth] ?? 1;
            const rhythmMult = sumOfWindow > 0 ? rhythmBonusRef.current / sumOfWindow : 0;
            const depthMult = sumOfWindow > 0 ? depthBonusRef.current / sumOfWindow : 0;
            const earned = score * DIVE_GRACE_RATE / 10 * graceDepthFactor * (1 + rhythmMult) * (1 + depthMult);
            gracePeriodRef.current = Math.min(GRACE_MAX, gracePeriodRef.current + earned);
            setGraceDisplay(prev => ({ ...prev, standard: gracePeriodRef.current }));
            checkScoreEvents();
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
                <h5 className="margin-y-sm" style={{ marginBottom: '4px' }}>Rest Time:</h5>
                <GraceStatusBar
                    standardGrace={graceDisplay.standard}
                    tempGrace={graceDisplay.temp}
                    atSurface={graceDisplay.atSurface}
                    maxGrace={GRACE_MAX}
                />
                <h4 className='margin-y-sm'>
                    Tempo: {avgTempo.toFixed(0)}bpm {getTempoState(avgTempo)}
                </h4>
                {(timeHold > 0 || holdDepthDisplay != null) && (
                    <h4 className='margin-y-sm'>
                        Hold: {timeHold.toFixed(1)}s, Depth: {holdDepthDisplay ?? '—'}
                    </h4>
                )}
                <div className="margin-y-sm">
                    <h5>Score Feed</h5>
                    <ScoreList scores={allScores.slice(-5)} />
                </div>
                <div className="margin-y-sm" style={{ fontSize: '0.9em', opacity: 0.9 }}>
                    Hold: {totals.hold.toFixed(1)} · Dive: {totals.dive.toFixed(1)} · Clap: {totals.clap.toFixed(1)} · Rhythm: {totals.rhythm.toFixed(1)} · Depth: {totals.depth.toFixed(1)} · Balls: {totals.ballsBonus ?? 0} · Penalty: {totals.penalty} · Total: {(totals.hold + totals.dive + totals.clap + totals.rhythm + totals.depth + (totals.ballsBonus ?? 0) + totals.penalty).toFixed(1)}
                </div>
            </div>
        </div>
    );
}

export default EndlessDive; 