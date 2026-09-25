import { atom } from "jotai";
import { atomWithStorage } from 'jotai/utils';

export const sfxAtom = atom(0)
export const captureSfxAtom = atom(0)
export const feedbackAtom = atom(0)

/**
 * Lifecycle of instruction line `playVoice(currentTask.audio)` for tasks that use it — Speak and
 * (via useClapInstructionPhase + AudioPlayer) Clap / Hold and Clap. Not feedback / Task.GOOD lines.
 */
export const taskInstructionVoicePhaseAtom = atom('idle')

/**
 * Speak task: whether Sherpa may receive PCM (opens before instruction ends when overlap is scheduled).
 */
export const speakPcmFeedAllowedAtom = atom(true)

/**
 * Speak task: whether a matched phrase may advance scoring (after instruction + tail when clip exists).
 */
export const speakRecognitionAllowedAtom = atom(true)
// Increment to request voice channel stop (used when suppressFeedback transitions)
export const stopVoiceRequestAtom = atom(0)
export const activePackIdAtom = atom(null)

// Volume controls (0.0 to 1.0, persisted to localStorage)
export const sfxVolumeAtom = atomWithStorage('sfxVolume', 1.0)     // Default 100%
export const voiceVolumeAtom = atomWithStorage('voiceVolume', 1.0) // Default 100%
export const musicVolumeAtom = atomWithStorage('musicVolume', 0.8)

export const musicFadeInEnabledAtom = atomWithStorage('musicFadeIn', true)
export const musicFadeInDurationAtom = atomWithStorage('musicFadeInDuration', 3)
export const musicFadeOutEnabledAtom = atomWithStorage('musicFadeOut', true)
export const musicFadeOutDurationAtom = atomWithStorage('musicFadeOutDuration', 3)

/** Content Library: which background track is selected for "use selected" / priority 3 */
export const activeBackgroundTrackIdAtom = atomWithStorage('active_bg_music_id', null, undefined, {
    /** Read localStorage on first use so `store.get()` matches persisted id before any component mounts. */
    getOnInit: true,
})

/**
 * `MediaDeviceInfo.deviceId` for `audioinput`. `null` uses the system default
 * (no exact deviceId), matching the Audio source "Default microphone" option.
 */
export const micInputDeviceIdAtom = atomWithStorage('micInputDeviceId', null, undefined, {
    getOnInit: true,
})

/** Driving AudioPlayer: bump generation whenever a new session should start (incl. url null). stopFade: fade out before clear (e.g. Mic test off). */
export const musicPlaybackSessionAtom = atom({ url: null, generation: 0, stopFade: false })