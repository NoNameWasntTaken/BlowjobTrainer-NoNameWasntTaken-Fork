/**
 * Shared {@link MediaTrackConstraints} for microphone capture (getUserMedia).
 * Browser/OS may ignore or partially apply; helps ASR and claps when speakers play reference audio.
 */
export const MIC_CAPTURE_AUDIO_CONSTRAINTS = Object.freeze({
    echoCancellation: true,
    noiseSuppression: true,
})

/**
 * @param {string | null | undefined} deviceId - From `audioinput` enumerateDevices; omit for system default.
 * @returns {MediaTrackConstraints}
 */
export function buildMicAudioConstraints(deviceId) {
    const base = {
        echoCancellation: MIC_CAPTURE_AUDIO_CONSTRAINTS.echoCancellation,
        noiseSuppression: MIC_CAPTURE_AUDIO_CONSTRAINTS.noiseSuppression,
    }
    if (deviceId) {
        return { ...base, deviceId: { exact: deviceId } }
    }
    return base
}
