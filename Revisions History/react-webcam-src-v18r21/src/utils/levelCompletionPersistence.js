/**
 * Pure computation of next profile slices after a level completes (stats + achievements).
 * No store I/O — Gameover merges via a single set(playerProfilesAtom).
 */

import { achievements as achievementsData } from '../components/Achievements/achievementsData'
import { calculateLongestStreak } from '../constants/helpers'
import { TaskType, Tempo } from '../components/Tasks/task'
import { Rank } from '../atoms/taskAtom'
import {
    createEmptyTimeStats,
    createEmptyDiveStats,
    createEmptySessionStats,
} from '../atoms/playerProfilesModel'

function findAchievement(id) {
    return achievementsData.find((a) => a.id === id)
}

function makeAchievementReducer(initial) {
    let unlocked = [...initial.unlockedAchievements]
    let progress = { ...initial.achievementProgress }
    const newlyUnlockedIds = []

    const isUnlocked = (id) => unlocked.includes(id)
    const unlock = (id) => {
        if (unlocked.includes(id)) return
        unlocked = [...unlocked, id]
        newlyUnlockedIds.push(id)
    }
    const getProg = (id) => {
        const achievement = findAchievement(id)
        let p = progress[id]
        if (p == null && achievement) {
            switch (achievement.type) {
                case 'bool':
                    return false
                case 'count':
                case 'time':
                    return 0
                default:
                    return null
            }
        }
        return p
    }
    const setProg = (id, val) => {
        if (unlocked.includes(id)) return
        progress = { ...progress, [id]: val }
    }

    return {
        get state() {
            return { unlockedAchievements: unlocked, achievementProgress: progress }
        },
        isUnlocked,
        unlock,
        getProg,
        setProg,
        newlyUnlockedIds,
    }
}

function applySummaryAchievements(a, summaries, newRank) {
    if (!summaries) return

    summaries.forEach((summary) => {
        if (summary.type === TaskType.HOLDPOSITION) {
            const hadSuccessfulHold = summary.successfulHolds > 0
            const wasLongEnough = summary.time >= 10
            if (hadSuccessfulHold && wasLongEnough) {
                if (summary.targetDepth === 3) a.unlock('getting_comfortable')
                if (summary.targetDepth === 4) a.unlock('getting_uncomfortable')
            }
        }
        if (summary.type === TaskType.HOLDANDCLAP) {
            const hadSuccessfulHold = summary.successfulHolds > 0
            const wasLongEnough =
                summary.longestSingleHold >= 10 || summary.totalTimeHeld >= 10
            if (hadSuccessfulHold && wasLongEnough) {
                if (summary.targetDepth === 3) a.unlock('getting_comfortable')
                if (summary.targetDepth === 4) a.unlock('getting_uncomfortable')
            }
        }
    })

    summaries.forEach((summary) => {
        if (summary.type === TaskType.UPANDDOWN) {
            const perfectStreak = summary.perfectStreak?.streak || 0
            const tempo = summary.tempo || Tempo.MEDIUM
            if (tempo === Tempo.SLOW) {
                const achievement = findAchievement('hypno')
                if (!achievement) return
                const currentProgress = a.getProg('hypno') || 0
                if (perfectStreak > currentProgress) {
                    a.setProg('hypno', perfectStreak)
                    if (perfectStreak >= achievement.total) a.unlock('hypno')
                }
            } else if (tempo === Tempo.MEDIUM) {
                const achievement = findAchievement('metronome')
                if (!achievement) return
                const currentProgress = a.getProg('metronome') || 0
                if (perfectStreak > currentProgress) {
                    a.setProg('metronome', perfectStreak)
                    if (perfectStreak >= achievement.total) a.unlock('metronome')
                }
            } else if (tempo === Tempo.FAST) {
                const achievement = findAchievement('speed_demon')
                if (!achievement) return
                const currentProgress = a.getProg('speed_demon') || 0
                if (perfectStreak > currentProgress) {
                    a.setProg('speed_demon', perfectStreak)
                    if (perfectStreak >= achievement.total) a.unlock('speed_demon')
                }
            }
        }
    })

    const depth4Successes = summaries
        .filter(
            (summary) =>
                (summary.type === TaskType.HITDEPTH &&
                    summary.targetDepth === 4) ||
                (summary.type === TaskType.UPANDDOWN &&
                    summary.maxDepth === 4) ||
                (summary.type === TaskType.HOLDPOSITION &&
                    summary.targetDepth === 4) ||
                (summary.type === TaskType.HOLDANDCLAP &&
                    summary.targetDepth === 4)
        )
        .reduce((total, summary) => {
            if (summary.type === TaskType.HITDEPTH) {
                return total + (summary.hits || 0)
            }
            if (summary.type === TaskType.UPANDDOWN) {
                return (
                    total +
                    (summary.counts.perfect + summary.counts.pass)
                )
            }
            if (
                summary.type === TaskType.HOLDPOSITION ||
                summary.type === TaskType.HOLDANDCLAP
            ) {
                return total + (summary.successfulHolds || 0)
            }
            return total
        }, 0)

    const curDeep = a.getProg('deep_100') || 0
    const newDeep = curDeep + depth4Successes
    a.setProg('deep_100', newDeep)
    const deepAch = findAchievement('deep_100')
    if (deepAch && newDeep >= deepAch.total) a.unlock('deep_100')

    const totalClaps = summaries
        .filter(
            (summary) =>
                summary.type === TaskType.CLAP ||
                summary.type === TaskType.HOLDANDCLAP
        )
        .reduce((total, summary) => total + (summary.claps || 0), 0)
    const curClap = a.getProg('clap') || 0
    const newClap = curClap + totalClaps
    a.setProg('clap', newClap)
    const clapAch = findAchievement('clap')
    if (clapAch && newClap >= clapAch.total) a.unlock('clap')

    if (newRank === Rank.MASTER && summaries.length > 0) {
        const totalPenalties = summaries.reduce(
            (sum, summary) => sum + (summary.counts.penalties || 0),
            0
        )
        const averagePenalties = totalPenalties / summaries.length
        if (averagePenalties < 1) a.unlock('surface_avoider')
    }
}

