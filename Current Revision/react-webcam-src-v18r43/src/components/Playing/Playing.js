import React from 'react';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import RestCapture from './RestCapture';
// helpers
import { getRandomInt } from '../randomInt';
import { TaskType, getTaskSummary, calculateClapTimeLimit, calculateSpeakTimeLimit } from '../Tasks/task';
import { isPlausibleBpm } from './diveTempo';
import * as NAV from '../../atoms/navAtom';
import { executableService } from '../../services/executableService';
// atoms
import { useAtom, useSetAtom, useAtomValue } from 'jotai';
import {
    playerProfilesAtom,
    normalizePlayerProfilesState,
    getResolvedActiveProfileId,
} from '../../atoms/playerAtom';
import { mergeLevelCaptureDefaults } from '../../constants/captureLevelDefaults';
import * as captureService from '../../services/captureService';
import { useCaptureManager } from '../../hooks/useCaptureManager';
import { INITIAL_CAPTURE_SESSION, captureSessionAtom } from '../../atoms/captureAtom';
import { feedbackAtom, sfxAtom, captureSfxAtom, stopVoiceRequestAtom, musicPlaybackSessionAtom, musicFadeOutEnabledAtom, musicFadeOutDurationAtom } from '../../atoms/audioAtom';
import { currentLevelAtom, playStateAtom, playTimeAtom, PlayState } from '../../atoms/taskAtom';
import { preserveVibrationAtom, vibrateSpeedAtom } from '../../atoms/buttplugAtom';
import { navAtom } from '../../atoms/navAtom';
import { gridsAtom } from '../../atoms/gridAtoms';
import { externalIntegrationService } from '../../services/externalIntegrationService';
import { levelManager } from '../../services/levelManager';
import { audioProcessingService } from '../../services/audioProcessingService';
import { resolveBackgroundMusicTrack } from '../../utils/backgroundMusicResolver';
import { store } from '../../store';
import { useExternalTimers } from '../../hooks/useExternalTimers';
import { calibrationService } from '../../services/calibrationService';
import {
    startGameplayMic,
    stopGameplayMic,
    isGameplayMicActive,
    scheduleStopGameplayMic,
    ensureGameplayMicBeforeResume,
} from '../../services/gameplayMicSession';
import { clearInstructionWarmup } from '../../services/instructionAudioWarmup';
import { useClapInstructionPhase, useSpeakRecognitionGate } from '../../hooks/useSpeakRecognitionGate';
import { clearMusicPlaybackSession } from '../../utils/musicPlaybackSessionStore';
import { useTaskCountdownLeft } from '../../hooks/useTaskCountdownLeft';

async function applyMusicPlaybackSessionForLevel(levelRuntime) {
    if (!levelRuntime?.id) return
    const def = levelManager.getLevel(levelRuntime.id) || {}
    const merged = { ...def, ...levelRuntime }
    const ctx = await audioProcessingService.ensureAudioContext()
    await ctx.resume()
    const url = await resolveBackgroundMusicTrack(merged, {
        cliTrackId: externalIntegrationService.getBackgroundMusicId()
    })
    store.set(musicPlaybackSessionAtom, (prev) => {
        if (prev.url == null && url == null) {
            return prev
        }
        return {
            url,
            generation: prev.generation + 1,
            stopFade: false
        }
    })
}

