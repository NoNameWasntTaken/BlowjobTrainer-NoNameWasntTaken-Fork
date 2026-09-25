import { atom } from 'jotai'

/** Initial shape — reset on level select (Training) and before play (Playing pipeline). */
export const INITIAL_CAPTURE_SESSION = {
    capturesEnabled: false,
    /** Level could allow photos/videos somewhere in its task list (session gate cleared). */
    levelAllowsPhotos: false,
    levelAllowsVideos: false,
    /** Get Ready / Calibration / Rest — show inactive glyphs for channels the level supports. */
    introStyleCaptureHud: false,
    hiddenNotificationsAllowed: false,
    photosTaken: 0,
    videosTaken: 0,
    visiblePhotosTaken: 0,
    visibleVideosTaken: 0,
    currentChanceBonus: 0,
    isCoolingDown: false,
    /** When true, cooldown suppresses standby icons (visible capture). Hidden captures keep prior HUD. */
    lastCaptureUiVisible: false,
    isRecording: false,
    /** After visible-notification photo; while > Date.now(), photo icon stays active (red). */
    photoActiveUntilMs: 0,
    photoIconState: 'inactive',
    videoIconState: 'inactive',
    showStandbyInactiveIcons: false,
}

export const captureSessionAtom = atom({ ...INITIAL_CAPTURE_SESSION })
