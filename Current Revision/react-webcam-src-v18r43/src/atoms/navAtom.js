import { atom } from "jotai";

export const SETUP = 0
export const CALIBRATE = 1
export const TRAINING = 2
export const PLAYING = 3
export const PAUSED = 4
export const INSTRUCTIONS = 5
export const GAMEOVER = 6
export const ACHIEVEMENTS = 7
export const MIC = 8
export const BUTTPLUG = 9
export const LEVEL_EDITOR = 10
export const AUDIO_PACK_EDITOR = 11
export const CONTENT_LIBRARY = 12
export const THEMES = 13

export const navAtom = atom(INSTRUCTIONS)
export const isPlayingAtom = atom(false)



// State system
// 0 - placing 4 markers
// 1 - calibration, waiting to lock in the base colors
// 2 - training scenario, pick one
// 5 - instructions page
// 6 - game over screen
// 7 - achievements page
// 8 - mic settings
// 9 - buttplug integration
