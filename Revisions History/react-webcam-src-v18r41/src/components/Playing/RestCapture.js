import { useEffect } from 'react'
import { useTaskCountdownLeft } from '../../hooks/useTaskCountdownLeft'

/**
 * 1 Hz capture window signaling for plain Rest tasks (no balls bonus).
 */
export default function RestCapture({ task, isLastTask, onSignalCaptureWindow }) {
    const timeLeft = useTaskCountdownLeft(task)

    useEffect(() => {
        if (!onSignalCaptureWindow) return undefined
        const vidMin = isLastTask ? 6 : 3
        const id = setInterval(() => {
            if (task?.ballsBonus) return
            const windowOk = timeLeft > 0
            const vidOk = timeLeft >= vidMin
            onSignalCaptureWindow(windowOk, { photos: windowOk, videos: vidOk && windowOk })
        }, 1000)
        return () => clearInterval(id)
    }, [onSignalCaptureWindow, timeLeft, isLastTask, task?.ballsBonus])

    return null
}
