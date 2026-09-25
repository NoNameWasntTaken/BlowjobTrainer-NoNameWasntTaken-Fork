import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { captureSessionAtom } from '../atoms/captureAtom'
import { store } from '../store'
import { cameraRotationAtom } from '../atoms/cameraRotationAtom'
import { mergeLevelCaptureDefaults, mergeTaskCaptureDefaults } from '../constants/captureLevelDefaults'
import * as captureService from '../services/captureService'
import { getCaptureRefs } from '../utils/captureWebcamRef'
import { TaskType } from '../components/Tasks/task'

function rnd() {
    return Math.random()
}

const PHOTO_VISIBLE_ACTIVE_MS = 5000

/** Tasks that do not roll captures — HUD shows level-wide channels (inactive) while standby mode is on. */
function isIntroStyleCaptureHudTask(task) {
    if (!task) return false
    const ty = task.type
    return (
        ty === TaskType.GETREADY ||
        ty === TaskType.CALIBRATION ||
        ty === TaskType.REST ||
        ty === 'rest ball'
    )
}

/**
 * Task types whose component always signals { videos: false }.
 * Even if task data has allowVideos=true, the icon should never show video standby.
 */
const TASK_TYPES_NO_VIDEO = new Set([TaskType.HITDEPTH])

/**
 * Task types whose component always signals { photos: false }.
 * Even if task data has allowPhotos=true, the icon should never show photo standby.
 */
const TASK_TYPES_NO_PHOTO = new Set([TaskType.UPANDDOWN])

/** Visible-notification photo highlight (red); standby HUD when level flag set + task supports + not on cooldown. */
function computePhotoIconState(mergedLevel, task, s) {
    const now = Date.now()
    if ((s.photoActiveUntilMs || 0) > now) return 'active'

    if (!mergedLevel?.showStandbyInactiveIcons) return 'inactive'
    if (s.isCoolingDown && s.lastCaptureUiVisible) return 'inactive'
    if (TASK_TYPES_NO_PHOTO.has(task?.type)) return 'inactive'

    const t = mergeTaskCaptureDefaults(task)
    const photoCap = (Number(mergedLevel.photoCaptureLimit) || 0) > s.photosTaken
    if (t.allowPhotos === true && photoCap) return 'standby'
    return 'inactive'
}

/** Standby when level flag + task supports video + not on cooldown (only while not recording). */
function computeVideoIconWhenIdle(mergedLevel, task, s) {
    if (!mergedLevel?.showStandbyInactiveIcons) return 'inactive'
    if (s.isCoolingDown && s.lastCaptureUiVisible) return 'inactive'
    if (TASK_TYPES_NO_VIDEO.has(task?.type)) return 'inactive'

    const t = mergeTaskCaptureDefaults(task)
    const videoCap = (Number(mergedLevel.videoCaptureLimit) || 0) > s.videosTaken
    if (t.allowVideos === true && videoCap) return 'standby'
    return 'inactive'
}

/**
 * @param {{
 *   level: object | null,
 *   playState: string,
 *   activeProfile: object | null,
 *   captureGate: boolean,
 * }} opts
 */
