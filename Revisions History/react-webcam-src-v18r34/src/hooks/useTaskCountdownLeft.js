import { useState, useEffect, useMemo } from 'react'
import {
    TaskType,
    calculateHitDepthTimeLimit,
    calculateClapTimeLimit,
    calculateSpeakTimeLimit,
} from '../components/Tasks/task'

/** Mirrors `CountdownTimer` duration so task components share the same remaining-time basis. */
export function getTaskTimerDuration(task) {
    if (!task) return 0
    let timerDuration = task.timeLimit ?? 90
    if (task.type === TaskType.HOLDANDCLAP && (!task.timeLimit || task.timeLimit === 0)) {
        timerDuration = 10 + (task.repeat || 3) * ((task.claps || 3) * 3 + 5)
    }
    if (task.type === TaskType.HITDEPTH && (!task.timeLimit || task.timeLimit === 0)) {
        timerDuration = calculateHitDepthTimeLimit(task.repeat)
    }
    if (task.type === TaskType.CLAP && (!task.timeLimit || task.timeLimit === 0)) {
        timerDuration = calculateClapTimeLimit(task.repeat)
    }
    if (task.type === TaskType.SPEAK && (!task.timeLimit || task.timeLimit === 0)) {
        timerDuration = calculateSpeakTimeLimit(task.repeat)
    }
    return timerDuration
}

export function useTaskCountdownLeft(task) {
    const timerDuration = useMemo(() => getTaskTimerDuration(task), [task])
    const [timeLeft, setTimeLeft] = useState(timerDuration)

    useEffect(() => {
        setTimeLeft(timerDuration)
    }, [timerDuration, task?.id])

    useEffect(() => {
        if (timeLeft === 0) return undefined
        const interval = setInterval(() => {
            setTimeLeft((prev) => Math.max(0, prev - 1))
        }, 1000)
        return () => clearInterval(interval)
    }, [timeLeft, task?.id])

    return timeLeft
}
