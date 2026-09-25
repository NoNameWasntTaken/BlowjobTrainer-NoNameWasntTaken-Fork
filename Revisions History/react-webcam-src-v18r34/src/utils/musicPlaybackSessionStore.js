import { store } from '../store'
import { musicPlaybackSessionAtom, musicFadeOutEnabledAtom } from '../atoms/audioAtom'

/**
 * Clears level background music session. Idempotent when `url` is already null.
 * @param {boolean} [immediate=false] If true, skip fade-out (instant teardown), e.g. level cancel or leaving Gameover.
 */
export function clearMusicPlaybackSession(immediate = false) {
    const stopFade = immediate ? false : store.get(musicFadeOutEnabledAtom)
    store.set(musicPlaybackSessionAtom, (prev) => {
        if (!prev.url) {
            return prev
        }
        return {
            url: null,
            generation: prev.generation + 1,
            stopFade,
        }
    })
}
