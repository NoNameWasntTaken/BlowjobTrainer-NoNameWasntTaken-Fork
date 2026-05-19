import { useAtom, useAtomValue } from 'jotai'
import { useEffect, useCallback } from 'react'
import { playStateAtom, playTimeAtom, PlayState } from '../atoms/taskAtom'
import { formatTime } from '../constants/helpers'

const PlayTime = () => {
    // atoms
    const playState = useAtomValue(playStateAtom)
    const [playTime, setPlayTime] = useAtom(playTimeAtom)

    useEffect(() => {
        let intervalId

        if (playState === PlayState.PLAYING) {
            intervalId = setInterval(() => {
                setPlayTime(prev => prev + 1)
            }, 1000)
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId)
            }
        }
    }, [playState, setPlayTime])

    return (
        <div className={'not-a-button padding-x-sm'}>
            <span>{formatTime(playTime)}</span>
        </div >
    )
}

export default PlayTime 