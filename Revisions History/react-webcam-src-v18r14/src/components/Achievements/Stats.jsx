// src/components/Achievements/BasicStats.js
import { useAtomValue, useSetAtom } from 'jotai'
import { timeStatsAtom, diveStatsAtom, sessionStatsAtom, achievementsStoredAtom } from '../../atoms/playerAtom'
import { formatTime, calculateLongestStreak } from '../../constants/helpers'
import { STR } from '../../constants/stringsreplace'
import { useState, useEffect } from 'react'

function Stats() {
    const timeStats = useAtomValue(timeStatsAtom)
    const diveStats = useAtomValue(diveStatsAtom)
    const sessionStats = useAtomValue(sessionStatsAtom)
    const [cancelCountdown, setCancelCountdown] = useState(null)
    const [countdownNumber, setCountdownNumber] = useState(10)

    // Add setters for each atom
    const setTimeStats = useSetAtom(timeStatsAtom)
    const setDiveStats = useSetAtom(diveStatsAtom)
    const setSessionStats = useSetAtom(sessionStatsAtom)
    const setAchievementsStored = useSetAtom(achievementsStoredAtom)

    // Cleanup interval on unmount
    useEffect(() => {
        return () => {
            if (cancelCountdown) {
                clearInterval(cancelCountdown.id)
            }
        }
    }, [cancelCountdown])

    const clearStats = () => {
        // Reset time stats
        setTimeStats({
            totalPlayTime: 0,
            holdTimeByDepth: {
                1: 0,
                2: 0,
                3: 0,
                4: 0
            }
        })

        // Reset dive stats
        setDiveStats({
            divesByDepth: {
                1: 0,
                2: 0,
                3: 0,
                4: 0
            },
            perfectTaskExecutions: {
                HOLDPOSITION: 0,
                UPANDDOWN: 0,
                HITDEPTH: 0
            }
        })

        // Reset session stats
        setSessionStats({
            lastPlayDate: null,
            playDates: [],
            levelScores: {},
            levelsCompletedToday: 0
        })

        // Reset achievements stored
        setAchievementsStored({
            unlockedAchievements: [],
            achievementProgress: {}
        })
    }

    const handleClearStats = () => {
        if (cancelCountdown) {
            // If countdown is active, cancel it
            clearInterval(cancelCountdown.id)
            setCancelCountdown(null)
            setCountdownNumber(10)
            return
        }

        setCountdownNumber(10)
        const intervalId = setInterval(() => {
            setCountdownNumber(prev => {
                const newCount = prev - 1
                if (newCount === 0) {
                    clearInterval(intervalId)
                    setCancelCountdown(null)
                    clearStats()
                    setCountdownNumber(10)
                }
                return newCount
            })
        }, 1000)

        setCancelCountdown({ id: intervalId })
    }

    // Calculate the current countdown button text
    const getClearButtonText = () => {
        if (!cancelCountdown) return "Delete All Stats"
        return `Delete in...${countdownNumber}`
    }

    // Calculate total dives across all depths
    const totalDives = Object.values(diveStats.divesByDepth).reduce((sum, count) => sum + count, 0)

    // Calculate total hold time across all depths
    const totalHoldTime = Object.values(timeStats.holdTimeByDepth)
        .reduce((sum, time) => sum + time, 0)

    // Get number of levels completed (total plays)
    const levelsCompleted = sessionStats.playDates.length

    // longest consecutive days played
    const longestStreak = calculateLongestStreak(sessionStats.playDates)

    // how many claps/ todo

    // Get highest levels completed in a day
    const highestDailyLevels = Math.max(
        sessionStats.levelsCompletedToday,
        ...sessionStats.playDates.map(date =>
            Object.values(sessionStats.levelScores)
                .filter(score => score.lastScore && new Date(score.lastScore).toDateString() === new Date(date).toDateString())
                .length
        )
    )

    return (
        <div>
            <div className="row-centered margin-y">
                <h2>{STR.Stats.your_diving_stats}</h2>
            </div>

            {/* Session  */}
            <div className="card margin-y-lg">
                <h3>Session Stats</h3>
                <div className="card-row border-bottom">
                    <span>{STR.Stats.total_dive_time}</span>
                    <span>{formatTime(timeStats.totalPlayTime)}</span>
                </div>
                <div className="card-row border-bottom">
                    <span>{STR.Stats.levels_completed}</span>
                    <span>{levelsCompleted}</span>
                </div>
                <div className="card-row border-bottom">
                    <span>{STR.Stats.highest_daily_levels}</span>
                    <span>{highestDailyLevels}</span>
                </div>
                <div className="card-row border-bottom">
                    <span>Longest daily streak</span>
                    <span>{longestStreak}</span>
                </div>
                <div className="card-row border-bottom">
                    <span>{STR.Stats.levels_today}</span>
                    <span>{sessionStats.levelsCompletedToday}</span>
                </div>
            </div>

            {/*  */}
            <div className="card margin-y-lg">
                <h3>{STR.Stats.dive_stats}</h3>
                <div className="card-row border-bottom">
                    <span>{STR.Stats.total_dives}</span>
                    <span>{totalDives}</span>
                </div>

                {Object.entries(diveStats.divesByDepth).map(([depth, count]) => (
                    <div key={depth} className="card-row border-bottom">
                        <span>{depth} {STR.Depth[depth]}:</span>
                        <span>{count}</span>
                    </div>
                ))}
            </div>

            {/* Time */}
            <div className="card margin-y-lg">
                <h3>Hold Time Stats</h3>
                <div className="card-row border-bottom">
                    <span>Total Hold Time:</span>
                    <span>{formatTime(totalHoldTime)}</span>
                </div>

                {Object.entries(timeStats.holdTimeByDepth).map(([depth, time]) => (
                    <div key={depth} className="card-row border-bottom">
                        <span>{depth} {STR.Depth[depth]}:</span>
                        <span>{formatTime(time)}</span>
                    </div>
                ))}

            </div>

            {/* Clap */}
            {/* <div className="card margin-y-lg">
                <h3>Slaps</h3>
                <div className="card-row border-bottom">
                    <span>Total Slaps:</span>
                    <span>{formatTime(totalHoldTime)}</span>
                </div>
            </div> */}


            {/* <div className="card margin-y-lg">
                <h3>Performance Stats</h3>
                <div className="card-row border-bottom">
                    <span>Perfect Tasks:</span>
                    <span>{totalPerfectTasks}</span>
                </div>
                <div className="stat-grid">
                    <h4>Perfect Tasks by Type:</h4>
                    {Object.entries(diveStats.perfectTaskExecutions).map(([type, count]) => (
                        <div key={type} className="card-row border-bottom">
                            <span>{type}:</span>
                            <span>{count}</span>
                        </div>
                    ))}
                </div>
            </div> */}


            {/* Add debug button at the bottom */}
            <div className="row-centered">
                <button
                    className={cancelCountdown ? "margin-x button button-warning" : "margin-x button"}
                    onClick={handleClearStats}
                >
                    {getClearButtonText()}
                </button>
            </div>


        </div >
    )
}

export default Stats