function applyTimeDerivedAchievements(a, newHoldTimeByDepth, totalPlayTime) {
    const totalHoldTime = Object.values(newHoldTimeByDepth).reduce(
        (sum, t) => sum + t,
        0
    )
    const sea = findAchievement('in_love_with_the_sea')
    if (sea) {
        a.setProg('in_love_with_the_sea', totalHoldTime)
        if (totalHoldTime >= sea.total) a.unlock('in_love_with_the_sea')
    }
    const deepHold = newHoldTimeByDepth[4] || 0
    const dm = findAchievement('deep_master')
    if (dm) {
        a.setProg('deep_master', deepHold)
        if (deepHold >= dm.total) a.unlock('deep_master')
    }

    const td = findAchievement('training_dedication')
    if (td && !a.isUnlocked('training_dedication')) {
        const currentProgress = a.getProg('training_dedication') || 0
        const newTotal = currentProgress + totalPlayTime
        a.setProg('training_dedication', newTotal)
        if (newTotal >= td.total) a.unlock('training_dedication')
    }
}

function applySessionAchievements(
    a,
    prevSession,
    nextSession,
    currentLevelId,
    newRank,
    finishedLoads,
    today
) {
    if (newRank === Rank.FAILED) return

    const prevLevelStats = prevSession.levelScores[currentLevelId] || {
        rank: Rank.FAILED,
        bestScore: 0,
        attempts: 0,
        lastScore: 0,
        surfacePenalties: Infinity,
    }

    const bestRank =
        newRank > prevLevelStats.rank ? newRank : prevLevelStats.rank

    if (bestRank === Rank.MASTER && prevLevelStats.rank !== Rank.MASTER) {
        const masteredCount =
            Object.values(prevSession.levelScores).filter(
                (stats) => stats.rank === Rank.MASTER
            ).length + 1
        ;['good_dive', 'level_master', 'advanced_master', 'completionist'].forEach(
            (id) => {
                if (!a.isUnlocked(id)) a.setProg(id, masteredCount)
            }
        )
        if (!a.isUnlocked('good_dive')) a.unlock('good_dive')
        if (masteredCount >= 3) a.unlock('level_master')
        if (masteredCount >= 6) a.unlock('advanced_master')
        if (masteredCount >= 12) a.unlock('completionist')
    }

    const cur69 = a.getProg('sixtynine') || 0
    const newProgLoads = cur69 + finishedLoads
    a.setProg('dozen', newProgLoads)
    a.setProg('sixtynine', newProgLoads)
    if (newProgLoads >= 12) a.unlock('dozen')
    if (newProgLoads >= 69) a.unlock('sixtynine')

    const isNewDay = today !== prevSession.lastPlayDate
    const levelsToday = isNewDay
        ? finishedLoads
        : prevSession.levelsCompletedToday + finishedLoads
    const sm = findAchievement('session_master')
    if (sm && !a.isUnlocked('session_master')) {
        const cur = a.getProg('session_master') || 0
        if (levelsToday > cur) {
            a.setProg('session_master', levelsToday)
            if (levelsToday >= sm.total) a.unlock('session_master')
        }
    }

    const maxStreak = calculateLongestStreak(nextSession.playDates)
    const dd = findAchievement('daily_diver')
    if (dd && !a.isUnlocked('daily_diver')) {
        a.setProg('daily_diver', maxStreak)
        if (maxStreak >= dd.total) a.unlock('daily_diver')
    }
}

