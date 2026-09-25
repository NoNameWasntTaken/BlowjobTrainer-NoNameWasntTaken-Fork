import { useAtom } from 'jotai'
import { useEffect, useCallback } from 'react'
import { playStateAtom, timerAtom, PlayState } from '../atoms/taskAtom'
import { formatTime } from '../constants/helpers'

const timerStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 16px',
    borderRadius: '4px',
    backgroundColor: 'var(--surface-soft)',
    fontFamily: 'monospace',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: 'var(--ink)'
}

const Timer = () => {
    const [playState] = useAtom(playStateAtom)
    const [timer, setTimer] = useAtom(timerAtom)

    useEffect(() => {
        let intervalId

        if (playState === PlayState.PLAYING) {
            intervalId = setInterval(() => {
                setTimer(prev => prev + 1)
            }, 1000)
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId)
            }
        }
    }, [playState, setTimer])

    return (
        <div style={timerStyles}>
            <span>{formatTime(timer)}</span>
        </div>
    )
}

export default Timer 