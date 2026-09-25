import { useState, useCallback } from 'react'
import { useAtom, useSetAtom } from 'jotai'
import { playStateAtom, PlayState } from '../atoms/taskAtom'
import { vibrateSpeedAtom } from '../atoms/buttplugAtom'
import {
    ensureGameplayMicBeforeResume,
    isGameplayMicActive,
} from '../services/gameplayMicSession'

/** Shared play/pause + mic resume path (Navigation, LimitedNavigation, auto-start chrome). */
export function usePlayPauseHandler() {
    const [playState, setPlayState] = useAtom(playStateAtom)
    const [resumeMicLoading, setResumeMicLoading] = useState(false)
    const setVibrateSpeed = useSetAtom(vibrateSpeedAtom)

    const handlePlayPause = useCallback(() => {
        setVibrateSpeed(0)
        if (playState === PlayState.PLAYING) {
            setPlayState(PlayState.PAUSED)
        } else if (playState === PlayState.PAUSED) {
            void (async () => {
                setResumeMicLoading(true)
                try {
                    await ensureGameplayMicBeforeResume()
                    if (!isGameplayMicActive()) {
                        window.alert('Microphone could not be restarted. Check permissions and try again.')
                        return
                    }
                    setPlayState(PlayState.PLAYING)
                } catch (e) {
                    console.error('Resume: microphone error:', e)
                    window.alert(e?.message || 'Could not access the microphone for gameplay.')
                } finally {
                    setResumeMicLoading(false)
                }
            })()
        }
    }, [playState, setPlayState, setVibrateSpeed])

    return { playState, handlePlayPause, resumeMicLoading }
}
