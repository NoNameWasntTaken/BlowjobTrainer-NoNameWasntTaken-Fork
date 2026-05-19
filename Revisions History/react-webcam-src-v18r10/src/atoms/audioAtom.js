import { atom } from "jotai";
import { atomWithStorage } from 'jotai/utils';

export const sfxAtom = atom(0)
export const feedbackAtom = atom(0)
export const activePackIdAtom = atom(null)

// Volume controls (0.0 to 1.0, persisted to localStorage)
export const sfxVolumeAtom = atomWithStorage('sfxVolume', 1.0)     // Default 100%
export const voiceVolumeAtom = atomWithStorage('voiceVolume', 1.0) // Default 100%