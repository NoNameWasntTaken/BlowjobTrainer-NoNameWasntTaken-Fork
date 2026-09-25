/** Default capture-related fields for levels (custom + merged onto baked-in levels at runtime). */
export const DEFAULT_CAPTURE_LEVEL_FIELDS = {
    allowsCaptures: false,
    allowsHiddenCaptures: false,
    chanceOfCapture: 25,
    compoundingChance: 5,
    captureCooldown: 10,
    captureTypeBias: 50,
    captureOutput: '',
    photoCaptureLimit: 3,
    videoCaptureLimit: 3,
    showStandbyInactiveIcons: false,
}

/** Per-task capture defaults when missing (custom tasks from editor). */
export const DEFAULT_TASK_CAPTURE_FIELDS = {
    allowPhotos: false,
    allowVideos: false,
    captureNotificationVisibilityBias: 100,
}

export function mergeLevelCaptureDefaults(level) {
    if (!level || typeof level !== 'object') return level
    return { ...DEFAULT_CAPTURE_LEVEL_FIELDS, ...level }
}

export function mergeTaskCaptureDefaults(task) {
    if (!task || typeof task !== 'object') return task
    return { ...DEFAULT_TASK_CAPTURE_FIELDS, ...task }
}
