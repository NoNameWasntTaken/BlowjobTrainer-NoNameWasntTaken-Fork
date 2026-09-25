import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { normalizeRotation } from '../utils/previewToBufferCoords'

const baseAtom = atomWithStorage('cameraRotation', 0)

export const cameraRotationAtom = atom(
    get => normalizeRotation(get(baseAtom)),
    (get, set, update) => {
        const prev = normalizeRotation(get(baseAtom))
        const next = typeof update === 'function' ? update(prev) : update
        set(baseAtom, normalizeRotation(next))
    }
)
