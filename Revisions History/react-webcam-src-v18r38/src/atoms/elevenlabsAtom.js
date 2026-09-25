import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

export const apiKeyAtom = atomWithStorage('elevenlabs_api_key', '')
export const voiceIdAtom = atomWithStorage('elevenlabs_voice_id', '')
export const speedAtom = atom(0.9)
export const stabilityAtom = atom(50)
export const similarityAtom = atom(50)
export const styleAtom = atom(0)
