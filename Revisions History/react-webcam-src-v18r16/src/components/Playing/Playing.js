import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { DEBUG } from '../../App';
// components
import Diving from './Diving';
import CountdownTimer from './CountdownTimer';
import HoldDepth from './HoldDepth';
import HitDepth from './HitDepth';
import ClapDetector from './ClapDetector';
import SpeakDetector from './SpeakDetector';
import HoldAndClapDetector from './HoldAndClapDetector';
import CurrentShaft from './CurrentShaft';
import EndlessDive from './EndlessDive';
import RestBallsBonus from './RestBallsBonus';
// helpers
import { getRandomInt } from '../randomInt';
import { TaskType, getTaskSummary, calculateClapTimeLimit, calculateSpeakTimeLimit } from '../Tasks/task';
import * as NAV from '../../atoms/navAtom';
import { executableService } from '../../services/executableService';
// atoms
import { useAtom, useSetAtom, useAtomValue } from 'jotai';
import { feedbackAtom, sfxAtom, stopVoiceRequestAtom, musicPlaybackSessionAtom, musicFadeOutEnabledAtom, musicFadeOutDurationAtom } from '../../atoms/audioAtom';
import { currentLevelAtom, playStateAtom, playTimeAtom, PlayState } from '../../atoms/taskAtom';
import { navAtom } from '../../atoms/navAtom';
import { gridsAtom } from '../../atoms/gridAtoms';
import { externalIntegrationService } from '../../services/externalIntegrationService';
import { levelManager } from '../../services/levelManager';
import { audioProcessingService } from '../../services/audioProcessingService';
import { resolveBackgroundMusicTrack } from '../../utils/backgroundMusicResolver';
import { store } from '../../store';
import { useExternalTimers } from '../../hooks/useExternalTimers';
import { calibrationService } from '../../services/calibrationService';
import { startGameplayMic, stopGameplayMic, isGameplayMicActive, scheduleStopGameplayMic } from '../../services/gameplayMicSession';
import { useSpeakRecognitionGate } from '../../hooks/useSpeakRecognitionGate';

/**
 * Clears level background music. Idempotent when `url` is already null: no generation bump,
 * so AudioPlayer does not run fade-out twice (e.g. after gotoNextTask then Playing unmount).
 * @param {boolean} [immediate=false] If true, skip fade-out (instant teardown), e.g. level cancel.
 */
function clearMusicPlaybackSession(immediate = false) {
    const stopFade = immediate ? false : store.get(musicFadeOutEnabledAtom)
    store.set(musicPlaybackSessionAtom, (prev) => {
        if (!prev.url) {
            return prev
        }
        return {
            url: null,
            generation: prev.generation + 1,
            stopFade,
        }
    })
}

async function applyMusicPlaybackSessionForLevel(levelRuntime) {
    if (!levelRuntime?.id) return
    const def = levelManager.getLevel(levelRuntime.id) || {}
    const merged = { ...def, ...levelRuntime }
    const ctx = await audioProcessingService.ensureAudioContext()
    await ctx.resume()
    const url = await resolveBackgroundMusicTrack(merged, {
        cliTrackId: externalIntegrationService.getBackgroundMusicId()
    })
    store.set(musicPlaybackSessionAtom, (prev) => ({
        url,
        generation: prev.generation + 1,
        stopFade: false
    }))
}

