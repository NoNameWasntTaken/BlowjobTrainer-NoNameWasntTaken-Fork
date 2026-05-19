import { useState, useEffect, useRef, useCallback } from 'react';
// helpers
import { AUDIO } from '../Tasks/audio';
import * as NAV from '../../atoms/navAtom';
// atoms
import { useAtom, useSetAtom } from 'jotai';
import { currentLevelAtom, playTimeAtom, Rank } from '../../atoms/taskAtom';
import { feedbackAtom } from '../../atoms/audioAtom';
import { navAtom } from '../../atoms/navAtom';
import { store } from '../../store';
import { timeStatsAtom, diveStatsAtom, sessionStatsAtom } from '../../atoms/playerAtom';
import { useAchievements } from '../../hooks/useAchievements';
import { externalIntegrationService } from '../../services/externalIntegrationService';
import { sessionExportService } from '../../services/sessionExportService';

// scoring functions
import {
    calcPerfectHitScore, calcPassHitScore,
    calcPerfectHoldScore, calcPassHoldScore,
    calcPerfectDivingScore, calcPassDivingScore,
    calcPerfectClapScore, calcPassClapScore
} from '../Training/scores';
import { TaskType } from '../Tasks/task';
import { formatTime } from '../../constants/helpers'
import { STR } from '../../constants/stringsreplace';

