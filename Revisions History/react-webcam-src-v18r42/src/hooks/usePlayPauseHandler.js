import { useState, useCallback } from 'react'
import { useAtom, useSetAtom } from 'jotai'
import { playStateAtom, PlayState } from '../atoms/taskAtom'
import { vibrateSpeedAtom, preserveVibrationAtom } from '../atoms/buttplugAtom'
import {
    ensureGameplayMicBeforeResume,
    isGameplayMicActive,
} from '../services/gameplayMicSession'

/** Shared play/pause + mic resume path (Navigation, LimitedNavigation, auto-start chrome). */
export function usePlayPauseHandler() {
    const [playState, setPlayState] = useAtom(playStateAtom)
    const [resumeMicLoading, setResumeMicLoading] = useState(false)
    const setVibrateSpeed = useSetAtom(vibrateSpeedAtom)
    const setPreserveVibration = useSetAtom(preserveVibrationAtom)

    const handlePlayPause = useCallback(() => {
        // Clear any in-flight skip-feedback handoff so a pause always wins and vibration
        // actually zeroes instead of being preserved through the pause.
        setPreserveVibration(false)
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
    }, [playState, setPlayState, setVibrateSpeed, setPreserveVibration])

    return { playState, handlePlayPause, resumeMicLoading }
}