// Playing handles the transition between tasks of a scenario
function Playing() {
    // atoms
    const setSfx = useSetAtom(sfxAtom)
    const setFeedback = useSetAtom(feedbackAtom)
    const setStopVoiceRequest = useSetAtom(stopVoiceRequestAtom)
    // const currentState = useAtomValue(currentStateAtom)
    const setNav = useSetAtom(navAtom)
    const [playState, setPlayState] = useAtom(playStateAtom)
    const [currentLevel, setCurrentLevel] = useAtom(currentLevelAtom)
    const setPlayTime = useSetAtom(playTimeAtom)
    const grids = useAtomValue(gridsAtom)
    const hasBallsGrids = (Array.isArray(grids) ? grids : []).some(g => g.balls === true)
    const [cancelCountdown, setCancelCountdown] = useState(null)
    const [countdownNumber, setCountdownNumber] = useState(3)


    // Cleanup interval on unmount
    useEffect(() => {
        return () => {
            if (cancelCountdown) {
                clearInterval(cancelCountdown.id)
            }
        }
    }, [cancelCountdown])

    // Reset countdown if user resumes
    useEffect(() => {
        if (playState === PlayState.PLAYING && cancelCountdown) {
            clearInterval(cancelCountdown.id)
            setCancelCountdown(null)
            setCountdownNumber(3)
        }
    }, [playState, cancelCountdown])

    const gotoNextTask = useCallback((options = {}) => {
        const { stopVoiceFirst = false } = options
        if (stopVoiceFirst) {
            setStopVoiceRequest(prev => prev + 1)
        }
        if (!currentLevel) return
        if (currentLevel.tasks.length === 0) {
            console.log('no more tasks')
            clearMusicPlaybackSession()
            setCurrentLevel(prevLevel => ({
                ...prevLevel,
                status: 'complete',
                currentTask: null,
                endlessGrace: undefined,
                endlessScores: undefined
            }))
            setPlayState(PlayState.NOT_PLAYING)
            // Do NOT reset playTime here - Gameover captures it first, then resets
            setNav(NAV.GAMEOVER)
        } else {
            const next = currentLevel.tasks[0]
            const remainingTasks = currentLevel.tasks.slice(1)
            const updatedMilestones = { ...currentLevel.milestones }
            if (next.type === TaskType.HOLDPOSITION || next.type === TaskType.HITDEPTH || next.type === TaskType.HOLDANDCLAP) {
                if (next.targetDepth === 3 && !currentLevel.milestones.firstDepth3) {
                    updatedMilestones.firstDepth3 = true
                }
                if (next.targetDepth === 4 && !currentLevel.milestones.firstDepth4) {
                    updatedMilestones.firstDepth4 = true
                }
            }
            setCurrentLevel(prevLevel => ({
                ...prevLevel,
                tasks: remainingTasks,
                currentTask: next,
                milestones: updatedMilestones,
                endlessGrace: undefined,
                endlessScores: undefined
            }))
            if (next.executablePath) {
                executableService.execute(next.executablePath)
                    .then(result => {
                        if (!result.success) {
                            console.error(`Failed to execute program for task ${next.type}:`, result.error);
                        }
                    })
                    .catch(error => {
                        console.error('Unexpected error executing program:', error);
                    });
            }
        }
        setSfx(0)
        if (stopVoiceFirst) {
            setFeedback(0)
        }
    }, [currentLevel, setCurrentLevel, setPlayState, setNav, setSfx, setFeedback, setStopVoiceRequest])

    // Auto-start detection for headless mode
    useEffect(() => {
        const isExternalMode = externalIntegrationService.isExternalMode();
        const isHeadless = externalIntegrationService.isHeadlessMode();
        
        if (!(isExternalMode && isHeadless &&
            playState === PlayState.PLAYING &&
            currentLevel &&
            !currentLevel.currentTask)) {
            return undefined;
        }
        let cancelled = false;
        (async () => {
            try {
                await startGameplayMic();
            } catch (e) {
                console.error('Headless start: microphone error:', e);
                return;
            }
            if (cancelled) return;
            if (!isGameplayMicActive()) return;
            try {
                await applyMusicPlaybackSessionForLevel(currentLevel);
            } catch (e) {
                console.error('Headless start: background music error:', e);
                stopGameplayMic();
                return;
            }
            if (cancelled) return;
            setPlayState(PlayState.PLAYING);
            setPlayTime(0);
            setCurrentLevel(prevLevel => ({
                ...prevLevel,
                currentPenalties: 0
            }));
            gotoNextTask();
        })();
        return () => { cancelled = true; };
    }, [playState, currentLevel, setPlayState, setPlayTime, setCurrentLevel, gotoNextTask])

    useEffect(() => {
        return () => {
            // Music is cleared by gotoNextTask (level complete) or cancelLevel (cancel).
            // Do not clear here — duplicate clear bumped generation and re-ran fade-out (glitch).
            // Defer mic teardown past music fade-out so gain ramp and mic release don't fight (glitch).
            const fadeOut = store.get(musicFadeOutEnabledAtom)
            const fadeSec = Number(store.get(musicFadeOutDurationAtom)) || 0
            const delayMs = fadeOut && fadeSec > 0 ? Math.ceil(fadeSec * 1000) + 150 : 0
            scheduleStopGameplayMic(delayMs)
        };
    }, []);

    // Initialize external timers
    useExternalTimers();

    useSpeakRecognitionGate();

    // Increment play time every second when playing (runs here so it works in headless mode when Navigation is hidden)
    useEffect(() => {
        let intervalId;
        if (playState === PlayState.PLAYING) {
            intervalId = setInterval(() => {
                setPlayTime(prev => prev + 1);
            }, 1000);
        }
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [playState, setPlayTime]);

    // if no level selected, redirect to Training
    if (!currentLevel) {
        return (
            <div className="no-level-selected">
                <div className="row-centered">
                    <h2 className="margin-y-sm">No Level Selected</h2>
                </div>
                <div className="row-centered">
                    <p>Please select a level for training first</p>
                </div>
                <div className="row-centered">
                    <button className="button button-primary padding-x" onClick={() => setNav(NAV.TRAINING)}>
                        Go to Levels
                    </button>
                </div>
            </div>
        )
    }

    function cancelLevel() {
        stopGameplayMic()
        clearMusicPlaybackSession(true)
        setCurrentLevel(null)
        setPlayState(PlayState.NOT_PLAYING)
        setNav(NAV.TRAINING)
    }

    function handleCancelClick() {
        if (cancelCountdown) {
            // If countdown is active, cancel it
            clearInterval(cancelCountdown.id)
            setCancelCountdown(null)
            setCountdownNumber(3)
            return
        }

        setCountdownNumber(3)
        const intervalId = setInterval(() => {
            setCountdownNumber(prev => {
                const newCount = prev - 1
                if (newCount === 0) {
                    clearInterval(intervalId)
                    setCancelCountdown(null)
                    cancelLevel()
                }
                return newCount
            })
        }, 1000)

        setCancelCountdown({ id: intervalId })
    }

    // Calculate the current countdown number
    const getCancelButtonText = () => {
        if (!cancelCountdown) return "Cancel"
        return `Cancel in...${countdownNumber}`
    }

    // set the level - move into different state
    async function handleBeginPlay() {
        // Apply calibration data if in external mode and not already applied
        const isExternalMode = externalIntegrationService.isExternalMode();
        if (isExternalMode && !externalIntegrationService.shouldSkipCalibration()) {
            // Calibration data should have been loaded in App.js
            // Apply it now when level starts
            const calibrationPath = externalIntegrationService.getCalibrationDataPath();
            if (calibrationPath && window.electronAPI && window.electronAPI.readCalibrationFile) {
                window.electronAPI.readCalibrationFile(calibrationPath).then(result => {
                    if (result.success && result.data) {
                        calibrationService.applyCalibration(result.data);
                    }
                });
            }
        }

        try {
            // Mic before background music: avoids Web Audio startup racing connectMusicReference vs connectMic.
            await startGameplayMic();
            if (!isGameplayMicActive()) {
                return;
            }
            await applyMusicPlaybackSessionForLevel(currentLevel);
        } catch (e) {
            stopGameplayMic();
            console.error('Could not start level audio/microphone:', e);
            window.alert(e?.message || 'Could not access the microphone. Clap tasks need mic permission.');
            return;
        }

        setPlayState(PlayState.PLAYING)
        setPlayTime(0)
        setCurrentLevel(prevLevel => ({
            ...prevLevel,
            currentPenalties: 0
        }))
        gotoNextTask()
    }

    function gotoNextTaskAddFinish() {
        const currentFinishedLoads = currentLevel.finishedLoads || 0
        // just add a counter that we finished a load
        setCurrentLevel(prevLevel => ({
            ...prevLevel,
            finishedLoads: currentFinishedLoads + 1
        }))
        gotoNextTask()
    }

    function onTaskOver(taskSummary, isSuccess) {
        const completedTask = currentLevel.currentTask
        const suppressFeedback = !!completedTask?.suppressFeedback

        const taskDesc = getTaskSummary(completedTask)
        taskSummary.desc = taskDesc

        setCurrentLevel(prevLevel => ({
            ...prevLevel,
            currentTask: { id: getRandomInt(), type: TaskType.BLANK },
            completedTasks: [...prevLevel.completedTasks, {
                ...prevLevel.currentTask
            }],
            summaries: [...(prevLevel.summaries || []), taskSummary],
            currentScore: prevLevel.currentScore + taskSummary.score,
            currentPenalties: prevLevel.currentPenalties + taskSummary.counts.penalties
        }))

        if (suppressFeedback) {
            gotoNextTask({ stopVoiceFirst: true })
        } else {
            if (isSuccess === true) {
                setFeedback("Task.GOOD")
            } else if (isSuccess === false) {
                setFeedback("Task.BAD")
            }
            setTimeout(() => {
                gotoNextTask()
            }, 2000)
        }
    }


    // console.log(currentLevel?.summaries);
    // return <Gameover />

    return (
        <React.Fragment>
            {playState === PlayState.NOT_PLAYING && (
                <div className='margin-y'>
                    <div className="row-centered ">
                        <h2 className="margin-y">Get Ready!</h2>
                    </div>
                    <div className="row-centered">
                        <button className="padding-x button button-primary" onClick={() => void handleBeginPlay()}>begin</button>
                    </div>
                </div>
            )}
            {playState === PlayState.PAUSED && (
                <div className="row-centered">
                    <button className="padding-x button button-primary" onClick={() => setPlayState(PlayState.PLAYING)}>Resume</button>
                    <button
                        className="padding-x button"
                        onClick={handleCancelClick}>
                        {getCancelButtonText()}
                    </button>
                </div>
            )}
            {playState === PlayState.PLAYING && (
                <div>
                    <div style={{ position: 'relative', minHeight: '0px' }}>
                        {/* Time limit on a given task */}
                        {currentLevel.currentTask != null && currentLevel.currentTask.type !== TaskType.CALIBRATION && (
                            <CountdownTimer
                                key={currentLevel.currentTask.id + 1}
                                onTimeElapsed={() => {
                                    // Rest+ballsBonus: RestBallsBonus handles completion
                                    const task = currentLevel.currentTask
                                    if ((task?.type === TaskType.REST || task?.type === 'rest ball') && task?.ballsBonus) {
                                        return
                                    }
                                    // these just transition to next task
                                    if (task?.type === TaskType.REST ||
                                        task?.type === 'rest ball' ||
                                        task?.type === TaskType.GETREADY) {
                                        gotoNextTask()
                                    }
                                    // we have finished a load
                                    else if (currentLevel.currentTask?.type === TaskType.FINISH) {
                                        gotoNextTaskAddFinish()
                                    }
                                }}
                            />
                        )}
                    </div>
                    <div className="row-centered">
                        {DEBUG && <button className="padding-x button" onClick={gotoNextTask}>
                            Next Task
                        </button>}
                        {!DEBUG && <div style={{ height: '40px' }} />}
                        {!DEBUG && <CurrentShaft />}
                    </div>
                    {/* Hold at microSD Express cardsa depth, possibly repeat */}
                    {currentLevel?.currentTask?.type === TaskType.ENDLESS && (
                        <EndlessDive
                            key={currentLevel.currentTask.id + 1}
                            task={currentLevel.currentTask}
                            onTaskOver={onTaskOver}
                            priorScore={currentLevel?.currentScore ?? 0}
                        />
                    )}
                    {/* Hold at microSD Express cardsa depth, possibly repeat */}
                    {currentLevel?.currentTask?.type === TaskType.HOLDPOSITION && (
                        <HoldDepth
                            key={currentLevel.currentTask.id + 2}
                            task={currentLevel.currentTask}
                            onTaskOver={onTaskOver}
                        />
                    )}
                    {/* Hit a depth multiple times */}
                    {currentLevel?.currentTask?.type === TaskType.HITDEPTH && (
                        <HitDepth
                            key={currentLevel.currentTask.id + 3}
                            task={currentLevel.currentTask}
                            onTaskOver={onTaskOver}
                        />
                    )}
                    {/* Dive up and down */}
                    {currentLevel?.currentTask?.type === TaskType.UPANDDOWN && (
                        <Diving
                            key={currentLevel.currentTask.id + 4}
                            task={currentLevel.currentTask}
                            onTaskOver={onTaskOver}
                        />
                    )}

                    {currentLevel.currentTask?.type === TaskType.CLAP && (
                        <ClapDetector
                            targetClaps={currentLevel.currentTask.repeat}
                            timeLimit={currentLevel.currentTask.timeLimit || calculateClapTimeLimit(currentLevel.currentTask.repeat)}
                            onTaskComplete={onTaskOver}
                        />
                    )}
                    {currentLevel.currentTask?.type === TaskType.SPEAK && (
                        <SpeakDetector
                            key={currentLevel.currentTask.id}
                            task={currentLevel.currentTask}
                            timeLimit={currentLevel.currentTask.timeLimit || calculateSpeakTimeLimit(currentLevel.currentTask.repeat)}
                            onTaskComplete={onTaskOver}
                        />
                    )}
                    {currentLevel?.currentTask?.type === TaskType.HOLDANDCLAP && (
                        <HoldAndClapDetector
                            key={currentLevel.currentTask.id + 5}
                            task={currentLevel.currentTask}
                            onTaskComplete={onTaskOver}
                        />
                    )}
                    {(currentLevel?.currentTask?.type === TaskType.REST || currentLevel?.currentTask?.type === 'rest ball') &&
                        currentLevel?.currentTask?.ballsBonus && hasBallsGrids && (
                        <RestBallsBonus
                            key={currentLevel.currentTask.id + 6}
                            task={currentLevel.currentTask}
                            onTaskOver={onTaskOver}
                        />
                    )}
                </div>
            )}
            {/* debug show me the current summaries, one line each. task_type and score */}
            {DEBUG && <pre>{currentLevel?.summaries?.map(s => `${s.type}: ${s.score}`).join('\n')}</pre>}
            {DEBUG && <pre>{JSON.stringify(currentLevel, null, 2)}</pre>}
            {/* add some white space at the bottom 400px - useful player lighting */}
            {!DEBUG && <div style={{ height: '400px' }}></div>}
        </React.Fragment>
    )
}

export default Playing


