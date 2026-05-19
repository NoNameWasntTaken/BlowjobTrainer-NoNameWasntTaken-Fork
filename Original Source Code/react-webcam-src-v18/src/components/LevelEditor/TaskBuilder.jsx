import React from 'react'
import { TaskType } from '../Tasks/task'
import TaskForm from './TaskForm'
import { getRandomInt } from '../randomInt'

/**
 * TaskBuilder - Component for building and managing task list
 */
const TaskBuilder = ({ tasks, onChange }) => {
    const addTask = (taskType) => {
        const newTask = {
            id: getRandomInt(),
            type: taskType,
            // Set defaults based on task type
            ...(taskType === TaskType.GETREADY && { time: 15, timeLimit: 15, desc: 'get ready' }),
            ...(taskType === TaskType.HOLDPOSITION && { targetDepth: 1, time: 10, repeat: 1, timeLimit: 0 }),
            ...(taskType === TaskType.UPANDDOWN && { minDepth: 1, maxDepth: 2, tempo: 30, timeLimit: 30 }),
            ...(taskType === TaskType.HITDEPTH && { targetDepth: 4, repeat: 1 }),
            ...(taskType === TaskType.CLAP && { repeat: 3, timeLimit: 30 }),
            ...(taskType === TaskType.REST && { timeLimit: 10 }),
            ...(taskType === TaskType.REST_BALL && { timeLimit: 10 }),
            ...(taskType === TaskType.FINISH && { time: 15, timeLimit: 15 }),
            ...(taskType === TaskType.ENDLESS && { timeLimit: 999 })
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
            [newTasks[index - 1], newTasks[index]] = [newTasks[index], newTasks[index - 1]]
            onChange(newTasks)
        } else if (direction === 'down' && index < tasks.length - 1) {
            const newTasks = [...tasks]
            [newTasks[index], newTasks[index + 1]] = [newTasks[index + 1], newTasks[index]]
            onChange(newTasks)
        }
    }

    return (
        <div>
            <div style={{ marginBottom: '16px' }}>
                <h4>Tasks</h4>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
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
                    <button type="button" onClick={() => addTask(TaskType.REST)} style={{ padding: '6px 12px' }}>
                        + Rest
                    </button>
                    <button type="button" onClick={() => addTask(TaskType.FINISH)} style={{ padding: '6px 12px' }}>
                        + Finish
                    </button>
                </div>
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
                                onChange={(updatedTask) => updateTask(index, updatedTask)}
                                onDelete={() => deleteTask(index)}
                            />
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

export default TaskBuilder

