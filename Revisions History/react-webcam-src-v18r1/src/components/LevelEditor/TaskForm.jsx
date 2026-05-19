import React from 'react'
import { TaskType, Tempo } from '../Tasks/task'
import AudioSelector from './AudioSelector'
import NumberControl from '../NumberControl'
import {
    getAudioOptionsForTaskType,
    getDefaultHoldAudio,
    getDefaultUpAndDownAudio,
    getDefaultHitAudio,
    RELEASE_AUDIO,
} from './taskAudioConfig'

/**
 * TaskForm - Form for editing task-specific properties
 * @param {object} task - The task object
 * @param {function} onChange - Callback when task changes
 * @param {function} onDelete - Callback when task is deleted
 * @param {string} audioPackId - Optional audio pack ID to use for this level
 */
const TaskForm = ({ task, onChange, onDelete, audioPackId = null }) => {
    // Use ref to track current task to avoid stale closures
    const taskRef = React.useRef(task)
    React.useEffect(() => {
        taskRef.current = task
    }, [task])

    // Helper function to calculate timeLimit for HOLDPOSITION tasks
    const calculateHoldTimeLimit = (targetDepth, time, repeat) => {
        return 10 + repeat * (time + 5)
    }

    // Helper function to check if audio is a release audio (should be preserved)
    const isReleaseAudio = (audioValue) => {
        if (!audioValue) return false
        return RELEASE_AUDIO.some(release => release.value === audioValue)
    }

    const updateTask = (updates) => {
        const updatedTask = { ...taskRef.current, ...updates }
        const taskTypeChanged = 'type' in updates && updates.type !== taskRef.current.type

        // Auto-calculate timeLimit for HOLDPOSITION when depth, time, or repeat changes
        if (updatedTask.type === TaskType.HOLDPOSITION) {
            const hasDepthChange = 'targetDepth' in updates
            const hasTimeChange = 'time' in updates
            const hasRepeatChange = 'repeat' in updates

            // If any of these changed and timeLimit is 0 or undefined, calculate it
            if ((hasDepthChange || hasTimeChange || hasRepeatChange)) {
                const targetDepth = updatedTask.targetDepth || 1
                const time = updatedTask.time || 10
                const repeat = updatedTask.repeat || 1
                updatedTask.timeLimit = calculateHoldTimeLimit(targetDepth, time, repeat)
            }

            // Auto-select audio based on targetDepth unless it's a release audio
            if ((hasDepthChange || taskTypeChanged) && !isReleaseAudio(updatedTask.audio)) {
                updatedTask.audio = getDefaultHoldAudio(updatedTask.targetDepth || 1)
            }
        }

        // Auto-select audio for UPANDDOWN tasks when depth or tempo changes
        if (updatedTask.type === TaskType.UPANDDOWN) {
            const hasDepthChange = 'minDepth' in updates || 'maxDepth' in updates
            const hasTempoChange = 'tempo' in updates

            // Auto-select audio if depth or tempo changed unless it's a release audio
            if ((hasDepthChange || hasTempoChange || taskTypeChanged) && !isReleaseAudio(updatedTask.audio)) {
                const minDepth = updatedTask.minDepth || 1
                const maxDepth = updatedTask.maxDepth || 2
                const tempo = updatedTask.tempo || Tempo.SLOW
                updatedTask.audio = getDefaultUpAndDownAudio(minDepth, maxDepth, tempo)
            }
        }

        // Auto-select audio for HITDEPTH tasks when targetDepth changes
        if (updatedTask.type === TaskType.HITDEPTH) {
            const hasDepthChange = 'targetDepth' in updates

            // Auto-select audio if depth changed unless it's a release audio
            if ((hasDepthChange || taskTypeChanged) && !isReleaseAudio(updatedTask.audio)) {
                updatedTask.audio = getDefaultHitAudio(updatedTask.targetDepth || 4)
            }
        }

        onChange(updatedTask)
    }

    const renderTaskFields = () => {
        switch (task.type) {
            case TaskType.GETREADY:
                return (
                    <>
                        <div>
                            <NumberControl
                                label="Time "
                                value={task.time || 15}
                                setValue={(fn) => {
                                    const currentValue = taskRef.current.time || 15
                                    const newValue = typeof fn === 'function' ? fn(currentValue) : fn
                                    updateTask({ time: newValue })
                                }}
                                min={0}
                                step={1}
                            />
                        </div>
                        <div>
                            <NumberControl
                                label="Time Limit "
                                value={task.timeLimit || 15}
                                setValue={(fn) => {
                                    const currentValue = taskRef.current.timeLimit || 15
                                    const newValue = typeof fn === 'function' ? fn(currentValue) : fn
                                    updateTask({ timeLimit: newValue })
                                }}
                                min={0}
                                step={1}
                            />
                        </div>
                        <div>
                            <div style={{ textAlign: 'center' }}>Description</div>
                            {/* <p className='margin-x-sm margin-y-sm'>Description:</p> */}
                            <input
                                type="text"
                                value={task.desc || 'get ready'}
                                onChange={(e) => updateTask({ desc: e.target.value })}
                            />
                        </div>
                    </>
                )

            case TaskType.HOLDPOSITION:
                return (
                    <>
                        <div>
                            <NumberControl
                                label="Target Depth (1-4)"
                                value={task.targetDepth || 1}
                                setValue={(fn) => {
                                    const currentValue = taskRef.current.targetDepth || 1
                                    const newValue = typeof fn === 'function' ? fn(currentValue) : fn
                                    const validatedDepth = Math.max(1, Math.min(4, newValue))
                                    // Auto-select audio unless it's a release audio
                                    const currentAudio = taskRef.current.audio
                                    if (!isReleaseAudio(currentAudio)) {
                                        updateTask({
                                            targetDepth: validatedDepth,
                                            audio: getDefaultHoldAudio(validatedDepth)
                                        })
                                    } else {
                                        updateTask({ targetDepth: validatedDepth })
                                    }
                                }}
                                min={1}
                                max={4}
                                step={1}
                            />
                        </div>
                        <div>
                            <NumberControl
                                label="Hold Time "
                                value={task.time || 10}
                                setValue={(fn) => {
                                    const currentValue = taskRef.current.time || 10
                                    const newValue = typeof fn === 'function' ? fn(currentValue) : fn
                                    updateTask({ time: newValue })
                                }}
                                min={0}
                                step={1}
                            />
                        </div>
                        <div>
                            <NumberControl
                                label="Repeat"
                                value={task.repeat || 1}
                                setValue={(fn) => {
                                    const currentValue = taskRef.current.repeat || 1
                                    const newValue = typeof fn === 'function' ? fn(currentValue) : fn
                                    updateTask({ repeat: newValue })
                                }}
                                min={1}
                                step={1}
                            />
                        </div>
                        <div>
                            <NumberControl
                                label="Time Limit "
                                value={task.timeLimit || 0}
                                setValue={(fn) => {
                                    const currentValue = taskRef.current.timeLimit || 0
                                    const newValue = typeof fn === 'function' ? fn(currentValue) : fn
                                    updateTask({ timeLimit: newValue > 0 ? newValue : undefined })
                                }}
                                min={0}
                                step={1}
                            />
                            {/* <small style={{ color: '#666', display: 'block', marginTop: '4px', textAlign: 'center' }}>Leave at 0 for Auto</small> */}
                        </div>
                    </>
                )

            case TaskType.UPANDDOWN:
                return (
                    <>
                        <div>
                            <NumberControl
                                label="Min Depth (1-3)"
                                value={task.minDepth || 1}
                                setValue={(fn) => {
                                    const currentValue = taskRef.current.minDepth || 1
                                    const newValue = typeof fn === 'function' ? fn(currentValue) : fn
                                    // Ensure min is never 0 or 4, and is between 1-3
                                    const validatedMin = Math.max(1, Math.min(3, newValue === 0 ? 1 : newValue === 4 ? 3 : newValue))
                                    const currentMax = taskRef.current.maxDepth || 2
                                    // Ensure max is at least 1 more than min
                                    const validatedMax = Math.max(validatedMin + 1, currentMax)
                                    const finalMax = validatedMax > 4 ? 4 : validatedMax
                                    const currentTempo = taskRef.current.tempo || Tempo.SLOW
                                    // Auto-select audio unless it's a release audio
                                    const currentAudio = taskRef.current.audio
                                    if (!isReleaseAudio(currentAudio)) {
                                        updateTask({
                                            minDepth: validatedMin,
                                            maxDepth: finalMax,
                                            audio: getDefaultUpAndDownAudio(validatedMin, finalMax, currentTempo)
                                        })
                                    } else {
                                        updateTask({
                                            minDepth: validatedMin,
                                            maxDepth: finalMax
                                        })
                                    }
                                }}
                                min={1}
                                max={3}
                                step={1}
                            />
                        </div>
                        <div>
                            <NumberControl
                                label="Max Depth (1-4)"
                                value={task.maxDepth || 2}
                                setValue={(fn) => {
                                    const currentValue = taskRef.current.maxDepth || 2
                                    const newValue = typeof fn === 'function' ? fn(currentValue) : fn
                                    const currentMin = taskRef.current.minDepth || 1
                                    // Ensure max is at least 1 more than min, and never less than 2
                                    const validatedMax = Math.max(currentMin + 1, Math.min(4, newValue))
                                    const currentTempo = taskRef.current.tempo || Tempo.SLOW
                                    // Auto-select audio unless it's a release audio
                                    const currentAudio = taskRef.current.audio
                                    if (!isReleaseAudio(currentAudio)) {
                                        updateTask({
                                            maxDepth: validatedMax,
                                            audio: getDefaultUpAndDownAudio(currentMin, validatedMax, currentTempo)
                                        })
                                    } else {
                                        updateTask({ maxDepth: validatedMax })
                                    }
                                }}
                                min={2}
                                max={4}
                                step={1}
                            />
                        </div>
                        <div>
                            <label>Tempo:</label>
                            <select
                                value={task.tempo || Tempo.SLOW}
                                onChange={(e) => {
                                    const newTempo = parseInt(e.target.value)
                                    const currentMin = taskRef.current.minDepth || 1
                                    const currentMax = taskRef.current.maxDepth || 2
                                    // Auto-select audio unless it's a release audio
                                    const currentAudio = taskRef.current.audio
                                    if (!isReleaseAudio(currentAudio)) {
                                        updateTask({
                                            tempo: newTempo,
                                            audio: getDefaultUpAndDownAudio(currentMin, currentMax, newTempo)
                                        })
                                    } else {
                                        updateTask({ tempo: newTempo })
                                    }
                                }}
                            >
                                <option value={Tempo.SLOW}>Slow (30 BPM)</option>
                                <option value={Tempo.MEDIUM}>Medium (60 BPM)</option>
                                <option value={Tempo.FAST}>Fast (90 BPM)</option>
                            </select>
                        </div>
                        <div>
                            <NumberControl
                                label="Time Limit "
                                value={task.timeLimit || 30}
                                setValue={(fn) => {
                                    const currentValue = taskRef.current.timeLimit || 30
                                    const newValue = typeof fn === 'function' ? fn(currentValue) : fn
                                    updateTask({ timeLimit: newValue })
                                }}
                                min={0}
                                step={1}
                            />
                        </div>
                    </>
                )

            case TaskType.HITDEPTH:
                return (
                    <>
                        <div>
                            <NumberControl
                                label="Target Depth (1-4)"
                                value={task.targetDepth || 4}
                                setValue={(fn) => {
                                    const currentValue = taskRef.current.targetDepth || 4
                                    const newValue = typeof fn === 'function' ? fn(currentValue) : fn
                                    const validatedDepth = Math.max(1, Math.min(4, newValue))
                                    // Auto-select audio unless it's a release audio
                                    const currentAudio = taskRef.current.audio
                                    if (!isReleaseAudio(currentAudio)) {
                                        updateTask({
                                            targetDepth: validatedDepth,
                                            audio: getDefaultHitAudio(validatedDepth)
                                        })
                                    } else {
                                        updateTask({ targetDepth: validatedDepth })
                                    }
                                }}
                                min={1}
                                max={4}
                                step={1}
                            />
                        </div>
                        <div>
                            <NumberControl
                                label="Repeat"
                                value={task.repeat || 1}
                                setValue={(fn) => {
                                    const currentValue = taskRef.current.repeat || 1
                                    const newValue = typeof fn === 'function' ? fn(currentValue) : fn
                                    updateTask({ repeat: newValue })
                                }}
                                min={1}
                                step={1}
                            />
                        </div>
                        <div>
                            <NumberControl
                                label="Time Limit "
                                value={task.timeLimit || 0}
                                setValue={(fn) => {
                                    const currentValue = taskRef.current.timeLimit || 0
                                    const newValue = typeof fn === 'function' ? fn(currentValue) : fn
                                    updateTask({ timeLimit: newValue > 0 ? newValue : undefined })
                                }}
                                min={0}
                                step={1}
                            />
                            <small style={{ color: '#666', display: 'block', marginTop: '4px', textAlign: 'center' }}>Leave at 0 for Auto</small>
                        </div>
                    </>
                )

            case TaskType.CLAP:
                return (
                    <>
                        <div>
                            <NumberControl
                                label="Repeat (number of claps)"
                                value={task.repeat || 3}
                                setValue={(fn) => {
                                    const currentValue = taskRef.current.repeat || 3
                                    const newValue = typeof fn === 'function' ? fn(currentValue) : fn
                                    updateTask({ repeat: newValue })
                                }}
                                min={1}
                                step={1}
                            />
                        </div>
                        <div>
                            <NumberControl
                                label="Time Limit "
                                value={task.timeLimit || 30}
                                setValue={(fn) => {
                                    const currentValue = taskRef.current.timeLimit || 30
                                    const newValue = typeof fn === 'function' ? fn(currentValue) : fn
                                    updateTask({ timeLimit: newValue })
                                }}
                                min={0}
                                step={1}
                            />
                        </div>
                    </>
                )

            case TaskType.REST:
            case TaskType.REST_BALL:
                return (
                    <>
                        <div>
                            <NumberControl
                                label="Time Limit "
                                value={task.timeLimit || 10}
                                setValue={(fn) => {
                                    const currentValue = taskRef.current.timeLimit || 10
                                    const newValue = typeof fn === 'function' ? fn(currentValue) : fn
                                    updateTask({ timeLimit: newValue })
                                }}
                                min={0}
                                step={1}
                            />
                        </div>
                    </>
                )

            case TaskType.FINISH:
                return (
                    <>
                        <div>
                            <NumberControl
                                label="Time "
                                value={task.time || 15}
                                setValue={(fn) => {
                                    const currentValue = taskRef.current.time || 15
                                    const newValue = typeof fn === 'function' ? fn(currentValue) : fn
                                    updateTask({ time: newValue })
                                }}
                                min={0}
                                step={1}
                            />
                        </div>
                        <div>
                            <NumberControl
                                label="Time Limit "
                                value={task.timeLimit || 15}
                                setValue={(fn) => {
                                    const currentValue = taskRef.current.timeLimit || 15
                                    const newValue = typeof fn === 'function' ? fn(currentValue) : fn
                                    updateTask({ timeLimit: newValue })
                                }}
                                min={0}
                                step={1}
                            />
                        </div>
                    </>
                )

            case TaskType.ENDLESS:
                return (
                    <>
                        <div>
                            <NumberControl
                                label="Time Limit "
                                value={task.timeLimit || 999}
                                setValue={(fn) => {
                                    const currentValue = taskRef.current.timeLimit || 999
                                    const newValue = typeof fn === 'function' ? fn(currentValue) : fn
                                    updateTask({ timeLimit: newValue })
                                }}
                                min={0}
                                step={1}
                            />
                        </div>
                    </>
                )

            default:
                return <div>No specific fields for this task type</div>
        }
    }

    return (
        <div className="border-grey padding-x-sm padding-y-sm margin-y" style={{ backgroundColor: '#f9f9f9' }}>
            <div className="row-space-between">
                <div className="row flex-wrap" style={{ gap: '8px', alignItems: 'center' }}>
                    <div>
                        <select
                            value={task.type}
                            onChange={(e) => updateTask({ type: e.target.value })}
                        >
                            <option value={TaskType.GETREADY}>Get Ready</option>
                            <option value={TaskType.HOLDPOSITION}>Hold Position</option>
                            <option value={TaskType.UPANDDOWN}>Up and Down</option>
                            <option value={TaskType.HITDEPTH}>Hit Depth</option>
                            <option value={TaskType.CLAP}>Clap</option>
                            <option value={TaskType.REST}>Rest</option>
                            <option value={TaskType.REST_BALL}>Rest Ball</option>
                            <option value={TaskType.FINISH}>Finish</option>
                            <option value={TaskType.ENDLESS}>Endless</option>
                        </select>
                    </div>
                    <AudioSelector
                        value={task.audio || null}
                        onChange={(audio) => updateTask({ audio })}
                        allowedOptions={getAudioOptionsForTaskType(task.type)}
                        audioPackId={audioPackId}
                    />
                </div>
                <button
                    className="button-delete"
                    onClick={onDelete}
                    type="button"
                >
                    ×
                </button>
            </div>
            <div className="row flex-wrap margin-y-sm" style={{ gap: '8px' }}>
                {renderTaskFields()}
            </div>
        </div>
    )
}

export default TaskForm

