import { useState, useEffect, useRef, useCallback } from 'react';
// helpers
import * as NAV from '../../atoms/navAtom';
// atoms
import { useAtom, useSetAtom, useAtomValue } from 'jotai';
import { currentLevelAtom, playTimeAtom, Rank, levelRunGenerationAtom } from '../../atoms/taskAtom';
import { captureSessionAtom } from '../../atoms/captureAtom';
import { feedbackAtom } from '../../atoms/audioAtom';
import { navAtom } from '../../atoms/navAtom';
import { store } from '../../store';
import {
    playerProfilesAtom,
    normalizePlayerProfilesState,
    getResolvedActiveProfileId,
} from '../../atoms/playerAtom';
import { computeLevelCompletionUpdate } from '../../utils/levelCompletionPersistence';
import { evaluateSessionEnd } from '../../utils/sessionEndRank';
import { externalIntegrationService } from '../../services/externalIntegrationService';
import { sessionExportService } from '../../services/sessionExportService';
import { levelManager } from '../../services/levelManager';
import { getLevelsNewlyUnlockedByPrerequisites } from '../../services/levelPrerequisiteService';
import { showHiddenContentAtom } from '../../atoms/hiddenContentAtom';
import { getSummaryAudioRef } from '../../services/summaryAudio';
import { stopGameplayMic } from '../../services/gameplayMicSession';
import { clearInstructionWarmup } from '../../services/instructionAudioWarmup';

import { TaskType } from '../Tasks/task';
import { formatTime } from '../../constants/helpers'
import { STR } from '../../constants/stringsreplace';

