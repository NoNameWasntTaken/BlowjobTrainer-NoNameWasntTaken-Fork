import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { playStateAtom, PlayState } from './taskAtom';

export const mirrorModeAtom = atomWithStorage('mirrorMode', false);

export const effectiveMirrorAtom = atom((get) => {
    const mirrorEnabled = get(mirrorModeAtom);
    const playState = get(playStateAtom);
    return mirrorEnabled && playState === PlayState.PLAYING;
});
