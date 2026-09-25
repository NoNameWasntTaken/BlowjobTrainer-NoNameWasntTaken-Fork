import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import {
    playerProfilesAtom,
    DEFAULT_PROFILE_ID,
    createDefaultPlayerProfilesState,
    createEmptyTimeStats,
    createEmptyDiveStats,
    createEmptySessionStats,
    createEmptyAchievements,
    createEmptyPerformanceStats,
    normalizePlayerProfilesState,
    getResolvedActiveProfileId,
} from '../../atoms/playerAtom'
import { activeBackgroundTrackIdAtom } from '../../atoms/audioAtom'
import {
    formatTime,
    formatHoldTimeStatsDisplay,
    calculateLongestStreak,
} from '../../constants/helpers'
import { STR } from '../../constants/stringsreplace'
import { useState, useEffect } from 'react'
import { audioManager } from '../../services/audioManager'
import { musicTrackManager } from '../../services/musicTrackManager'
import { levelManager } from '../../services/levelManager'
import { storageService, audioFileService } from '../../services/storageService'
import * as NAV from '../../atoms/navAtom'
import { navAtom } from '../../atoms/navAtom'
import { store } from '../../store'
import { showHiddenContentAtom } from '../../atoms/hiddenContentAtom'

function Stats({ children }) {
    const nav = useAtomValue(navAtom)
    const sessionLocked = nav === NAV.PLAYING || nav === NAV.GAMEOVER

    const [cancelAllCountdown, setCancelAllCountdown] = useState(null)
    const [countdownAll, setCountdownAll] = useState(10)
    const [cancelProfileCountdown, setCancelProfileCountdown] = useState(null)
    const [countdownProfile, setCountdownProfile] = useState(5)
    const [cancelResetDefault, setCancelResetDefault] = useState(null)
    const [countdownResetDefault, setCountdownResetDefault] = useState(5)
    const [cancelDeleteAllProfiles, setCancelDeleteAllProfiles] = useState(null)
    const [countdownDeleteAllProfiles, setCountdownDeleteAllProfiles] = useState(5)
    const [deleteAllCustomModalOpen, setDeleteAllCustomModalOpen] = useState(false)

    const [ppRaw] = useAtom(playerProfilesAtom)
    const setPlayerProfiles = useSetAtom(playerProfilesAtom)
    const setActiveBg = useSetAtom(activeBackgroundTrackIdAtom)

    const pp = normalizePlayerProfilesState(ppRaw)
    const resolvedId = getResolvedActiveProfileId(pp)
    const activeProfile = pp.profiles[resolvedId]
    const timeStats = activeProfile?.timeStats ?? createEmptyTimeStats()
    const diveStats = activeProfile?.diveStats ?? createEmptyDiveStats()
    const sessionStats = activeProfile?.sessionStats ?? createEmptySessionStats()
    const isDefaultActive = pp.activeProfileId === DEFAULT_PROFILE_ID

    useEffect(() => {
        return () => {
            if (cancelAllCountdown) clearInterval(cancelAllCountdown.id)
            if (cancelProfileCountdown) clearInterval(cancelProfileCountdown.id)
            if (cancelResetDefault) clearInterval(cancelResetDefault.id)
            if (cancelDeleteAllProfiles) clearInterval(cancelDeleteAllProfiles.id)
        }
    }, [cancelAllCountdown, cancelProfileCountdown, cancelResetDefault, cancelDeleteAllProfiles])

    const clearAllOtherDestructiveCountdowns = () => {
        if (cancelResetDefault) {
            clearInterval(cancelResetDefault.id)
            setCancelResetDefault(null)
            setCountdownResetDefault(5)
        }
        if (cancelDeleteAllProfiles) {
            clearInterval(cancelDeleteAllProfiles.id)
            setCancelDeleteAllProfiles(null)
            setCountdownDeleteAllProfiles(5)
        }
        if (cancelProfileCountdown) {
            clearInterval(cancelProfileCountdown.id)
            setCancelProfileCountdown(null)
            setCountdownProfile(5)
        }
    }

    useEffect(() => {
        if (!deleteAllCustomModalOpen) return
        const onKey = (e) => {
            if (e.key === 'Escape') setDeleteAllCustomModalOpen(false)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [deleteAllCustomModalOpen])

    const runFactoryReset = async () => {
        const showHidden = store.get(showHiddenContentAtom)
        if (showHidden) {
            try {
                await audioFileService.clearAllAudioFiles()
            } catch (e) {
                console.warn('clearAllAudioFiles', e)
            }
            storageService.clearAllCustomContent()
            audioManager.clearCustomContentCache()
            setActiveBg(null)
            setPlayerProfiles(createDefaultPlayerProfilesState())
            audioManager.validateActivePack()
            return
        }

        const packs = storageService.getAllAudioPacks()
        for (const packId of Object.keys(packs)) {
            if (packs[packId].hidden !== true) {
                try {
                    await audioManager.deletePack(packId)
                } catch (e) {
                    console.warn('deletePack', packId, e)
                }
            }
        }
        const tracks = storageService.getAllBackgroundTracks()
        for (const tid of Object.keys(tracks)) {
            if (tracks[tid].hidden !== true) {
                try {
                    await musicTrackManager.deleteTrack(tid)
                } catch (e) {
                    console.warn('deleteTrack', tid, e)
                }
            }
        }
        const levels = storageService.getAllLevels()
        for (const lid of Object.keys(levels)) {
            if (levels[lid].hidden !== true) {
                try {
                    levelManager.deleteLevel(lid)
                } catch (e) {
                    console.warn('deleteLevel', lid, e)
                }
            }
        }

        setPlayerProfiles((prev) => {
            const n = normalizePlayerProfilesState(prev)
            const defaultProf =
                n.profiles[DEFAULT_PROFILE_ID] ??
                createDefaultPlayerProfilesState().profiles[DEFAULT_PROFILE_ID]
            const nextProfiles = {
                [DEFAULT_PROFILE_ID]: {
                    ...defaultProf,
                    hidden: false,
                    timeStats: createEmptyTimeStats(),
                    diveStats: createEmptyDiveStats(),
                    sessionStats: createEmptySessionStats(),
                    achievements: createEmptyAchievements(),
                    performanceStats: createEmptyPerformanceStats(),
                },
            }
            for (const pid of Object.keys(n.profiles)) {
                if (pid !== DEFAULT_PROFILE_ID && n.profiles[pid].hidden === true) {
                    nextProfiles[pid] = n.profiles[pid]
                }
            }
            let aid = n.activeProfileId
            if (!nextProfiles[aid]) {
                aid = DEFAULT_PROFILE_ID
            }
            return {
                ...n,
                profiles: nextProfiles,
                activeProfileId: aid,
            }
        })

        audioManager.validateActivePack()
    }

    const startDeleteAllCustomCountdown = () => {
        setCountdownAll(10)
        const intervalId = setInterval(() => {
            setCountdownAll((prev) => {
                const newCount = prev - 1
                if (newCount === 0) {
                    clearInterval(intervalId)
                    setCancelAllCountdown(null)
                    void runFactoryReset()
                    setCountdownAll(10)
                }
                return newCount
            })
        }, 1000)
        setCancelAllCountdown({ id: intervalId })
    }

    const removeCurrentProfileOnly = () => {
        setPlayerProfiles((prev) => {
            const n = normalizePlayerProfilesState(prev)
            const id = n.activeProfileId
            if (id === DEFAULT_PROFILE_ID) return n
            const { [id]: _removed, ...rest } = n.profiles
            return {
                ...n,
                activeProfileId: DEFAULT_PROFILE_ID,
                profiles: rest,
            }
        })
    }

    const resetDefaultProfileStatsOnly = () => {
        setPlayerProfiles((prev) => {
            const n = normalizePlayerProfilesState(prev)
            const def = n.profiles[DEFAULT_PROFILE_ID]
            if (!def) return n
            return {
                ...n,
                profiles: {
                    ...n.profiles,
                    [DEFAULT_PROFILE_ID]: {
                        ...def,
                        timeStats: createEmptyTimeStats(),
                        diveStats: createEmptyDiveStats(),
                        sessionStats: createEmptySessionStats(),
                        achievements: createEmptyAchievements(),
                        performanceStats: createEmptyPerformanceStats(),
                    },
                },
            }
        })
    }

    const deleteAllNonDefaultProfiles = () => {
        const showHidden = store.get(showHiddenContentAtom)
        setPlayerProfiles((prev) => {
            const n = normalizePlayerProfilesState(prev)
            const defaultProf =
                n.profiles[DEFAULT_PROFILE_ID] ??
                createDefaultPlayerProfilesState().profiles[DEFAULT_PROFILE_ID]
            if (showHidden) {
                return {
                    ...n,
                    activeProfileId: DEFAULT_PROFILE_ID,
                    profiles: { [DEFAULT_PROFILE_ID]: defaultProf },
                }
            }
            const nextProfiles = {
                [DEFAULT_PROFILE_ID]: { ...defaultProf, hidden: false },
            }
            for (const pid of Object.keys(n.profiles)) {
                if (pid !== DEFAULT_PROFILE_ID && n.profiles[pid].hidden === true) {
                    nextProfiles[pid] = n.profiles[pid]
                }
            }
            let aid = n.activeProfileId
            if (!nextProfiles[aid]) {
                aid = DEFAULT_PROFILE_ID
            }
            return {
                ...n,
                activeProfileId: aid,
                profiles: nextProfiles,
            }
        })
    }

    const handleResetDefaultProfile = () => {
        if (sessionLocked || !isDefaultActive) return
        if (cancelResetDefault) {
            clearInterval(cancelResetDefault.id)
            setCancelResetDefault(null)
            setCountdownResetDefault(5)
            return
        }
        if (cancelDeleteAllProfiles) {
            clearInterval(cancelDeleteAllProfiles.id)
            setCancelDeleteAllProfiles(null)
            setCountdownDeleteAllProfiles(5)
        }
        if (cancelAllCountdown) {
            clearInterval(cancelAllCountdown.id)
            setCancelAllCountdown(null)
            setCountdownAll(10)
        }
        setCountdownResetDefault(5)
        const intervalId = setInterval(() => {
            setCountdownResetDefault((prev) => {
                const newCount = prev - 1
                if (newCount === 0) {
                    clearInterval(intervalId)
                    setCancelResetDefault(null)
                    resetDefaultProfileStatsOnly()
                    setCountdownResetDefault(5)
                }
                return newCount
            })
        }, 1000)
        setCancelResetDefault({ id: intervalId })
    }

    const handleDeleteAllProfiles = () => {
        if (sessionLocked || !isDefaultActive) return
        if (cancelDeleteAllProfiles) {
            clearInterval(cancelDeleteAllProfiles.id)
            setCancelDeleteAllProfiles(null)
            setCountdownDeleteAllProfiles(5)
            return
        }
        if (cancelResetDefault) {
            clearInterval(cancelResetDefault.id)
            setCancelResetDefault(null)
            setCountdownResetDefault(5)
        }
        if (cancelAllCountdown) {
            clearInterval(cancelAllCountdown.id)
            setCancelAllCountdown(null)
            setCountdownAll(10)
        }
        setCountdownDeleteAllProfiles(5)
        const intervalId = setInterval(() => {
            setCountdownDeleteAllProfiles((prev) => {
                const newCount = prev - 1
                if (newCount === 0) {
                    clearInterval(intervalId)
                    setCancelDeleteAllProfiles(null)
                    deleteAllNonDefaultProfiles()
                    setCountdownDeleteAllProfiles(5)
                }
                return newCount
            })
        }, 1000)
        setCancelDeleteAllProfiles({ id: intervalId })
    }

    const handleDeleteAllStats = () => {
        if (sessionLocked) return
        if (cancelAllCountdown) {
            clearInterval(cancelAllCountdown.id)
            setCancelAllCountdown(null)
            setCountdownAll(10)
            return
        }
        clearAllOtherDestructiveCountdowns()
        setDeleteAllCustomModalOpen(true)
    }

    const handleConfirmDeleteAllCustomModal = () => {
        setDeleteAllCustomModalOpen(false)
        startDeleteAllCustomCountdown()
    }

    const handleDismissDeleteAllCustomModal = () => {
        setDeleteAllCustomModalOpen(false)
    }

    const handleDeleteProfile = () => {
        if (sessionLocked || isDefaultActive) return
        if (cancelProfileCountdown) {
            clearInterval(cancelProfileCountdown.id)
            setCancelProfileCountdown(null)
            setCountdownProfile(5)
            return
        }
        setCountdownProfile(5)
        const intervalId = setInterval(() => {
            setCountdownProfile((prev) => {
                const newCount = prev - 1
                if (newCount === 0) {
                    clearInterval(intervalId)
                    setCancelProfileCountdown(null)
                    removeCurrentProfileOnly()
                    setCountdownProfile(5)
                }
                return newCount
            })
        }, 1000)
        setCancelProfileCountdown({ id: intervalId })
    }

    const totalDives = Object.values(diveStats.divesByDepth).reduce((sum, count) => sum + count, 0)
    const totalHoldTime = Object.values(timeStats.holdTimeByDepth).reduce((sum, time) => sum + time, 0)
    const levelsCompleted = sessionStats.playDates.length
    const longestStreak = calculateLongestStreak(sessionStats.playDates)
    const highestDailyLevels = Math.max(
        sessionStats.levelsCompletedToday,
        ...sessionStats.playDates.map((date) =>
            Object.values(sessionStats.levelScores).filter(
                (score) =>
                    score.lastScore &&
                    new Date(score.lastScore).toDateString() === new Date(date).toDateString()
            ).length
        )
    )

    return (
        <div>
            <h2 className="margin-y stats-section-heading">{STR.Stats.your_diving_stats}</h2>

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
                    <span>{STR.Stats.longest_streak}</span>
                    <span>{longestStreak}</span>
                </div>
                <div className="card-row border-bottom">
                    <span>{STR.Stats.levels_today}</span>
                    <span>{sessionStats.levelsCompletedToday}</span>
                </div>
            </div>

            <div className="card margin-y-lg" key={`dive-${resolvedId}`}>
                <h3>{STR.Stats.dive_stats}</h3>
                <div className="card-row border-bottom">
                    <span>{STR.Stats.total_dives}</span>
                    <span>{totalDives}</span>
                </div>
                {Object.entries(diveStats.divesByDepth).map(([depth, count]) => (
                    <div key={depth} className="card-row border-bottom">
                        <span>
                            {depth} {STR.Depth[depth]}:
                        </span>
                        <span>{count}</span>
                    </div>
                ))}
            </div>

            <div className="card margin-y-lg" key={`hold-${resolvedId}`}>
                <h3>Hold Time Stats</h3>
                <div className="card-row border-bottom">
                    <span>Total Hold Time:</span>
                    <span>{formatHoldTimeStatsDisplay(totalHoldTime)}</span>
                </div>
                {Object.entries(timeStats.holdTimeByDepth).map(([depth, time]) => (
                    <div key={depth} className="card-row border-bottom">
                        <span>
                            {depth} {STR.Depth[depth]}:
                        </span>
                        <span>{formatHoldTimeStatsDisplay(time)}</span>
                    </div>
                ))}
            </div>

            <h3 className="margin-y-lg stats-section-heading">{STR.Stats.achievements}</h3>
            {children}

            <div
                className="row-centered margin-y-lg"
                style={{ flexDirection: 'column', gap: '12px' }}
            >
                {isDefaultActive ? (
                    <>
                        <div
                            className="row"
                            style={{
                                justifyContent: 'center',
                                flexWrap: 'wrap',
                                gap: '12px',
                                width: '100%',
                                maxWidth: '480px',
                                marginLeft: 'auto',
                                marginRight: 'auto',
                            }}
                        >
                            <button
                                type="button"
                                className={
                                    cancelResetDefault ? 'button button-warning' : 'button'
                                }
                                style={{ flex: '1 1 140px', minWidth: 'min(100%, 200px)' }}
                                disabled={sessionLocked}
                                onClick={handleResetDefaultProfile}
                            >
                                {!cancelResetDefault
                                    ? STR.Stats.reset_default_profile
                                    : `Confirm in...${countdownResetDefault}`}
                            </button>
                            <button
                                type="button"
                                className={
                                    cancelDeleteAllProfiles ? 'button button-warning' : 'button'
                                }
                                style={{ flex: '1 1 140px', minWidth: 'min(100%, 200px)' }}
                                disabled={sessionLocked}
                                onClick={handleDeleteAllProfiles}
                            >
                                {!cancelDeleteAllProfiles
                                    ? STR.Stats.delete_all_profiles
                                    : `Confirm in...${countdownDeleteAllProfiles}`}
                            </button>
                        </div>
                        <button
                            type="button"
                            className={
                                cancelAllCountdown
                                    ? 'margin-x button button-warning'
                                    : 'margin-x button button-danger-outline'
                            }
                            disabled={sessionLocked}
                            onClick={handleDeleteAllStats}
                        >
                            {!cancelAllCountdown ? 'Delete All Content' : `Delete All in...${countdownAll}`}
                        </button>
                    </>
                ) : (
                    <button
                        type="button"
                        className={
                            cancelProfileCountdown ? 'margin-x button button-warning' : 'margin-x button'
                        }
                        disabled={sessionLocked}
                        onClick={handleDeleteProfile}
                    >
                        {!cancelProfileCountdown ? 'Delete Profile' : `Delete in...${countdownProfile}`}
                    </button>
                )}
            </div>

            {deleteAllCustomModalOpen ? (
                <div
                    className="stats-confirm-overlay"
                    onClick={handleDismissDeleteAllCustomModal}
                    role="presentation"
                >
                    <div
                        className="stats-confirm-dialog"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="stats-delete-all-custom-title"
                    >
                        <h3 id="stats-delete-all-custom-title">
                            {STR.Stats.delete_all_custom_modal_title}
                        </h3>
                        <p>{STR.Stats.delete_all_custom_modal_body}</p>
                        <div className="stats-confirm-actions">
                            <button
                                type="button"
                                className="button"
                                onClick={handleDismissDeleteAllCustomModal}
                            >
                                {STR.Stats.cancel_action}
                            </button>
                            <button
                                type="button"
                                className="button button-danger-outline"
                                onClick={handleConfirmDeleteAllCustomModal}
                            >
                                {STR.Stats.confirm_action}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}

export default Stats