// Show some game over result
function Gameover() {

    // atoms
    const setFeedback = useSetAtom(feedbackAtom);
    const setNav = useSetAtom(navAtom);
    const [playTime, setPlayTime] = useAtom(playTimeAtom);
    const captureSession = useAtomValue(captureSessionAtom);
    const [newlyUnlocked, setNewlyUnlocked] = useState([]);
    const [levelsUnlockedByPrerequisites, setLevelsUnlockedByPrerequisites] = useState([]);

    const [currentLevel] = useAtom(currentLevelAtom);
    const [levelPlayTime, setLevelPlayTime] = useState(0);
    /** Snapshot for external export: wait until React state matches before writing JSON. */
    const pendingExternalExportRef = useRef(null);
    /** Prevents duplicate export attempts for the same level run. */
    const exportedRunKeyRef = useRef('');
    const processedCompletionKeyRef = useRef('');
    const [countdown, setCountdown] = useState(null); // null = not counting, number = seconds remaining

    const [playerRank, setPlayerRank] = useState(Rank.FAILED);
    const [scoreThresholds, setScoreThresholds] = useState({
        perfect: 0,
        pass: 0,
        master: 0,
        journeyman: 0,
        apprentice: 0
    });

    // Leaving Gameover (any nav): stop gameplay mic immediately and clear deferred stop from Playing unmount.
    // Matches cancelLevel; avoids mic staying live until music fade + 150ms when user switches tabs.
    useEffect(() => {
        return () => {
            stopGameplayMic()
            clearInstructionWarmup()
        }
    }, [])

    console.log('currentLevel', currentLevel);

    // Calculate total penalties
    const getTotalPenalties = useCallback(() => {
        let total = 0;
        if (!currentLevel?.summaries) return 0;

        for (const summary of currentLevel.summaries) {
            total += (summary.counts?.penalties || 0);
        }
        return total;
    }, [currentLevel]);

    // Helper functions to get detailed stats from summaries
    const getTotalHoldTimeForDepth = useCallback((depth) => {
        if (!currentLevel?.summaries) return 0;
        return currentLevel.summaries.reduce((total, summary) => {
            if (summary.type === TaskType.ENDLESS && summary.holdTimeByDepth) {
                return total + (summary.holdTimeByDepth[depth] || 0);
            }
            if ((summary.type === 'hold' || summary.type === TaskType.HOLDANDCLAP) && summary.targetDepth === depth) {
                return total + (summary.totalTimeHeld || 0);
            }
            return total;
        }, 0);
    }, [currentLevel]);

    const getTotalDivesForDepth = useCallback((depth) => {
        if (!currentLevel?.summaries) return 0;
        return currentLevel.summaries.reduce((total, summary) => {
            if (summary.type === TaskType.ENDLESS && summary.divesByDepth) {
                return total + (summary.divesByDepth[depth] || 0);
            }
            if ((summary.type === TaskType.UPANDDOWN || summary.type === TaskType.HITDEPTH) &&
                (summary.maxDepth === depth || summary.targetDepth === depth)) {
                let diveCount = 0
                if (typeof summary.dives === 'number') {
                    diveCount = summary.dives
                } else if (summary.type === TaskType.HITDEPTH && typeof summary.hits === 'number') {
                    diveCount = summary.hits
                } else {
                    diveCount =
                        (summary.counts?.perfect || 0) + (summary.counts?.pass || 0)
                }
                return total + diveCount
            }
            return total;
        }, 0);
    }, [currentLevel]);

    const getPerfectTaskCount = useCallback((taskType) => {
        if (!currentLevel?.summaries) return 0
        // Map the TaskType enum keys to their actual values
        const taskTypeMap = {
            [TaskType.HOLDPOSITION]: 'hold',
            [TaskType.UPANDDOWN]: 'updown',
            [TaskType.HITDEPTH]: 'hitdepth',
            [TaskType.HOLDANDCLAP]: 'holdandclap'
        }
        const searchType = taskTypeMap[taskType] || taskType
        return currentLevel.summaries
            .filter(summary => summary.type === searchType)
            .reduce((total, summary) =>
                total + (summary.counts.perfect || 0), 0)
    }, [currentLevel])

    // only run once - get the scores we need
    // and upate the player stats
    useEffect(() => {
        // guard against empty level
        if (!currentLevel) { return }

        const {
            perfect,
            roundedPass,
            roundedMaster,
            roundedJourneyman,
            rank: newRank,
        } = evaluateSessionEnd(currentLevel)

        setScoreThresholds({
            perfect: perfect,
            master: roundedMaster,
            journeyman: roundedJourneyman,
            pass: roundedPass,
        })

        setPlayerRank(newRank)
        // Capture playTime once - do not add to effect deps to prevent re-runs when setPlayTime(0)
        const playTimeValue = playTime
        const runGenForExport = store.get(levelRunGenerationAtom)
        pendingExternalExportRef.current = {
            runKey: `${currentLevel.id}:${runGenForExport}`,
            expectedPlayTime: playTimeValue,
            expectedRank: newRank,
        }
        setLevelPlayTime(playTimeValue)
        setPlayTime(0)

        const playerScore = currentLevel?.currentScore || 0

        const levelDefinition = levelManager.getLevel(currentLevel.id)
        const soft = levelDefinition?.soft ?? currentLevel.soft ?? false
        const summaryRef = getSummaryAudioRef(levelDefinition, newRank, soft)
        if (summaryRef) {
            setFeedback(summaryRef)
        }

        // guard again DISQUALFIED
        if (newRank === Rank.DISQUALIFIED) { return }

        const runGen = store.get(levelRunGenerationAtom)
        const completionKey = `${currentLevel.id}:${runGen}`
        const alreadyPersisted = processedCompletionKeyRef.current === completionKey
        if (!alreadyPersisted) {
            processedCompletionKeyRef.current = completionKey

            const pp = normalizePlayerProfilesState(store.get(playerProfilesAtom))
            const activeId = getResolvedActiveProfileId(pp)
            const profile = pp.profiles[activeId]
            if (profile?.statTrackingEnabled) {
                const update = computeLevelCompletionUpdate({
                    profile,
                    currentLevel,
                    newRank,
                    playerScore,
                    playTimeValue,
                    getTotalHoldTimeForDepth,
                    getTotalDivesForDepth,
                    getPerfectTaskCount,
                    getTotalPenalties,
                })

                store.set(playerProfilesAtom, (prev) => {
                    const n = normalizePlayerProfilesState(prev)
                    const id = n.activeProfileId
                    const prof = n.profiles[id]
                    return {
                        ...n,
                        profiles: {
                            ...n.profiles,
                            [id]: {
                                ...prof,
                                timeStats: update.timeStats,
                                diveStats: update.diveStats,
                                sessionStats: update.sessionStats,
                                achievements: update.achievements,
                            },
                        },
                    }
                })

                const showHidden = store.get(showHiddenContentAtom)
                const nextProfile = {
                    ...profile,
                    timeStats: update.timeStats,
                    diveStats: update.diveStats,
                    sessionStats: update.sessionStats,
                    achievements: update.achievements,
                }
                setLevelsUnlockedByPrerequisites(
                    getLevelsNewlyUnlockedByPrerequisites(profile, nextProfile, showHidden)
                )

                setNewlyUnlocked(update.newlyUnlockedIds)
            } else {
                setNewlyUnlocked([])
                setLevelsUnlockedByPrerequisites([])
            }
        }

        // Intentionally minimal deps: playTime excluded to prevent re-runs when setPlayTime(0) fires.
        // Persist-once is guarded by processedCompletionKeyRef + levelRunGenerationAtom.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        currentLevel,
        getPerfectTaskCount,
        getTotalDivesForDepth,
        getTotalHoldTimeForDepth,
        getTotalPenalties
    ])

    console.log("summaries", currentLevel?.summaries);

    // Calculate total dives (updown, hitdepth, and endless dive counts)
    const getTotalDives = () => {
        let total = 0;
        if (!currentLevel?.summaries) return 0;

        for (const summary of currentLevel.summaries) {
            if (summary.type === TaskType.ENDLESS) {
                total += summary.counts?.dives ?? 0;
            } else if (
                summary.type === TaskType.UPANDDOWN ||
                summary.type === TaskType.HITDEPTH
            ) {
                total +=
                    (summary.counts?.perfect || 0) + (summary.counts?.pass || 0);
            }
        }
        return total;
    };

    // Calculate total hold time (hold-depth, hold+clap, and endless)
    const getTotalHoldTime = () => {
        let total = 0;
        if (!currentLevel?.summaries) return 0;

        for (const summary of currentLevel.summaries) {
            if (
                summary.type === TaskType.HOLDPOSITION ||
                summary.type === TaskType.HOLDANDCLAP ||
                summary.type === TaskType.ENDLESS
            ) {
                total += summary.totalTimeHeld || 0;
            }
        }
        return total;
    };

    const diveLoads = currentLevel.finishedLoads || 0

    // Handle external mode completion (after playerRank / levelPlayTime match rank effect snapshot)
    useEffect(() => {
        if (!currentLevel) {
            return;
        }

        const isExternalMode = externalIntegrationService.isExternalMode();
        if (!isExternalMode) {
            return;
        }

        const currentNav = store.get(navAtom);
        if (currentNav !== NAV.GAMEOVER) {
            return;
        }

        const runGen = store.get(levelRunGenerationAtom);
        const runKey = `${currentLevel.id}:${runGen}`;
        const pending = pendingExternalExportRef.current;
        if (!pending || pending.runKey !== runKey) {
            return;
        }
        if (
            levelPlayTime !== pending.expectedPlayTime ||
            playerRank !== pending.expectedRank
        ) {
            return;
        }
        if (exportedRunKeyRef.current === runKey) {
            return;
        }

        exportedRunKeyRef.current = runKey;

        const completionStatus =
            currentLevel.status === 'complete' ? 'completed' : 'error';

        async function handleExternalCompletion() {
            const sessionData = sessionExportService.formatSessionData(
                currentLevel,
                levelPlayTime,
                completionStatus
            );

            let outputPath = 'session_results.json';
            const cliOutputPath = externalIntegrationService.getOutputPath();
            if (cliOutputPath) {
                outputPath = cliOutputPath;
            }

            const countdownDuration = 15;
            setCountdown(countdownDuration);

            const exportResult = await sessionExportService.exportSessionResults(
                sessionData,
                outputPath
            );

            if (exportResult.success) {
                let exitCode = 0;
                if (completionStatus === 'calibration_timeout') exitCode = 2;
                else if (completionStatus === 'pause_timeout') exitCode = 3;
                else if (completionStatus === 'level_not_found') exitCode = 4;
                else if (completionStatus === 'error') exitCode = 5;

                setTimeout(() => {
                    if (window.electronAPI && window.electronAPI.requestExit) {
                        window.electronAPI.requestExit(exitCode, completionStatus);
                    }
                }, 15000);
            } else {
                setTimeout(() => {
                    if (window.electronAPI && window.electronAPI.requestExit) {
                        window.electronAPI.requestExit(5, 'export_failed');
                    }
                }, 15000);
            }
        }

        void handleExternalCompletion();
    }, [currentLevel, levelPlayTime, playerRank]);

    // Countdown timer effect
    useEffect(() => {
        if (countdown === null || countdown <= 0) {
            return;
        }

        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [countdown]);

    // clean up and go back to level select (session reset runs in App when leaving GAMEOVER)
    const onReturnToMenu = () => {
        // In external mode, don't allow returning to menu (will auto-close)
        if (externalIntegrationService.isExternalMode()) {
            return;
        }
        setNav(NAV.TRAINING)
    }

    const isExternalMode = externalIntegrationService.isExternalMode();

    return (
        <div>
            {/* Countdown timer - only visible in external mode */}
            {isExternalMode && countdown !== null && (
                <div className="margin-y-sm" style={{ 
                    fontSize: '1.2em', 
                    fontWeight: 'bold',
                    textAlign: 'center',
                    color: '#666',
                    padding: '10px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '5px'
                }}>
                    {`Closing in ${countdown} seconds...`}
                </div>
            )}
            <div className="column-centered">
                <h3 className="margin-y-sm">Level Complete</h3>

                <h4 className='margin-y-sm'>Final Grade</h4>
                <h1 className='margin-y-sm'>{STR.rankStr(playerRank)}</h1>
                <h4 className="margin-y">
                    Score: <span className="not-a-button padding-x">{currentLevel?.currentScore || 0}</span>
                    <span className="margin-x">·</span>
                    Time: <span className="not-a-button padding-x">{formatTime(levelPlayTime || 0)}</span>
                </h4>
            </div>

            {levelsUnlockedByPrerequisites.length > 0 && (
                <div className="margin-y card achievement-card">
                    <h4>
                        🔓{' '}
                        {levelsUnlockedByPrerequisites.length === 1
                            ? 'Level unlocked'
                            : 'Levels unlocked'}
                    </h4>
                    <p className="margin-y-sm" style={{ opacity: 0.95 }}>
                        {levelsUnlockedByPrerequisites.length === 1
                            ? 'Completing this session met the last requirement to unlock:'
                            : 'Completing this session met requirements to unlock:'}
                    </p>
                    {levelsUnlockedByPrerequisites.map((lvl) => (
                        <div key={lvl.id} className="card-row border-bottom">
                            <span>
                                <strong>
                                    Level {lvl.order}: {lvl.title}
                                </strong>
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* we have newly unlocked achievement */}
            {newlyUnlocked.length > 0 && (
                <div className="margin-y card achievement-card">
                    <h4>🏆 Achievements Unlocked!</h4>
                    {newlyUnlocked.map(id => (
                        <div key={id} className="card-row border-bottom">
                            <span><strong>{STR.Achievement[id]}</strong> - {STR.AchieveDesc[id]}</span>
                            {/* <span>{achievements.find(a => a.id === id)?.description}</span> */}
                        </div>
                    ))}
                </div>
            )}

            <div className="margin-y-lg card" >
                <h4>Performance</h4>
                <div className="card-row border-bottom">
                    <span><strong>Your Score:</strong></span>
                    <span>{currentLevel?.currentScore || 0} pts</span>
                </div>
                <div className="card-row-center border-bottom">
                    (required pts)
                    Perfect: {scoreThresholds.master} -
                    Good: {scoreThresholds.journeyman} -
                    Apprentice: {scoreThresholds.pass}

                </div>
            </div>
            <div className="margin-y-lg card" >
                <h4 >Stats</h4>
                <div className="card-row border-bottom">
                    <span><strong>Loads:</strong></span>
                    <span>{diveLoads}</span>
                </div>
                <div className="card-row border-bottom">
                    <span><strong>Dives:</strong></span>
                    <span>{getTotalDives()}</span>
                </div>
                <div className="card-row border-bottom">
                    <span><strong>Hold Time:</strong></span>
                    <span>{getTotalHoldTime()}s</span>
                </div>
                <div className="card-row border-bottom">
                    <span><strong>Penalties:</strong></span>
                    <span>{getTotalPenalties()}</span>
                </div>
                {captureSession.capturesEnabled && (
                    <>
                        <div className="card-row border-bottom">
                            <span><strong>Photos:</strong></span>
                            <span>{captureSession.visiblePhotosTaken}</span>
                        </div>
                        <div className="card-row border-bottom">
                            <span><strong>Videos:</strong></span>
                            <span>{captureSession.visibleVideosTaken}</span>
                        </div>
                    </>
                )}
            </div>
            <div className="margin-y-lg card" >
                <h4>Task Details</h4>
                {currentLevel?.summaries?.map((summary, index) => (
                    <div key={index} className="margin-y-sm" style={{ borderBottom: '1px solid #eee', padding: '5px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <strong>
                                {summary.desc}
                            </strong>
                            <span>{summary.score} pts</span>
                        </div>
                        {summary.type !== TaskType.CLAP && summary.type !== TaskType.HOLDANDCLAP && summary.type !== TaskType.ENDLESS && summary.type !== TaskType.SPEAK && <div style={{ fontSize: '0.9em', opacity: 0.8, marginTop: '3px' }}>
                            {summary.counts?.perfect} perfect · {summary.counts?.pass} pass · {summary.counts?.fail} fail
                            {summary.perfectStreak ? ` · streak ${summary.perfectStreak.streak}` : ''}
                            {summary.totalTimeHeld ? ` · ${summary.totalTimeHeld}s held` : ''}
                        </div>}
                        {summary.type === TaskType.ENDLESS && <div style={{ fontSize: '0.9em', opacity: 0.8, marginTop: '3px' }}>
                            {summary.counts?.holds || 0} holds · {summary.counts?.dives || 0} dives · {summary.counts?.clapsDuringHold || 0} claps during hold · {summary.totalTimeHeld || 0}s held
                        </div>}
                        {summary.type === TaskType.CLAP && <div style={{ fontSize: '0.9em', opacity: 0.8, marginTop: '3px' }}>
                            {summary.claps} slaps
                        </div>}
                        {summary.type === TaskType.SPEAK && <div style={{ fontSize: '0.9em', opacity: 0.8, marginTop: '3px' }}>
                            {summary.successfulSegments ?? 0} segments · {summary.timedOut ? 'timed out' : 'complete'}
                        </div>}
                        {summary.type === TaskType.HOLDANDCLAP && <div style={{ fontSize: '0.9em', opacity: 0.8, marginTop: '3px' }}>
                            {summary.claps} claps · {summary.totalTimeHeld}s held · {(summary.counts?.perfect || 0) + (summary.counts?.pass || 0)}/{summary.repeat} attempts
                        </div>}
                    </div>
                ))}
            </div>

            <div className="row-centered margin-y-lg">
                <button
                    className="button button-primary margin-x"
                    onClick={onReturnToMenu}
                >
                    Return to Menu
                </button>
            </div>
        </div>
    );
}

export default Gameover;


