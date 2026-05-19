import React from 'react'
import { TaskType, calculateHitDepthTimeLimit, calculateClapTimeLimit, calculateSpeakTimeLimit, SpeakMode } from '../Tasks/task'
import TaskForm from './TaskForm'
import { getRandomInt } from '../randomInt'
import {
    getDefaultHoldAudioHalfway,
    getDefaultHoldAudioThreeQuarter,
} from './taskAudioConfig'

/**
 * TaskBuilder - Component for building and managing task list
 * @param {Array} tasks - Array of task objects
 * @param {function} onChange - Callback when tasks change
 * @param {string} audioPackId - Optional audio pack ID to use for this level
 */
const TaskBuilder = ({ tasks, onChange, audioPackId = null }) => {
    const addTask = (taskType) => {
        const newTask = {
            id: getRandomInt(),
            type: taskType,
            suppressFeedback: false,
            showCustomVoiceLines: false,
            // Set defaults based on task type
            ...(taskType === TaskType.GETREADY && { timeLimit: 15, desc: 'get ready' }),
            ...(taskType === TaskType.HOLDPOSITION && {
                targetDepth: 1,
                time: 10,
                repeat: 1,
                timeLimit: 0,
                audioHalfway: getDefaultHoldAudioHalfway(1),
                audioThreeQuarter: getDefaultHoldAudioThreeQuarter(1),
            }),
            ...(taskType === TaskType.UPANDDOWN && { minDepth: 1, maxDepth: 2, tempo: 30, timeLimit: 30 }),
            ...(taskType === TaskType.HITDEPTH && { targetDepth: 4, repeat: 1, timeLimit: calculateHitDepthTimeLimit(1) }),
            ...(taskType === TaskType.CLAP && { repeat: 3, timeLimit: calculateClapTimeLimit(3) }),
            ...(taskType === TaskType.SPEAK && {
                phrase: 'ready',
                repeat: 1,
                speakMode: SpeakMode.SHORT,
                timeLimit: calculateSpeakTimeLimit(1),
                audio: 'Speak.Speak1',
                helpText: 'Say "ready"',
            }),
            ...(taskType === TaskType.HOLDANDCLAP && { targetDepth: 1, claps: 3, repeat: 3, timeLimit: 0 }),
            ...(taskType === TaskType.REST && { timeLimit: 10, ballsBonus: false }),
            ...(taskType === TaskType.FINISH && { timeLimit: 15 }),
            ...(taskType === TaskType.ENDLESS && { timeLimit: 999, scoreEvents: [], repeatEvents: false, audio: 'Endless.ENDLESS' })
        }
        onChange([...tasks, newTask])
    }

    const updateTask = (index, updatedTask) => {
        const newTasks = [...tasks]
        newTasks[index] = updatedTask
        onChange(newTasks)
    }

    const deleteTask = (index) => {
        const newTasks = tasks.filter((_, i) => i !== index)
        onChange(newTasks)
    }

    const moveTask = (index, direction) => {
        if (direction === 'up' && index > 0) {
            const newTasks = [...tasks]
            const temp = newTasks[index - 1]
            newTasks[index - 1] = newTasks[index]
            newTasks[index] = temp
            onChange(newTasks)
        } else if (direction === 'down' && index < tasks.length - 1) {
            const newTasks = [...tasks]
            const temp = newTasks[index]
            newTasks[index] = newTasks[index + 1]
            newTasks[index + 1] = temp
            onChange(newTasks)
        }
    }

    const addTaskBar = (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => addTask(TaskType.GETREADY)} style={{ padding: '6px 12px' }}>
                + Get Ready
            </button>
            <button type="button" onClick={() => addTask(TaskType.HOLDPOSITION)} style={{ padding: '6px 12px' }}>
                + Hold
            </button>
            <button type="button" onClick={() => addTask(TaskType.UPANDDOWN)} style={{ padding: '6px 12px' }}>
                + Up/Down
            </button>
            <button type="button" onClick={() => addTask(TaskType.HITDEPTH)} style={{ padding: '6px 12px' }}>
                + Hit Depth
            </button>
            <button type="button" onClick={() => addTask(TaskType.CLAP)} style={{ padding: '6px 12px' }}>
                + Clap
            </button>
            <button type="button" onClick={() => addTask(TaskType.SPEAK)} style={{ padding: '6px 12px' }}>
                + Speak
            </button>
            <button type="button" onClick={() => addTask(TaskType.HOLDANDCLAP)} style={{ padding: '6px 12px' }}>
                + Hold and Clap
            </button>
            <button type="button" onClick={() => addTask(TaskType.REST)} style={{ padding: '6px 12px' }}>
                + Rest
            </button>
            <button type="button" onClick={() => addTask(TaskType.FINISH)} style={{ padding: '6px 12px' }}>
                + Finish
            </button>
            <button type="button" onClick={() => addTask(TaskType.ENDLESS)} style={{ padding: '6px 12px' }}>
                + Endless
            </button>
        </div>
    )

    return (
        <div>
            <div style={{ marginBottom: '16px' }}>
                <h4>Tasks</h4>
                {addTaskBar}
            </div>

            <div>
                {tasks.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                        No tasks yet. Add a task to get started.
                    </div>
                ) : (
                    tasks.map((task, index) => (
                        <div key={task.id || index} style={{ position: 'relative' }}>
                            <div style={{
                                position: 'absolute',
                                left: '-30px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px'
                            }}>
                                <button
                                    type="button"
                                    onClick={() => moveTask(index, 'up')}
                                    disabled={index === 0}
                                    style={{
                                        padding: '2px 6px',
                                        fontSize: '12px',
                                        opacity: index === 0 ? 0.3 : 1
                                    }}
                                >
                                    ↑
                                </button>
                                <button
                                    type="button"
                                    onClick={() => moveTask(index, 'down')}
                                    disabled={index === tasks.length - 1}
                                    style={{
                                        padding: '2px 6px',
                                        fontSize: '12px',
                                        opacity: index === tasks.length - 1 ? 0.3 : 1
                                    }}
                                >
                                    ↓
                                </button>
                            </div>
                            <TaskForm
                                task={task}
                                taskNumber={index + 1}
                                onChange={(updatedTask) => updateTask(index, updatedTask)}
                                onDelete={() => deleteTask(index)}
                                audioPackId={audioPackId}
                            />
                        </div>
                    ))
                )}
            </div>

            {tasks.length > 0 && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #ddd' }}>
                    <h4>Tasks</h4>
                    {addTaskBar}
                </div>
            )}
        </div>
    )
}

export default TaskBuilder

