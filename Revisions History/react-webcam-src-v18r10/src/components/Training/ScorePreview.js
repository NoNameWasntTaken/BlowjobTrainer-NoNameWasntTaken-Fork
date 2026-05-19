import { TaskType, Tempo, getTaskSummary } from '../Tasks/task'
import {
    calcPerfectHitScore, calcPassHitScore,
    calcPerfectHoldScore, calcPassHoldScore,
    calcPerfectDivingScore, calcPassDivingScore,
    calcPerfectClapScore, calcPassClapScore,
    calcPerfectHoldAndClapScore, calcPassHoldAndClapScore
} from './scores'


function getTaskScores(task) {
    switch (task.type) {
        case TaskType.HITDEPTH:
            return {
                perfect: calcPerfectHitScore(task),
                pass: calcPassHitScore(task)
            }
        case TaskType.HOLDPOSITION:
            return {
                perfect: calcPerfectHoldScore(task),
                pass: calcPassHoldScore(task)
            }
        case TaskType.UPANDDOWN:
            return {
                perfect: calcPerfectDivingScore(task),
                pass: calcPassDivingScore(task)
            }
        case TaskType.CLAP:
            return {
                perfect: calcPerfectClapScore(task),
                pass: calcPassClapScore(task)
            }
        case TaskType.HOLDANDCLAP:
            return {
                perfect: calcPerfectHoldAndClapScore(task),
                pass: calcPassHoldAndClapScore(task)
            }
        default:
            return { perfect: 0, pass: 0 }
    }
}

export function ScorePreview({ level }) {
    // Sample tasks for preview - all roughly 60s duration
    const sampleTasks = [
        // Hit depth tasks (5s per hit = 12 hits in 60s)
        { type: TaskType.HITDEPTH, targetDepth: 2, repeat: 12 },
        { type: TaskType.HITDEPTH, targetDepth: 3, repeat: 12 },
        { type: TaskType.HITDEPTH, targetDepth: 4, repeat: 12 },

        // Hold tasks (10s holds x 5 = 50s total)
        { type: TaskType.HOLDPOSITION, targetDepth: 1, time: 10, repeat: 5 },
        { type: TaskType.HOLDPOSITION, targetDepth: 2, time: 10, repeat: 5 },
        { type: TaskType.HOLDPOSITION, targetDepth: 3, time: 10, repeat: 5 },
        { type: TaskType.HOLDPOSITION, targetDepth: 4, time: 10, repeat: 5 },

        // Diving tasks at different depths and tempos (60s each)
        { type: TaskType.UPANDDOWN, minDepth: 1, maxDepth: 2, timeLimit: 60, tempo: Tempo.SLOW },
        { type: TaskType.UPANDDOWN, minDepth: 1, maxDepth: 2, timeLimit: 60, tempo: Tempo.MEDIUM },
        { type: TaskType.UPANDDOWN, minDepth: 1, maxDepth: 2, timeLimit: 60, tempo: Tempo.FAST },
        { type: TaskType.UPANDDOWN, minDepth: 1, maxDepth: 3, timeLimit: 60, tempo: Tempo.SLOW },
        { type: TaskType.UPANDDOWN, minDepth: 1, maxDepth: 3, timeLimit: 60, tempo: Tempo.MEDIUM },
        { type: TaskType.UPANDDOWN, minDepth: 1, maxDepth: 3, timeLimit: 60, tempo: Tempo.FAST },
        { type: TaskType.UPANDDOWN, minDepth: 1, maxDepth: 4, timeLimit: 60, tempo: Tempo.SLOW },
        { type: TaskType.UPANDDOWN, minDepth: 1, maxDepth: 4, timeLimit: 60, tempo: Tempo.MEDIUM },
        { type: TaskType.UPANDDOWN, minDepth: 1, maxDepth: 4, timeLimit: 60, tempo: Tempo.FAST },

        // Clap tasks (various durations)
        { type: TaskType.CLAP, repeat: 5, timeLimit: 15 },
        { type: TaskType.CLAP, repeat: 10, timeLimit: 30 },
        { type: TaskType.CLAP, repeat: 20, timeLimit: 60 },
    ]

    return (
        <pre>
            <h3>Score Preview for Level {level} (60s tasks)</h3>
            {sampleTasks.map((task, index) => {
                const scores = getTaskScores(task)
                return (
                    <div key={index}>
                        <b>{getTaskSummary(task)}</b>
                        <div style={{ paddingLeft: '20px' }}>
                            <div>Perfect Score: {scores.perfect}</div>
                            <div>Pass Score: {scores.pass}</div>
                        </div>
                    </div>
                )
            })}
        </pre>
    )
} 