/**
 * @param {object} params
 * @param {object} params.profile — active profile slice (stats + achievements)
 * @param {object} params.currentLevel
 * @param {number} params.newRank — Rank.*
 * @param {number} params.playerScore
 * @param {number} params.playTimeValue — seconds this level
 * @param {function} params.getTotalHoldTimeForDepth
 * @param {function} params.getTotalDivesForDepth
 * @param {function} params.getPerfectTaskCount
 * @param {function} params.getTotalPenalties
 */
export function computeLevelCompletionUpdate({
    profile,
    currentLevel,
    newRank,
    playerScore,
    playTimeValue,
    getTotalHoldTimeForDepth,
    getTotalDivesForDepth,
    getPerfectTaskCount,
    getTotalPenalties,
}) {
    const today = new Date().toISOString().split('T')[0]
    const summaries = currentLevel.summaries

    const a = makeAchievementReducer(profile.achievements)
    applySummaryAchievements(a, summaries, newRank)

    const prevTime = profile.timeStats || createEmptyTimeStats()
    const newHoldTimeByDepth = {
        ...prevTime.holdTimeByDepth,
        1: prevTime.holdTimeByDepth[1] + getTotalHoldTimeForDepth(1),
        2: prevTime.holdTimeByDepth[2] + getTotalHoldTimeForDepth(2),
        3: prevTime.holdTimeByDepth[3] + getTotalHoldTimeForDepth(3),
        4: prevTime.holdTimeByDepth[4] + getTotalHoldTimeForDepth(4),
    }
    const nextTimeStats = {
        ...prevTime,
        totalPlayTime: prevTime.totalPlayTime + playTimeValue,
        holdTimeByDepth: newHoldTimeByDepth,
    }
    applyTimeDerivedAchievements(
        a,
        newHoldTimeByDepth,
        playTimeValue
    )

    const prevDive = profile.diveStats || createEmptyDiveStats()
    const nextDiveStats = {
        ...prevDive,
        divesByDepth: {
            ...prevDive.divesByDepth,
            1: prevDive.divesByDepth[1] + getTotalDivesForDepth(1),
            2: prevDive.divesByDepth[2] + getTotalDivesForDepth(2),
            3: prevDive.divesByDepth[3] + getTotalDivesForDepth(3),
            4: prevDive.divesByDepth[4] + getTotalDivesForDepth(4),
        },
        perfectTaskExecutions: {
            ...prevDive.perfectTaskExecutions,
            HOLDPOSITION:
                prevDive.perfectTaskExecutions.HOLDPOSITION +
                getPerfectTaskCount(TaskType.HOLDPOSITION),
            UPANDDOWN:
                prevDive.perfectTaskExecutions.UPANDDOWN +
                getPerfectTaskCount(TaskType.UPANDDOWN),
            HITDEPTH:
                prevDive.perfectTaskExecutions.HITDEPTH +
                getPerfectTaskCount(TaskType.HITDEPTH),
            HOLDANDCLAP:
                prevDive.perfectTaskExecutions.HOLDANDCLAP +
                getPerfectTaskCount(TaskType.HOLDANDCLAP),
        },
    }

    const prevSession = profile.sessionStats || createEmptySessionStats()
    let nextSessionStats = prevSession

    if (newRank !== Rank.FAILED) {
        const prevLevelStats = prevSession.levelScores[currentLevel.id] || {
            rank: Rank.FAILED,
            bestScore: 0,
            attempts: 0,
            lastScore: 0,
            surfacePenalties: Infinity,
        }
        const bestRank =
            newRank > prevLevelStats.rank ? newRank : prevLevelStats.rank
        const bestScore =
            playerScore > prevLevelStats.bestScore
                ? playerScore
                : prevLevelStats.bestScore
        const tempPenalties = getTotalPenalties()
        const bestSurfacePenalties =
            tempPenalties < prevLevelStats.surfacePenalties
                ? tempPenalties
                : prevLevelStats.surfacePenalties
        const finishedLoads = currentLevel.finishedLoads || 0
        const isNewDay = today !== prevSession.lastPlayDate
        const levelsToday = isNewDay
            ? finishedLoads
            : prevSession.levelsCompletedToday + finishedLoads
        const newPlayDates = [
            ...prevSession.playDates,
            ...Array(finishedLoads).fill(today),
        ]

        nextSessionStats = {
            ...prevSession,
            lastPlayDate: today,
            playDates: newPlayDates,
            levelsCompletedToday: levelsToday,
            levelScores: {
                ...prevSession.levelScores,
                [currentLevel.id]: {
                    rank: bestRank,
                    bestScore,
                    attempts: prevLevelStats.attempts + 1,
                    lastScore: playerScore,
                    surfacePenalties: bestSurfacePenalties,
                },
            },
        }

        applySessionAchievements(
            a,
            prevSession,
            nextSessionStats,
            currentLevel.id,
            newRank,
            finishedLoads,
            today
        )
    }

    return {
        timeStats: nextTimeStats,
        diveStats: nextDiveStats,
        sessionStats: nextSessionStats,
        achievements: a.state,
        newlyUnlockedIds: a.newlyUnlockedIds,
    }
}
