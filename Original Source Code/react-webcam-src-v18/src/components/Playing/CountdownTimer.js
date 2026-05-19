import { useState, useEffect } from 'react'
import { currentLevelAtom } from '../../atoms/taskAtom';
import { useAtomValue } from 'jotai';

function CountdownTimer({ onTimeElapsed }) {

    const currentLevel = useAtomValue(currentLevelAtom)
    const task = currentLevel?.currentTask

    // our time
    const timerDuration = task?.timeLimit ? task.timeLimit : 90

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

    // no task or timelimit
    if (task == null || task.timeLimit == null) {
        return <p>No timer</p>
    }

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
