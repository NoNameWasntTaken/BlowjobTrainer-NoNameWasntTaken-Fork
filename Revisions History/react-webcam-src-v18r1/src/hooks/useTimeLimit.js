import { useState, useEffect } from 'react'

export function useTimeLimit(timeLimit, onTimeElapsed) {
    const [timeLeft, setTimeLeft] = useState(timeLimit || 999)

    useEffect(() => {
        const interval = setInterval(() => {
            setTimeLeft(prevTime => {
                if (prevTime <= 1) {
                    clearInterval(interval)
                    onTimeElapsed()
                    return 0
                }
                return prevTime - 1
            })
        }, 1000)

        return () => clearInterval(interval)
    }, [timeLimit]) // only reset when timeLimit changes

    return timeLeft
} 