export function useCaptureManager({ level, playState, activeProfile, captureGate }) {
    const cameraRotationDeg = useAtomValue(cameraRotationAtom)
    const captureSession = useAtomValue(captureSessionAtom)
    const setCaptureSession = useSetAtom(captureSessionAtom)

    const lastRollAtRef = useRef(0)
    const captureIndexRef = useRef(1)
    const outputDirRef = useRef(null)
    const outputDirPromiseRef = useRef(null)
    const cooldownTimeoutRef = useRef(null)

    const mergedLevel = useMemo(
        () => (level ? mergeLevelCaptureDefaults(level) : null),
        [level]
    )

    const capturesEnabled =
        !!captureGate &&
        !!mergedLevel &&
        captureService.runCapturesPreflight(activeProfile, mergedLevel).allowed

    const hiddenAllowed =
        !!captureGate &&
        !!mergedLevel &&
        captureService.runHiddenNotificationsPreflight(activeProfile, mergedLevel).allowed

    useEffect(() => {
        if (!mergedLevel || !capturesEnabled || playState !== 'PLAYING') {
            outputDirRef.current = null
            outputDirPromiseRef.current = null
            return
        }
        const p = captureService.getResolvedCaptureOutputDir(mergedLevel.captureOutput || '')
        outputDirPromiseRef.current = p
        void p.then((dir) => {
            outputDirRef.current = dir
        })
    }, [mergedLevel?.id, capturesEnabled, playState, mergedLevel?.captureOutput]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!mergedLevel || playState !== 'PLAYING') return
        const ch = captureService.getLevelCaptureChannelAvailability(activeProfile, mergedLevel)
        setCaptureSession((s) => ({
            ...s,
            capturesEnabled,
            hiddenNotificationsAllowed: hiddenAllowed,
            showStandbyInactiveIcons:
                capturesEnabled && !!mergedLevel?.showStandbyInactiveIcons,
            levelAllowsPhotos: capturesEnabled && ch.photoPossible,
            levelAllowsVideos: capturesEnabled && ch.videoPossible,
        }))
    }, [
        mergedLevel,
        mergedLevel?.id,
        playState,
        capturesEnabled,
        hiddenAllowed,
        activeProfile,
        setCaptureSession,
    ]) // eslint-disable-line react-hooks/exhaustive-deps

    /** Clear visible-photo highlight exactly when it expires so icons re-sync without waiting on cooldown tick. */
    useEffect(() => {
        const until = captureSession.photoActiveUntilMs
        if (!until || until <= Date.now()) return undefined
        const ms = Math.max(0, until - Date.now())
        const id = setTimeout(() => {
            setCaptureSession((prev) => ({ ...prev, photoActiveUntilMs: 0 }))
        }, ms)
        return () => clearTimeout(id)
    }, [captureSession.photoActiveUntilMs, setCaptureSession])

    /** Standby when task allows captures + not on cooldown; visible photo keeps red until photoActiveUntilMs. */
    useEffect(() => {
        if (!capturesEnabled || playState !== 'PLAYING' || !mergedLevel) return

        const task = level?.currentTask
        setCaptureSession((prev) => {
            if (!task) {
                const nextPhoto =
                    (prev.photoActiveUntilMs || 0) > Date.now() ? 'active' : 'inactive'
                const nextVideo = prev.isRecording ? prev.videoIconState : 'inactive'
                if (
                    prev.photoIconState === nextPhoto &&
                    prev.videoIconState === nextVideo &&
                    prev.introStyleCaptureHud === false
                ) {
                    return prev
                }
                return {
                    ...prev,
                    photoIconState: nextPhoto,
                    videoIconState: nextVideo,
                    introStyleCaptureHud: false,
                }
            }

            const nextPhoto = computePhotoIconState(mergedLevel, task, prev)
            const nextVideo = prev.isRecording
                ? prev.videoIconState
                : computeVideoIconWhenIdle(mergedLevel, task, prev)
            const introHud = isIntroStyleCaptureHudTask(task)

            if (
                prev.photoIconState === nextPhoto &&
                prev.videoIconState === nextVideo &&
                prev.introStyleCaptureHud === introHud
            ) {
                return prev
            }
            return {
                ...prev,
                photoIconState: nextPhoto,
                videoIconState: nextVideo,
                introStyleCaptureHud: introHud,
            }
        })
    }, [
        capturesEnabled,
        playState,
        mergedLevel,
        level?.currentTask,
        level?.currentTask?.id,
        captureSession.isCoolingDown,
        captureSession.lastCaptureUiVisible,
        captureSession.photosTaken,
        captureSession.videosTaken,
        captureSession.isRecording,
        captureSession.photoActiveUntilMs,
        captureSession.videoIconState,
        setCaptureSession,
    ])

    /** Cancel any pending cooldown timeout when the hook unmounts. */
    useEffect(() => {
        return () => {
            if (cooldownTimeoutRef.current !== null) {
                clearTimeout(cooldownTimeoutRef.current)
                cooldownTimeoutRef.current = null
            }
        }
    }, [])

    /**
     * Schedule a single timeout that clears `isCoolingDown` after `durationSec` seconds.
     * Any previous pending timeout is cancelled first so overlapping captures don't stack.
     */
    const scheduleCooldown = useCallback(
        (durationSec) => {
            if (cooldownTimeoutRef.current !== null) {
                clearTimeout(cooldownTimeoutRef.current)
            }
            cooldownTimeoutRef.current = setTimeout(() => {
                cooldownTimeoutRef.current = null
                setCaptureSession((prev) => {
                    if (!prev.isCoolingDown) return prev
                    return { ...prev, isCoolingDown: false, lastCaptureUiVisible: false }
                })
            }, durationSec * 1000)
        },
        [setCaptureSession]
    )

    const signalCaptureWindow = useCallback(
        (isWindowValid, availableTypes = {}) => {
            if (!capturesEnabled || !isWindowValid) return
            const now = Date.now()
            if (now - lastRollAtRef.current < 3000) return
            lastRollAtRef.current = now

            const session = store.get(captureSessionAtom)
            if (session.isCoolingDown) return
            if (session.isRecording) return

            const task = level?.currentTask
            if (!task || !mergedLevel) return
            const t = mergeTaskCaptureDefaults(task)

            const wantPhoto = !!availableTypes.photos && t.allowPhotos === true
            const wantVideo = !!availableTypes.videos && t.allowVideos === true
            if (!wantPhoto && !wantVideo) return

            const photoCap = (Number(mergedLevel.photoCaptureLimit) || 0) > session.photosTaken
            const videoCap = (Number(mergedLevel.videoCaptureLimit) || 0) > session.videosTaken
            const canPhoto = wantPhoto && photoCap
            const canVideo = wantVideo && videoCap
            if (!canPhoto && !canVideo) return

            const baseChance = Math.min(100, Math.max(0, Number(mergedLevel.chanceOfCapture) || 0))
            const bonus = Math.min(100 - baseChance, session.currentChanceBonus || 0)
            const pWin = (baseChance + bonus) / 100
            if (rnd() > pWin) {
                const comp = Math.min(
                    100 - baseChance,
                    (Number(mergedLevel.compoundingChance) || 0) + (session.currentChanceBonus || 0)
                )
                setCaptureSession((prev) => ({
                    ...prev,
                    currentChanceBonus: comp,
                }))
                return
            }

            const bias = Math.min(100, Math.max(0, Number(mergedLevel.captureTypeBias) || 50))
            let captureKind = 'photo'
            if (canPhoto && canVideo) {
                captureKind = rnd() * 100 < bias ? 'photo' : 'video'
            } else if (canVideo) {
                captureKind = 'video'
            }

            const visBias = Math.min(100, Math.max(0, t.captureNotificationVisibilityBias ?? 100))
            const notificationVisible = rnd() * 100 < visBias

            const name = captureService.formatCaptureName(
                mergedLevel.title || level?.id || 'level',
                captureIndexRef.current
            )
            captureIndexRef.current += 1

            void (async () => {
                const { webcamRef, canvasRef } = getCaptureRefs()
                if (!webcamRef?.current || !canvasRef?.current) return

                let dir = outputDirRef.current
                if (!dir && outputDirPromiseRef.current) {
                    dir = await outputDirPromiseRef.current
                }
                if (!dir) return

                const cooldownSec = Math.max(5, Number(mergedLevel.captureCooldown) || 10)
                const showStandby = !!mergedLevel.showStandbyInactiveIcons

                try {
                    if (captureKind === 'photo') {
                        await captureService.savePhoto(
                            canvasRef,
                            cameraRotationDeg,
                            name,
                            dir
                        )
                        setCaptureSession((prev) => ({
                            ...prev,
                            photosTaken: prev.photosTaken + 1,
                            visiblePhotosTaken: notificationVisible
                                ? prev.visiblePhotosTaken + 1
                                : prev.visiblePhotosTaken,
                            currentChanceBonus: 0,
                            isCoolingDown: true,
                            lastCaptureUiVisible: notificationVisible,
                            photoActiveUntilMs: notificationVisible
                                ? Date.now() + PHOTO_VISIBLE_ACTIVE_MS
                                : 0,
                        }))
                        scheduleCooldown(cooldownSec)
                        if (notificationVisible) {
                            captureService.playCaptureSfx('photo')
                        }
                    } else {
                        setCaptureSession((prev) => ({
                            ...prev,
                            isRecording: true,
                            videoIconState: notificationVisible ? 'active' : showStandby ? 'standby' : 'inactive',
                        }))
                        if (notificationVisible) {
                            captureService.playCaptureSfx('video')
                        }
                        await captureService.saveVideo(
                            webcamRef,
                            canvasRef,
                            cameraRotationDeg,
                            () => {
                                setCaptureSession((prev) => ({
                                    ...prev,
                                    isRecording: false,
                                    videosTaken: prev.videosTaken + 1,
                                    visibleVideosTaken: notificationVisible
                                        ? prev.visibleVideosTaken + 1
                                        : prev.visibleVideosTaken,
                                    currentChanceBonus: 0,
                                    isCoolingDown: true,
                                    lastCaptureUiVisible: notificationVisible,
                                    videoIconState: notificationVisible
                                        ? 'inactive'
                                        : showStandby
                                          ? 'standby'
                                          : 'inactive',
                                }))
                                scheduleCooldown(cooldownSec)
                                if (notificationVisible) {
                                    captureService.playCaptureSfx('video')
                                }
                            },
                            name,
                            dir
                        )
                    }
                } catch (e) {
                    console.warn('Capture failed', e)
                    const cooldownSec = Math.max(5, Number(mergedLevel.captureCooldown) || 10)
                    setCaptureSession((prev) => ({
                        ...prev,
                        isRecording: false,
                        isCoolingDown: true,
                        lastCaptureUiVisible: true,
                        videoIconState: 'inactive',
                    }))
                    scheduleCooldown(cooldownSec)
                }
            })()
        },
        [capturesEnabled, cameraRotationDeg, level, mergedLevel, setCaptureSession, scheduleCooldown]
    )

    const waitForRecordingSafe = useCallback(async () => {
        const t0 = Date.now()
        while (store.get(captureSessionAtom).isRecording && Date.now() - t0 < 2000) {
            await new Promise((r) => setTimeout(r, 50))
        }
    }, [])

    return {
        signalCaptureWindow,
        waitForRecordingSafe,
        capturesEnabled,
        hiddenNotificationsAllowed: hiddenAllowed,
    }
}