// Playing handles the transition between tasks of a scenario
function Playing() {
    // atoms
    const setSfx = useSetAtom(sfxAtom)
    const setCaptureSfx = useSetAtom(captureSfxAtom)
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
    const [beginLoading, setBeginLoading] = useState(false)
    const [resumeLoading, setResumeLoading] = useState(false)

    const playerProfiles = useAtomValue(playerProfilesAtom)
    const normalizedProfiles = useMemo(
        () => normalizePlayerProfilesState(playerProfiles),
        [playerProfiles]
    )
    const activeProfileId = getResolvedActiveProfileId(normalizedProfiles)
    const activeProfile = normalizedProfiles.profiles[activeProfileId]

    const levelForCapture = useMemo(() => {
        if (!currentLevel?.id) return null
        const def = levelManager.getLevel(currentLevel.id) || {}
        const canonicalTasks =
            Array.isArray(def.tasks) && def.tasks.length > 0 ? def.tasks : currentLevel.tasks
        return mergeLevelCaptureDefaults({
            ...def,
            ...currentLevel,
            tasks: canonicalTasks,
            title: def.title || currentLevel.title || currentLevel.id,
        })
    }, [currentLevel])

    const [cliCapturesEnabled, setCliCapturesEnabled] = useState(false)
    useEffect(() => {
        void externalIntegrationService.isCapturesEnabled().then(setCliCapturesEnabled)
    }, [])

    const captureGate = useMemo(() => {
        if (!captureService.isElectronPackaged()) return false
        if (!levelForCapture) return false
        if (!captureService.runCapturesPreflight(activeProfile, levelForCapture).allowed) return false
        const ext = externalIntegrationService.isExternalMode()
        if (ext) return cliCapturesEnabled
        return levelForCapture.capturesUserEnabled === true
    }, [levelForCapture, activeProfile, cliCapturesEnabled])

    const capturesTakePhotosCheckboxEligible = useMemo(() => {
        if (!captureService.isElectronPackaged()) return false
        if (!levelForCapture) return false
        if (externalIntegrationService.isExternalMode() || externalIntegrationService.isAutoStartMode()) {
            return false
        }
        return captureService.runCapturesPreflight(activeProfile, levelForCapture).allowed
    }, [levelForCapture, activeProfile])

    const hiddenCaptureNotificationsNoticeEligible = useMemo(() => {
        if (!capturesTakePhotosCheckboxEligible || !levelForCapture) return false
        return captureService.runHiddenNotificationsPreflight(activeProfile, levelForCapture).allowed
    }, [capturesTakePhotosCheckboxEligible, activeProfile, levelForCapture])

    const { signalCaptureWindow, waitForRecordingSafe, capturesEnabled } = useCaptureManager({
        level: levelForCapture,
        playState,
        activeProfile,
        captureGate,
    })

    const isLastTask = currentLevel?.tasks?.length === 0


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
        const { stopVoiceFirst = false, startingBpm, skipHandoff = false } = options
        if (stopVoiceFirst) {
            setStopVoiceRequest(prev => prev + 1)
        }
        if (!currentLevel) return
        if (currentLevel.tasks.length === 0) {
            console.log('no more tasks')
            clearMusicPlaybackSession()
            // No next task to carry vibration into: clear any handoff and stop.
            store.set(preserveVibrationAtom, false)
            store.set(vibrateSpeedAtom, 0)
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
            let next = currentLevel.tasks[0]
            if (skipHandoff || startingBpm != null) {
                next = { ...next }
                if (skipHandoff) next.skipHandoff = true
                if (startingBpm != null && next.type === TaskType.UPANDDOWN) {
                    next.startingBpm = startingBpm
                }
            }
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
        setCaptureSfx(0)
        if (stopVoiceFirst) {
            setFeedback(0)
        }
    }, [currentLevel, setCurrentLevel, setPlayState, setNav, setSfx, setCaptureSfx, setFeedback, setStopVoiceRequest])

    /**
     * Shared begin path: calibration import (when applicable), resume AudioContext, mic + BGM, then first task.
     * Matches handleBeginPlay / CLI auto-start so behavior cannot drift.
     */
    const runBeginPlayPipeline = useCallback(
        async (levelSnapshot, options = {}) => {
            const { alertOnMicAudioFailure = true, isCancelled } = options

            const isExternalMode = externalIntegrationService.isExternalMode()
            if (isExternalMode && !externalIntegrationService.shouldSkipCalibration()) {
                const calibrationPath = externalIntegrationService.getCalibrationDataPath()
                if (calibrationPath && window.electronAPI && window.electronAPI.readCalibrationFile) {
                    const calResult = await window.electronAPI.readCalibrationFile(calibrationPath)
                    if (calResult.success && calResult.data) {
                        const importResult = await calibrationService.importCalibration(calResult.data)
                        if (!importResult.success) {
                            console.error('Failed to import calibration data:', importResult.errors)
                        }
                    }
                }
            }

            try {
                await audioProcessingService.resumeAudioContextIfSuspended()
            } catch (err) {
                console.warn('resumeAudioContextIfSuspended:', err)
            }

            try {
                await startGameplayMic()
                if (!isGameplayMicActive()) {
                    return { ok: false, code: 'mic_inactive' }
                }
                await applyMusicPlaybackSessionForLevel(levelSnapshot)
            } catch (e) {
                stopGameplayMic()
                console.error('Could not start level audio/microphone:', e)
                if (alertOnMicAudioFailure) {
                    window.alert(
                        e?.message || 'Could not access the microphone. Clap tasks need mic permission.'
                    )
                }
                return { ok: false, code: 'mic_audio_error', error: e }
            }

            if (isCancelled?.()) {
                stopGameplayMic()
                return { ok: false, code: 'cancelled' }
            }

            store.set(captureSessionAtom, { ...INITIAL_CAPTURE_SESSION })

            setPlayState(PlayState.PLAYING)
            setPlayTime(0)
            setCurrentLevel((prevLevel) => ({
                ...prevLevel,
                currentPenalties: 0,
            }))
            gotoNextTask()
            return { ok: true }
        },
        [gotoNextTask, setPlayState, setPlayTime, setCurrentLevel]
    )

    // Auto-start when CLI passes --auto-start (same pipeline as handleBeginPlay)
    useEffect(() => {
        const isExternalMode = externalIntegrationService.isExternalMode()
        const isAutoStart = externalIntegrationService.isAutoStartMode()
        const shouldAutoStart =
            isExternalMode &&
            isAutoStart &&
            playState === PlayState.PLAYING &&
            currentLevel &&
            !currentLevel.currentTask

        if (!shouldAutoStart) {
            return undefined
        }

        let cancelled = false

        void (async () => {
            const result = await runBeginPlayPipeline(currentLevel, {
                alertOnMicAudioFailure: false,
                isCancelled: () => cancelled,
            })

            if (cancelled) return

            if (!result.ok && result.code !== 'cancelled') {
                console.error('CLI auto-start begin failed:', result.code, result.error)
                if (window.electronAPI?.requestExit) {
                    window.electronAPI.requestExit(
                        6,
                        typeof result.code === 'string' ? result.code : 'begin_play_failed'
                    )
                }
            }
        })()

        return () => {
            cancelled = true
        }
    }, [playState, currentLevel, runBeginPlayPipeline])

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
    useClapInstructionPhase();

    const finishTask =
        currentLevel?.currentTask?.type === TaskType.FINISH ? currentLevel.currentTask : null
    const finishTimeLeft = useTaskCountdownLeft(finishTask)
    const finishTimeLeftRef = useRef(finishTimeLeft)
    finishTimeLeftRef.current = finishTimeLeft
    useEffect(() => {
        if (!finishTask || !capturesEnabled) return undefined
        const id = setInterval(() => {
            signalCaptureWindow(true, {
                photos: true,
                videos: finishTimeLeftRef.current >= 6,
            })
        }, 1000)
        return () => clearInterval(id)
    }, [finishTask, capturesEnabled, signalCaptureWindow])

    // Increment play time every second when playing (runs here so it works when nav is hidden in auto-start mode)
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

    async function cancelLevel() {
        await waitForRecordingSafe()
        stopGameplayMic()
        clearInstructionWarmup()
        clearMusicPlaybackSession(true)
        // Cancel never carries vibration forward; clear the handoff and stop the device
        // (cancel relies on unmount today, which the preserve flag would otherwise skip).
        store.set(preserveVibrationAtom, false)
        store.set(vibrateSpeedAtom, 0)
        setCurrentLevel(null)
        setPlayState(PlayState.NOT_PLAYING)
        const cliLevelId = externalIntegrationService.getLevelId()
        if (cliLevelId && window.electronAPI?.requestExit) {
            window.electronAPI.requestExit(1, 'level_cancelled')
            return
        }
        setNav(NAV.TRAINING)
    }

    async function handleResume() {
        setResumeLoading(true)
        try {
            await ensureGameplayMicBeforeResume()
            if (!isGameplayMicActive()) {
                window.alert('Microphone could not be restarted. Check permissions and try again.')
                return
            }
            setPlayState(PlayState.PLAYING)
        } catch (e) {
            console.error('Resume: microphone error:', e)
            window.alert(e?.message || 'Could not access the microphone for gameplay.')
        } finally {
            setResumeLoading(false)
        }
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
                    void cancelLevel()
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
        setBeginLoading(true)
        try {
            await runBeginPlayPipeline(currentLevel, { alertOnMicAudioFailure: true })
        } finally {
            setBeginLoading(false)
        }
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

    function onTaskOver(taskSummary, isSuccess, extras = {}) {
        const completedTask = currentLevel.currentTask
        const suppressFeedback = !!completedTask?.suppressFeedback
        let startingBpm
        if (
            suppressFeedback &&
            completedTask?.type === TaskType.UPANDDOWN &&
            isPlausibleBpm(extras.lastBpm)
        ) {
            startingBpm = extras.lastBpm
        }

        const taskDesc = getTaskSummary(completedTask)
        taskSummary.desc = taskDesc

        setCurrentLevel(prevLevel => ({
            ...prevLevel,
            currentTask: { id: getRandomInt(), type: TaskType.BLANK },
            completedTasks: [...prevLevel.completedTasks, {
                ...prevLevel.currentTask
            }],
            summaries: [...(prevLevel.summaries || []), taskSummary],
            currentScore:
                prevLevel.currentScore +
                (Number.isFinite(Number(taskSummary.score)) ? Number(taskSummary.score) : 0),
            currentPenalties:
                prevLevel.currentPenalties + (taskSummary.counts?.penalties ?? 0),
        }))

        if (suppressFeedback) {
            const hasNext = currentLevel.tasks.length > 0
            if (hasNext) {
                // Preserve vibration across the immediate remount; clear after the
                // unmounting task's cleanup has run (microtask), so the next task starts
                // owning intensity again without a drop to zero.
                store.set(preserveVibrationAtom, true)
            }
            gotoNextTask({ stopVoiceFirst: true, startingBpm, skipHandoff: hasNext })
            if (hasNext) {
                queueMicrotask(() => store.set(preserveVibrationAtom, false))
            }
        } else {
            store.set(preserveVibrationAtom, false)
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
                        <button
                            type="button"
                            className={`padding-x button${beginLoading ? '' : ' button-primary'}`}
                            disabled={beginLoading}
                            aria-busy={beginLoading}
                            style={
                                beginLoading
                                    ? {
                                          backgroundColor: 'var(--surface)',
                                          color: 'var(--ink)',
                                          border: '1px solid var(--line)',
                                          cursor: 'wait',
                                      }
                                    : undefined
                            }
                            onClick={() => void handleBeginPlay()}
                        >
                            {beginLoading ? 'Loading...' : 'begin'}
                        </button>
                    </div>
                    {capturesTakePhotosCheckboxEligible && (
                        <div
                            className="column-centered margin-y-sm"
                            style={{ gap: '1px' }}
                        >
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                <input
                                    type="checkbox"
                                    checked={currentLevel.capturesUserEnabled === true}
                                    onChange={(e) =>
                                        setCurrentLevel((prev) => ({
                                            ...prev,
                                            capturesUserEnabled: e.target.checked,
                                        }))
                                    }
                                />
                                Take Photos/Videos
                            </label>
                            {hiddenCaptureNotificationsNoticeEligible && (
                                <div
                                    style={{
                                        fontSize: '0.95rem',
                                        color: 'var(--text-secondary)',
                                        maxWidth: 480,
                                    }}
                                >
                                    This level may use hidden capture notifications (based on task settings).
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
            {playState === PlayState.PAUSED && (
                <div className="row-centered">
                    <button
                        type="button"
                        className={`padding-x button${resumeLoading ? '' : ' button-primary'}`}
                        disabled={resumeLoading}
                        aria-busy={resumeLoading}
                        onClick={() => void handleResume()}
                    >
                        {resumeLoading ? 'Resuming…' : 'Resume'}
                    </button>
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
                            onSignalCaptureWindow={capturesEnabled ? signalCaptureWindow : undefined}
                            isLastTask={isLastTask}
                        />
                    )}
                    {/* Hold at microSD Express cardsa depth, possibly repeat */}
                    {currentLevel?.currentTask?.type === TaskType.HOLDPOSITION && (
                        <HoldDepth
                            key={currentLevel.currentTask.id + 2}
                            task={currentLevel.currentTask}
                            onTaskOver={onTaskOver}
                            onSignalCaptureWindow={capturesEnabled ? signalCaptureWindow : undefined}
                            isLastTask={isLastTask}
                        />
                    )}
                    {/* Hit a depth multiple times */}
                    {currentLevel?.currentTask?.type === TaskType.HITDEPTH && (
                        <HitDepth
                            key={currentLevel.currentTask.id + 3}
                            task={currentLevel.currentTask}
                            onTaskOver={onTaskOver}
                            onSignalCaptureWindow={capturesEnabled ? signalCaptureWindow : undefined}
                            isLastTask={isLastTask}
                        />
                    )}
                    {/* Dive up and down */}
                    {currentLevel?.currentTask?.type === TaskType.UPANDDOWN && (
                        <Diving
                            key={currentLevel.currentTask.id + 4}
                            task={currentLevel.currentTask}
                            onTaskOver={onTaskOver}
                            onSignalCaptureWindow={capturesEnabled ? signalCaptureWindow : undefined}
                            isLastTask={isLastTask}
                        />
                    )}

                    {currentLevel.currentTask?.type === TaskType.CLAP && (
                        <ClapDetector
                            key={currentLevel.currentTask.id}
                            targetClaps={currentLevel.currentTask.repeat}
                            timeLimit={currentLevel.currentTask.timeLimit || calculateClapTimeLimit(currentLevel.currentTask.repeat)}
                            onTaskComplete={onTaskOver}
                            hasInstructionAudio={Boolean(String(currentLevel.currentTask.audio ?? '').trim())}
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
                            onSignalCaptureWindow={capturesEnabled ? signalCaptureWindow : undefined}
                            isLastTask={isLastTask}
                        />
                    )}
                    {(currentLevel?.currentTask?.type === TaskType.REST || currentLevel?.currentTask?.type === 'rest ball') &&
                        currentLevel?.currentTask?.ballsBonus && hasBallsGrids && (
                        <RestBallsBonus
                            key={currentLevel.currentTask.id + 6}
                            task={currentLevel.currentTask}
                            onTaskOver={onTaskOver}
                            onSignalCaptureWindow={capturesEnabled ? signalCaptureWindow : undefined}
                            isLastTask={isLastTask}
                        />
                    )}
                    {(currentLevel?.currentTask?.type === TaskType.REST ||
                        currentLevel?.currentTask?.type === 'rest ball') &&
                        capturesEnabled &&
                        !currentLevel?.currentTask?.ballsBonus && (
                        <RestCapture
                            key={`rest-cap-${currentLevel.currentTask.id}`}
                            task={currentLevel.currentTask}
                            isLastTask={isLastTask}
                            onSignalCaptureWindow={signalCaptureWindow}
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


