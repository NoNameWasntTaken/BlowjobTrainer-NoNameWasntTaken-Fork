import { useState, useEffect } from 'react'
import { currentLevelAtom } from '../../atoms/taskAtom';
import { useAtomValue } from 'jotai';
import { TaskType } from '../Tasks/task';

function CountdownTimer({ onTimeElapsed }) {

    const currentLevel = useAtomValue(currentLevelAtom)
    const task = currentLevel?.currentTask

    let timerDuration = task?.timeLimit ?? 90
    if (task?.type === TaskType.HOLDANDCLAP && (!task.timeLimit || task.timeLimit === 0)) {
        timerDuration = 10 + (task.repeat || 3) * ((task.claps || 3) * 3 + 5)
    }

    // Reset timeLeft when task changes
    useEffect(() => {
        setTimeLeft(timerDuration)
    }, [timerDuration, task])

    const [timeLeft, setTimeLeft] = useState(timerDuration)


    useEffect(() => {
        if (timeLeft === 0) {
            onTimeElapsed()
            return
        }
        const interval = setInterval(() => {
            setTimeLeft(prevTime => prevTime - 1)
        }, 1000)

        return () => clearInterval(interval)
    }, [timeLeft, onTimeElapsed])

    if (task == null) return <p>No timer</p>
    const hasDuration = task.timeLimit > 0 || (task.type === TaskType.HOLDANDCLAP && timerDuration > 0)
    if (!hasDuration) return <p>No timer</p>

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 10
        }}>
            <pre>Countdown <b>{timeLeft}s</b></pre>
        </div>
    )
}

export default CountdownTimer