// Show some game over result
function Gameover() {

    // atoms
    const setFeedback = useSetAtom(feedbackAtom);
    const setNav = useSetAtom(navAtom);
    const [playTime, setPlayTime] = useAtom(playTimeAtom);
    const {
        checkTrainingDedication,
        checkSessionMaster,
        checkDailyDiver,
        checkLevelsMastered,
        checkSuccessfulLoads,
        checkTotalHoldTime,
        checkDeepMaster,
        checkHoldAchievements,
        checkUpdownAchievements,
        checkDeep100,
        checkSurfaceAvoider,
        checkClapAchievement,
        newlyUnlocked,
        clearNewlyUnlocked
    } = useAchievements();

    const [currentLevel] = useAtom(currentLevelAtom);
    const [levelPlayTime, setLevelPlayTime] = useState(0);
    const hasExported = useRef(false);
    const [countdown, setCountdown] = useState(null); // null = not counting, number = seconds remaining

    const [playerRank, setPlayerRank] = useState(Rank.FAILED);
    const [scoreThresholds, setScoreThresholds] = useState({
        perfect: 0,
        pass: 0,
        master: 0,
        journeyman: 0,
        apprentice: 0
    });

    // atoms player stats
    const setTimeStats = useSetAtom(timeStatsAtom);
    const setDiveStats = useSetAtom(diveStatsAtom);
    const setSessionStats = useSetAtom(sessionStatsAtom);

    console.log('currentLevel', currentLevel);

    // Calculate perfect and pass scores for all tasks in the level
    const calculateLevelScores = useCallback(() => {
        let totalPerfect = 0;
        let totalPass = 0;

        if (!currentLevel || !currentLevel.tasks) {
            return { perfect: 0, pass: 0 };
        }

        currentLevel.tasks.forEach(task => {
            switch (task.type) {
                case TaskType.HOLDPOSITION:
                    totalPerfect += calcPerfectHoldScore(task);
                    totalPass += calcPassHoldScore(task);
                    break;
                case TaskType.UPANDDOWN:
                    totalPerfect += calcPerfectDivingScore(task);
                    totalPass += calcPassDivingScore(task);
                    break;
                case TaskType.HITDEPTH:
                    totalPerfect += calcPerfectHitScore(task);
                    totalPass += calcPassHitScore(task);
                    break;
                case TaskType.CLAP:
                    totalPerfect += calcPerfectClapScore(task);
                    totalPass += calcPassClapScore(task);
                    break;
                default:
                    break;
            }
        });

        return { perfect: totalPerfect, pass: totalPass };
    }, [currentLevel]);

    // Calculate total penalties
    const getTotalPenalties = useCallback(() => {
        let total = 0;
        if (!currentLevel?.summaries) return 0;

        for (const summary of currentLevel.summaries) {
            total += (summary.counts.penalties || 0);
        }
        return total;
    }, [currentLevel]);

    // Helper functions to get detailed stats from summaries
    const getTotalHoldTimeForDepth = useCallback((depth) => {
        if (!currentLevel?.summaries) return 0;
        return currentLevel.summaries
            .filter(summary =>
                summary.type === 'hold' &&
                summary.targetDepth === depth)
            .reduce((total, summary) =>
                total + (summary.totalTimeHeld || 0), 0);
    }, [currentLevel]);

    const getTotalDivesForDepth = useCallback((depth) => {
        if (!currentLevel?.summaries) return 0;
        return currentLevel.summaries
            .filter(summary =>
                (summary.type === TaskType.UPANDDOWN || summary.type === TaskType.HITDEPTH) &&
                (summary.maxDepth === depth || summary.targetDepth === depth))
            .reduce((total, summary) =>
                total + (summary.counts.perfect + summary.counts.pass), 0);
    }, [currentLevel]);

    const getPerfectTaskCount = useCallback((taskType) => {
        if (!currentLevel?.summaries) return 0
        // Map the TaskType enum keys to their actual values
        const taskTypeMap = {
            [TaskType.HOLDPOSITION]: 'hold',
            [TaskType.UPANDDOWN]: 'updown',
            [TaskType.HITDEPTH]: 'hitdepth'
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

        // Calculate perfect and pass scores for this level
        const { perfect, pass } = calculateLevelScores()

        // Calculate thresholds for different ranks
        const masterThresh = perfect * 0.9
        const journeymanThresh = pass + (masterThresh - pass) / 2 // Midpoint between pass and masterThresh

        // round numbers down to nearest 10
        const roundedPass = Math.floor(pass / 10) * 10
        const roundedMaster = Math.floor(masterThresh / 10) * 10
        const roundedJourneyman = Math.floor(journeymanThresh / 10) * 10

        setScoreThresholds({
            perfect: perfect,
            master: roundedMaster,
            journeyman: roundedJourneyman,
            pass: roundedPass,
        })

        // Determine player rank based on score
        const playerScore = currentLevel?.currentScore || 0

        let newRank = Rank.DISQUALIFIED
        if (playerScore >= roundedMaster) {
            newRank = Rank.MASTER
        } else if (playerScore >= roundedJourneyman) {
            newRank = Rank.JOURNEYMAN
        } else if (playerScore >= roundedPass) {
            newRank = Rank.APPRENTICE
        } else if (playerScore >= (perfect * 0.1)) {
            newRank = Rank.FAILED
        }
        setPlayerRank(newRank)
        // note the play time and reset the timer
        setLevelPlayTime(playTime)
        setPlayTime(0)

        // play feedback
        switch (newRank) {
            case (Rank.DISQUALIFIED):
                break;
            case (Rank.FAILED):
                if (currentLevel.soft) {
                    setFeedback(AUDIO.Rank.END_BAD_SOFT)
                } else {
                    setFeedback(AUDIO.Rank.END_BAD)
                }
                break
            case (Rank.APPRENTICE):
                setFeedback(AUDIO.Rank.END_PASS)
                // fallthrough - APPRENTICE and JOURNEYMAN share the same feedback
            case (Rank.JOURNEYMAN):
                setFeedback(AUDIO.Rank.END_GOOD)
                break;
            case (Rank.MASTER):
                if (currentLevel.soft) {
                    setFeedback(AUDIO.Rank.END_PERFECT_SOFT)
                } else {
                    setFeedback(AUDIO.Rank.END_PERFECT)
                }
                break;
            default:
                // No feedback for unknown rank
                break;
        }

        // guard again DISQUALFIED
        if (newRank === Rank.DISQUALIFIED) { return }

        //  -- UPDATE PLAYER STATS --

        // Update player stats if score meets minimum threshold

        const today = new Date().toISOString().split('T')[0]

        // Check for hold-based achievements
        if (currentLevel.summaries) {
            checkHoldAchievements(currentLevel.summaries)
            checkUpdownAchievements(currentLevel.summaries)
            checkDeep100(currentLevel.summaries)
            checkClapAchievement(currentLevel.summaries)
            // can only get this if we're a master
            if (newRank === Rank.MASTER) {
                checkSurfaceAvoider(currentLevel.summaries)
            }
        }

        // Update time stats
        setTimeStats(prev => {
            const newHoldTimeByDepth = {
                ...prev.holdTimeByDepth,
                1: prev.holdTimeByDepth[1] + getTotalHoldTimeForDepth(1),
                2: prev.holdTimeByDepth[2] + getTotalHoldTimeForDepth(2),
                3: prev.holdTimeByDepth[3] + getTotalHoldTimeForDepth(3),
                4: prev.holdTimeByDepth[4] + getTotalHoldTimeForDepth(4),
            }

            // Check total hold time achievements
            checkTotalHoldTime(newHoldTimeByDepth)
            checkDeepMaster(newHoldTimeByDepth)

            return {
                ...prev,
                totalPlayTime: prev.totalPlayTime + playTime,
                holdTimeByDepth: newHoldTimeByDepth
            }
        })

        // Check time-based achievements
        checkTrainingDedication(playTime)



        // Update dive stats
        setDiveStats(prev => ({
            ...prev,
            divesByDepth: {
                ...prev.divesByDepth,
                1: prev.divesByDepth[1] + getTotalDivesForDepth(1),
                2: prev.divesByDepth[2] + getTotalDivesForDepth(2),
                3: prev.divesByDepth[3] + getTotalDivesForDepth(3),
                4: prev.divesByDepth[4] + getTotalDivesForDepth(4),
            },
            perfectTaskExecutions: {
                ...prev.perfectTaskExecutions,
                HOLDPOSITION: prev.perfectTaskExecutions.HOLDPOSITION + getPerfectTaskCount(TaskType.HOLDPOSITION),
                UPANDDOWN: prev.perfectTaskExecutions.UPANDDOWN + getPerfectTaskCount(TaskType.UPANDDOWN),
                HITDEPTH: prev.perfectTaskExecutions.HITDEPTH + getPerfectTaskCount(TaskType.HITDEPTH),
            }
        }))

        // Only update session stats if player passed the level
        if (newRank !== Rank.FAILED) {
            setSessionStats(prev => {
                // get the previous level stats or create a new one
                const prevLevelStats = prev.levelScores[currentLevel.id] || {
                    rank: Rank.FAILED,
                    bestScore: 0,
                    attempts: 0,
                    lastScore: 0,
                    surfacePenalties: Infinity // Start with Infinity for first attempt
                }

                // Only update rank if new rank is better (MASTER > JOURNEYMAN > APPRENTICE > FAILED)
                const bestRank = newRank > prevLevelStats.rank ? newRank : prevLevelStats.rank
                // same for best score
                const bestScore = playerScore > prevLevelStats.bestScore ? playerScore : prevLevelStats.bestScore
                // and lowest surface penalties
                const tempPenalties = getTotalPenalties()
                const bestSurfacePenalties = tempPenalties < prevLevelStats.surfacePenalties ? tempPenalties : prevLevelStats.surfacePenalties

                // Check achievements if we gained a new master rank
                if (bestRank === Rank.MASTER && prevLevelStats.rank !== Rank.MASTER) {
                    const masteredCount = Object.values(prev.levelScores)
                        .filter(stats => stats.rank === Rank.MASTER).length + 1
                    checkLevelsMastered(masteredCount)
                }

                // Check if it's a new day
                const isNewDay = today !== prev.lastPlayDate
                // Check successful loads achievements - must have passed the level
                const finishedLoads = currentLevel.finishedLoads || 0
                const levelsToday = isNewDay ? finishedLoads : prev.levelsCompletedToday + finishedLoads
                // check pass countachievements
                checkSuccessfulLoads(finishedLoads)

                // Check session-based achievements
                checkSessionMaster(levelsToday)

                // create an array filled with today's date, repeated finishedLoads times
                const newPlayDates = Array(finishedLoads).fill(today)

                // update the session stats
                const updatedStats = {
                    ...prev,
                    lastPlayDate: today,
                    playDates: [...prev.playDates, ...newPlayDates],
                    levelsCompletedToday: levelsToday,
                    levelScores: {
                        ...prev.levelScores,
                        [currentLevel.id]: {
                            rank: bestRank,
                            bestScore: bestScore,
                            attempts: prevLevelStats.attempts + 1,
                            lastScore: playerScore,
                            surfacePenalties: bestSurfacePenalties
                        }
                    }
                }

                // Check streak-based achievements with updated play dates
                checkDailyDiver([...prev.playDates, ...newPlayDates])

                return updatedStats
            })
        }

        // cleanup newlyUnlocked when unmounting
        return () => {
            clearNewlyUnlocked()
        }
    }, [
        currentLevel,
        calculateLevelScores,
        checkClapAchievement,
        checkDailyDiver,
        checkDeep100,
        checkDeepMaster,
        checkHoldAchievements,
        checkLevelsMastered,
        checkSessionMaster,
        checkSuccessfulLoads,
        checkSurfaceAvoider,
        checkTotalHoldTime,
        checkTrainingDedication,
        checkUpdownAchievements,
        clearNewlyUnlocked,
        getPerfectTaskCount,
        getTotalDivesForDepth,
        getTotalHoldTimeForDepth,
        getTotalPenalties,
        playTime,
        setDiveStats,
        setFeedback,
        setPlayTime,
        setSessionStats,
        setTimeStats
    ])

    console.log("summaries", currentLevel?.summaries);

    // Calculate total dives (including updown and hitdepth tasks)
    const getTotalDives = () => {
        let total = 0;
        if (!currentLevel?.summaries) return 0;

        for (const summary of currentLevel.summaries) {
            if (summary.type === 'updown' || summary.type === 'hitdepth') {
                total += (summary.counts.perfect + summary.counts.pass);
            }
        }
        return total;
    };

    // Calculate total hold time
    const getTotalHoldTime = () => {
        let total = 0;
        if (!currentLevel?.summaries) return 0;

        for (const summary of currentLevel.summaries) {
            if (summary.type === 'hold') {
                total += (summary.totalTimeHeld || 0);
            }
        }
        return total;
    };

    const diveLoads = currentLevel.finishedLoads || 0

    // Handle external mode completion
    useEffect(() => {
        if (!currentLevel || hasExported.current) {
            return;
        }
        
        const isExternalMode = externalIntegrationService.isExternalMode();
        if (!isExternalMode) {
            return;
        }

        // CRITICAL FIX: Only call callback when we're actually on GAMEOVER screen
        // The callback atom change triggers this effect, but we should only proceed
        // when the level has actually completed and we're showing the gameover screen
        const currentNav = store.get(navAtom);
        if (currentNav !== NAV.GAMEOVER) {
            return;
        }

        // Determine completion status
        // Default to "completed" - other statuses (timeout, error) are set elsewhere
        const completionStatus = currentLevel.status === 'complete' ? 'completed' : 'error';

        async function handleExternalCompletion() {
            hasExported.current = true;

            // Format session data
            const sessionData = sessionExportService.formatSessionData(
                currentLevel,
                levelPlayTime,
                completionStatus
            );

            // Determine output path
            let outputPath = 'session_results.json';
            const cliOutputPath = externalIntegrationService.getOutputPath();
            if (cliOutputPath) {
                outputPath = cliOutputPath;
            }

            // Set countdown duration (always 15 seconds for single level)
            const countdownDuration = 15;
            setCountdown(countdownDuration);
            
            // Export and exit
            const exportResult = await sessionExportService.exportSessionResults(sessionData, outputPath);
            
            if (exportResult.success) {
                // Determine exit code
                let exitCode = 0; // completed
                if (completionStatus === 'calibration_timeout') exitCode = 2;
                else if (completionStatus === 'pause_timeout') exitCode = 3;
                else if (completionStatus === 'level_not_found') exitCode = 4;
                else if (completionStatus === 'error') exitCode = 5;
                
                // Auto-close after 15 second delay
                setTimeout(() => {
                    if (window.electronAPI && window.electronAPI.requestExit) {
                        window.electronAPI.requestExit(exitCode, completionStatus);
                    }
                }, 15000); // 15 second delay to show results
            } else {
                // Export failed - exit with error
                setTimeout(() => {
                    if (window.electronAPI && window.electronAPI.requestExit) {
                        window.electronAPI.requestExit(5, 'export_failed');
                    }
                }, 15000);
            }
        }

        handleExternalCompletion();
    }, [currentLevel, levelPlayTime]);

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

    // clean up and go back to level select
    const onReturnToMenu = () => {
        // In external mode, don't allow returning to menu (will auto-close)
        if (externalIntegrationService.isExternalMode()) {
            return;
        }
        
        // clear the current level
        // setCurrentLevel(null)
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
                        {summary.type !== TaskType.CLAP && <div style={{ fontSize: '0.9em', opacity: 0.8, marginTop: '3px' }}>
                            {summary.counts.perfect} perfect · {summary.counts.pass} pass · {summary.counts.fail} fail
                            {summary.perfectStreak ? ` · streak ${summary.perfectStreak.streak}` : ''}
                            {summary.totalTimeHeld ? ` · ${summary.totalTimeHeld}s held` : ''}
                        </div>}
                        {summary.type === TaskType.CLAP && <div style={{ fontSize: '0.9em', opacity: 0.8, marginTop: '3px' }}>
                            {summary.claps} slaps
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


