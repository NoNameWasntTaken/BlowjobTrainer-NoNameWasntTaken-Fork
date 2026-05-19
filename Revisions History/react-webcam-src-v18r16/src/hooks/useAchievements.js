import { useSetAtom } from 'jotai'
import { achievements as achievementsData } from '../components/Achievements/achievementsData'
import { achievementsStoredAtom } from '../atoms/playerAtom'
import { calculateLongestStreak } from '../constants/helpers'
import { useState } from 'react'
import { TaskType, Tempo } from '../components/Tasks/task'
import { store } from '../store'

export const useAchievements = () => {
    const setAchievementsStored = useSetAtom(achievementsStoredAtom)
    const [newlyUnlocked, setNewlyUnlocked] = useState([])

    // Same store as <Provider store={store}> — always read latest state (avoids stale closure in one effect tick).
    const getStored = () => store.get(achievementsStoredAtom)

    // -- Helper methods --

    const findAchievement = (id) => {
        return achievementsData.find(a => a.id === id)
    }

    const isUnlocked = (id) => {
        return getStored().unlockedAchievements.includes(id)
    }

    const getProgress = (id) => {
        // Find achievement definition
        const achievement = findAchievement(id)
        if (!achievement) return null

        // Get stored progress or create initial progress based on type
        let progress = getStored().achievementProgress[id]
        if (!progress) {
            // Create appropriate initial progress based on type
            switch (achievement.type) {
                case 'bool':
                    progress = false
                    break
                case 'count':
                case 'time':
                    progress = 0
                    break
                default:
                    return null
            }
        }

        return progress
    }

    const updateProgress = (id, newProgress) => {
        setAchievementsStored(prev => {
            if (prev.unlockedAchievements.includes(id)) return prev
            return {
                ...prev,
                achievementProgress: {
                    ...prev.achievementProgress,
                    [id]: newProgress
                }
            }
        })
    }

    const unlockAchievement = (id) => {
        const prev = getStored()
        if (prev.unlockedAchievements.includes(id)) return

        store.set(achievementsStoredAtom, {
            ...prev,
            unlockedAchievements: [...prev.unlockedAchievements, id],
        })
        setNewlyUnlocked(u => [...u, id])
    }

    // -- Achievement checks --

    const checkTrainingDedication = (addPlayTime) => {
        const id = 'training_dedication'
        if (isUnlocked(id)) return

        const achievement = findAchievement(id)
        if (!achievement) return

        const currentProgress = getProgress(id)
        const newTotal = currentProgress + addPlayTime

        updateProgress(id, newTotal)

        // Check if newly unlocked (10 hours = 36000 seconds)
        if (newTotal >= achievement.total) {
            unlockAchievement(id)
        }
    }

    const checkSessionMaster = (levelsCompletedInADay) => {
        const id = 'session_master'
        if (isUnlocked(id)) return

        const achievement = findAchievement(id)
        if (!achievement) return

        const currentProgress = getProgress(id)
        // not improved
        if (currentProgress >= levelsCompletedInADay) return

        // update
        updateProgress(id, levelsCompletedInADay)
        // Check if completed 3 levels in one day
        if (levelsCompletedInADay >= achievement.total) {
            unlockAchievement(id)
        }
    }

    const checkDailyDiver = (playDates) => {
        const id = 'daily_diver'
        if (isUnlocked(id)) return

        const achievement = findAchievement(id)
        if (!achievement) return

        // Get the longest streak using the helper function
        const maxStreak = calculateLongestStreak(playDates)

        // Update progress with the best streak achieved
        updateProgress(id, maxStreak)

        // Check if we've reached 7 days
        if (maxStreak >= achievement.total) {
            unlockAchievement(id)
        }
    }

    const checkLevelsMastered = (masteredCount) => {
        // Update progress for all mastery achievements that aren't unlocked yet
        const achievements = ['good_dive', 'level_master', 'advanced_master', 'completionist']
        achievements.forEach(id => {
            if (!isUnlocked(id)) {
                updateProgress(id, masteredCount)
            }
        })

        // Check unlocks
        if (!isUnlocked('good_dive')) unlockAchievement('good_dive')
        if (masteredCount >= 3) unlockAchievement('level_master')
        if (masteredCount >= 6) unlockAchievement('advanced_master')
        if (masteredCount >= 12) unlockAchievement('completionist')
    }

    const checkSuccessfulLoads = (finishedLoads) => {
        // Get current progress and add new loads
        const currentProgress = getProgress('sixtynine') || 0
        const newProgress = currentProgress + finishedLoads

        // Update progress for both achievements
        updateProgress('dozen', newProgress)
        updateProgress('sixtynine', newProgress)

        // Check unlocks
        if (newProgress >= 12) unlockAchievement('dozen')
        if (newProgress >= 69) unlockAchievement('sixtynine')
    }

    const checkTotalHoldTime = (holdTimeByDepth) => {
        // Sum up all hold times
        const totalHoldTime = Object.values(holdTimeByDepth).reduce((sum, time) => sum + time, 0)

        const achievement = findAchievement('in_love_with_the_sea')
        if (!achievement) return

        // Update progress
        updateProgress('in_love_with_the_sea', totalHoldTime)

        // Check if we've reached the target time
        if (totalHoldTime >= achievement.total) {
            unlockAchievement('in_love_with_the_sea')
        }
    }

    const checkDeepMaster = (holdTimeByDepth) => {
        const deepHoldTime = holdTimeByDepth[4] || 0
        const achievement = findAchievement('deep_master')
        if (!achievement) return

        // Update progress
        updateProgress('deep_master', deepHoldTime)

        // Check if we've reached the target time
        if (deepHoldTime >= achievement.total) {
            unlockAchievement('deep_master')
        }
    }

    const checkHoldAchievements = (summaries) => {
        // Check each summary for successful hold tasks
        summaries.forEach(summary => {
            if (summary.type === TaskType.HOLDPOSITION) {
                console.log(summary);

                // Check if we had any successful holds (perfect or pass) and the task required 10s or more
                const hadSuccessfulHold = summary.successfulHolds > 0
                const wasLongEnough = summary.time >= 10

                if (hadSuccessfulHold && wasLongEnough) {
                    // Check if this was a depth 3 hold
                    if (summary.targetDepth === 3) {
                        console.log('getting_comfortable');
                        unlockAchievement('getting_comfortable')
                    }
                    // Check if this was a depth 4 hold
                    if (summary.targetDepth === 4) {
                        console.log('getting_uncomfortable');
                        unlockAchievement('getting_uncomfortable')
                    }
                }
            }
            if (summary.type === TaskType.HOLDANDCLAP) {
                const hadSuccessfulHold = summary.successfulHolds > 0
                const wasLongEnough = (summary.longestSingleHold >= 10) || (summary.totalTimeHeld >= 10)

                if (hadSuccessfulHold && wasLongEnough) {
                    if (summary.targetDepth === 3) {
                        unlockAchievement('getting_comfortable')
                    }
                    if (summary.targetDepth === 4) {
                        unlockAchievement('getting_uncomfortable')
                    }
                }
            }
        })
    }

    const checkUpdownAchievements = (summaries) => {
        // Check each summary for updown tasks
        summaries.forEach(summary => {
            if (summary.type === TaskType.UPANDDOWN) {
                // Get the perfect streak from the summary
                const perfectStreak = summary.perfectStreak?.streak || 0
                const tempo = summary.tempo || Tempo.MEDIUM

                // Update progress for each achievement based on tempo
                if (tempo === Tempo.SLOW) {
                    const achievement = findAchievement('hypno')
                    if (!achievement) return
                    const currentProgress = getProgress('hypno') || 0
                    if (perfectStreak > currentProgress) {
                        updateProgress('hypno', perfectStreak)
                        if (perfectStreak >= achievement.total) {
                            unlockAchievement('hypno')
                        }
                    }
                } else if (tempo === Tempo.MEDIUM) {
                    const achievement = findAchievement('metronome')
                    if (!achievement) return
                    const currentProgress = getProgress('metronome') || 0
                    if (perfectStreak > currentProgress) {
                        updateProgress('metronome', perfectStreak)
                        if (perfectStreak >= achievement.total) {
                            unlockAchievement('metronome')
                        }
                    }
                } else if (tempo === Tempo.FAST) {
                    const achievement = findAchievement('speed_demon')
                    if (!achievement) return
                    const currentProgress = getProgress('speed_demon') || 0
                    if (perfectStreak > currentProgress) {
                        updateProgress('speed_demon', perfectStreak)
                        if (perfectStreak >= achievement.total) {
                            unlockAchievement('speed_demon')
                        }
                    }
                }
            }
        })
    }

    const checkDeep100 = (summaries) => {
        // Get successful depth 4 actions from hitdepth, updown, hold, and holdandclap tasks
        const depth4Successes = summaries
            .filter(summary =>
                // Include hitdepth tasks at depth 4
                (summary.type === TaskType.HITDEPTH && summary.targetDepth === 4) ||
                // Include updown tasks that go to depth 4
                (summary.type === TaskType.UPANDDOWN && summary.maxDepth === 4) ||
                // Include hold tasks at depth 4
                (summary.type === TaskType.HOLDPOSITION && summary.targetDepth === 4) ||
                // Include holdandclap tasks at depth 4
                (summary.type === TaskType.HOLDANDCLAP && summary.targetDepth === 4)
            )
            .reduce((total, summary) => {
                // For hitdepth, use the hits count
                if (summary.type === TaskType.HITDEPTH) {
                    return total + (summary.hits || 0)
                }
                // For updown, use perfect + pass counts
                if (summary.type === TaskType.UPANDDOWN) {
                    return total + (summary.counts.perfect + summary.counts.pass)
                }
                // For hold and holdandclap tasks, use successfulHolds count
                if (summary.type === TaskType.HOLDPOSITION || summary.type === TaskType.HOLDANDCLAP) {
                    return total + (summary.successfulHolds || 0)
                }
                return total
            }, 0)

        // Update progress
        const currentProgress = getProgress('deep_100') || 0
        const newProgress = currentProgress + depth4Successes
        updateProgress('deep_100', newProgress)

        // Check if we've reached 100 hits
        const achievement = findAchievement('deep_100')
        if (achievement && newProgress >= achievement.total) {
            unlockAchievement('deep_100')
        }
    }

    const checkSurfaceAvoider = (summaries) => {
        // Skip if no summaries
        if (!summaries || summaries.length === 0) return

        // Calculate average penalties per task
        const totalPenalties = summaries.reduce((sum, summary) => sum + (summary.counts.penalties || 0), 0)
        const averagePenalties = totalPenalties / summaries.length

        // If average penalties is less than 1 per task, unlock the achievement
        if (averagePenalties < 1) {
            unlockAchievement('surface_avoider')
        }
    }

    const checkClapAchievement = (summaries) => {
        // Skip if no summaries
        if (!summaries || summaries.length === 0) return

        // Get total claps from CLAP and HOLDANDCLAP type tasks
        const totalClaps = summaries
            .filter(summary => summary.type === TaskType.CLAP || summary.type === TaskType.HOLDANDCLAP)
            .reduce((total, summary) => total + (summary.claps || 0), 0)

        // Update progress
        const currentProgress = getProgress('clap') || 0
        const newProgress = currentProgress + totalClaps
        updateProgress('clap', newProgress)

        // Check if we've reached 321 claps
        const achievement = findAchievement('clap')
        if (achievement && newProgress >= achievement.total) {
            unlockAchievement('clap')
        }
    }

    const clearNewlyUnlocked = () => {
        setNewlyUnlocked([])
    }

    return {
        findAchievement,
        isUnlocked,
        getProgress,
        newlyUnlocked,
        clearNewlyUnlocked,
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
        checkClapAchievement
    }
} 