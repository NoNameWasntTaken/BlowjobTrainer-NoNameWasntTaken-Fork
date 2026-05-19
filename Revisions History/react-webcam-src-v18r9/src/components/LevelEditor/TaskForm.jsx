import React from 'react'
import { TaskType, Tempo } from '../Tasks/task'
import AudioSelector from './AudioSelector'
import NumberControl from '../NumberControl'
import {
    getAudioOptionsForTaskType,
    getDefaultHoldAudio,
    getDefaultUpAndDownAudio,
    getDefaultHitAudio,
    getDefaultHoldAndClapAudio,
    RELEASE_AUDIO,
    EVENT_SOUND_OPTIONS,
} from './taskAudioConfig'
import { executableService } from '../../services/executableService'

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

        if (updatedTask.type === TaskType.HOLDANDCLAP) {
            const hasDepthChange = 'targetDepth' in updates
            const hasClapsChange = 'claps' in updates
            const hasRepeatChange = 'repeat' in updates

            if (hasDepthChange || hasClapsChange || hasRepeatChange || taskTypeChanged) {
                const repeat = updatedTask.repeat || 3
                const claps = updatedTask.claps || 3
                updatedTask.timeLimit = 10 + repeat * (claps * 3 + 5)
            }

            if ((hasDepthChange || taskTypeChanged) && !isReleaseAudio(updatedTask.audio)) {
                updatedTask.audio = getDefaultHoldAndClapAudio(updatedTask.targetDepth || 1)
            }
        }

        if (updatedTask.type === TaskType.ENDLESS && taskTypeChanged && !isReleaseAudio(updatedTask.audio)) {
            updatedTask.audio = 'Endless.ENDLESS'
        }

        onChange(updatedTask)
    }

    const isElectron = typeof window !== 'undefined' &&
        window.electronAPI &&
        typeof window.electronAPI.executeExternalProgram === 'function';

    const executableField = (
        <div style={{ width: '100%', marginTop: '8px' }}>
            <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                Executable Script (Optional)
            </div>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <input
                    type="text"
                    value={task.executablePath || ''}
                    onChange={(e) => updateTask({ executablePath: e.target.value })}
                    placeholder="Select or enter script path..."
                    style={{ flex: 1 }}
                />
                <button
                    type="button"
                    className="button"
                    disabled={!isElectron}
                    onClick={async () => {
                        const currentPath = taskRef.current.executablePath || '';
                        const selected = await executableService.pickExecutable(currentPath || 'scripts');
                        if (selected) {
                            updateTask({ executablePath: selected });
                        }
                    }}
                    title={!isElectron ? 'File picker only available in Electron (desktop) mode' : ''}
                >
                    Browse
                </button>
                <button
                    type="button"
                    className="button"
                    onClick={async () => {
                        const path = taskRef.current.executablePath;
                        if (!path) {
                            alert('Please select a script first');
                            return;
                        }
                        const result = await executableService.execute(path);
                        if (result.success) {
                            alert(`Script executed successfully! (PID: ${result.pid})`);
                        } else {
                            alert(`Failed: ${result.error}`);
                        }
                    }}
                    disabled={!task.executablePath || !isElectron}
                    title={!isElectron ? 'Script execution only available in Electron (desktop) mode' : ''}
                >
                    Test
                </button>
                <button
                    type="button"
                    className="button"
                    onClick={() => updateTask({ executablePath: undefined })}
                    disabled={!task.executablePath}
                >
                    Clear
                </button>
            </div>
            <small style={{ color: '#666', display: 'block', marginTop: '4px', textAlign: 'center' }}>
                {!isElectron
                    ? 'Script execution only available in Electron (desktop) mode. Manual path entry allowed but not functional.'
                    : 'Script runs automatically when this task starts during gameplay. Manual entry allowed, but using file picker is recommended.'}
            </small>
        </div>
    );

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

            case TaskType.HOLDANDCLAP:
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
                                    const currentAudio = taskRef.current.audio
                                    if (!isReleaseAudio(currentAudio)) {
                                        updateTask({
                                            targetDepth: validatedDepth,
                                            audio: getDefaultHoldAndClapAudio(validatedDepth)
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
                                label="Claps"
                                value={task.claps || 3}
                                setValue={(fn) => {
                                    const currentValue = taskRef.current.claps || 3
                                    const newValue = typeof fn === 'function' ? fn(currentValue) : fn
                                    updateTask({ claps: newValue })
                                }}
                                min={1}
                                step={1}
                            />
                        </div>
                        <div>
                            <NumberControl
                                label="Repeat"
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
                                value={task.timeLimit || 0}
                                setValue={(fn) => {
                                    const currentValue = taskRef.current.timeLimit || 0
                                    const newValue = typeof fn === 'function' ? fn(currentValue) : fn
                                    updateTask({ timeLimit: newValue > 0 ? newValue : undefined })
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
                        {executableField}
                        <div style={{ width: '100%', marginTop: '12px' }}>
                            <h5 style={{ marginBottom: '8px' }}>Score Events</h5>
                            {(task.scoreEvents || []).map((ev, idx) => (
                                <div key={idx} className="row flex-wrap" style={{ gap: '8px', alignItems: 'center', marginBottom: '8px', padding: '8px', backgroundColor: '#eee', borderRadius: '4px' }}>
                                    <NumberControl label="Min" value={ev.scoreMin ?? 0} setValue={(fn) => {
                                        const arr = [...(taskRef.current.scoreEvents || [])]
                                        arr[idx] = { ...arr[idx], scoreMin: typeof fn === 'function' ? fn(arr[idx]?.scoreMin ?? 0) : fn }
                                        updateTask({ scoreEvents: arr })
                                    }} min={0} step={1} />
                                    <NumberControl label="Max" value={ev.scoreMax ?? ev.scoreMin ?? 0} setValue={(fn) => {
                                        const arr = [...(taskRef.current.scoreEvents || [])]
                                        arr[idx] = { ...arr[idx], scoreMax: typeof fn === 'function' ? fn(arr[idx]?.scoreMax ?? arr[idx]?.scoreMin ?? 0) : fn }
                                        updateTask({ scoreEvents: arr })
                                    }} min={0} step={1} />
                                    <select
                                        value={ev.type || 'play_sound'}
                                        onChange={(e) => {
                                            const arr = [...(taskRef.current.scoreEvents || [])]
                                            arr[idx] = { ...arr[idx], type: e.target.value }
                                            updateTask({ scoreEvents: arr })
                                        }}
                                    >
                                        <option value="play_sound">Play Sound</option>
                                        <option value="run_script">Run Script</option>
                                        <option value="add_grace">Add Grace</option>
                                    </select>
                                    {(ev.type || 'play_sound') === 'play_sound' && (
                                        <select
                                            value={ev.soundKey || ''}
                                            onChange={(e) => {
                                                const arr = [...(taskRef.current.scoreEvents || [])]
                                                arr[idx] = { ...arr[idx], soundKey: e.target.value || undefined }
                                                updateTask({ scoreEvents: arr })
                                            }}
                                        >
                                            <option value="">Select sound...</option>
                                            {EVENT_SOUND_OPTIONS.map((o) => (
                                                <option key={o.value} value={o.value}>{o.label}</option>
                                            ))}
                                        </select>
                                    )}
                                    {(ev.type || 'play_sound') === 'run_script' && (
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                            <input type="text" value={ev.executablePath || ''} onChange={(e) => {
                                                const arr = [...(taskRef.current.scoreEvents || [])]
                                                arr[idx] = { ...arr[idx], executablePath: e.target.value || undefined }
                                                updateTask({ scoreEvents: arr })
                                            }} placeholder="Script path..." style={{ width: '120px' }} />
                                            <button type="button" className="button" disabled={!isElectron} onClick={async () => {
                                                const selected = await executableService.pickExecutable(ev.executablePath || 'scripts')
                                                if (selected) {
                                                    const arr = [...(taskRef.current.scoreEvents || [])]
                                                    arr[idx] = { ...arr[idx], executablePath: selected }
                                                    updateTask({ scoreEvents: arr })
                                                }
                                            }}>Browse</button>
                                        </div>
                                    )}
                                    {(ev.type || 'play_sound') === 'add_grace' && (
                                        <>
                                            <NumberControl label="Grace Min" value={ev.graceMin ?? 1} setValue={(fn) => {
                                                const arr = [...(taskRef.current.scoreEvents || [])]
                                                arr[idx] = { ...arr[idx], graceMin: typeof fn === 'function' ? fn(arr[idx]?.graceMin ?? 1) : fn }
                                                updateTask({ scoreEvents: arr })
                                            }} min={1} max={30} step={1} />
                                            <NumberControl label="Grace Max" value={ev.graceMax ?? ev.graceMin ?? 1} setValue={(fn) => {
                                                const arr = [...(taskRef.current.scoreEvents || [])]
                                                arr[idx] = { ...arr[idx], graceMax: typeof fn === 'function' ? fn(arr[idx]?.graceMax ?? arr[idx]?.graceMin ?? 1) : fn }
                                                updateTask({ scoreEvents: arr })
                                            }} min={1} max={30} step={1} />
                                        </>
                                    )}
                                    <button type="button" className="button-delete" onClick={() => {
                                        const arr = (taskRef.current.scoreEvents || []).filter((_, i) => i !== idx)
                                        updateTask({ scoreEvents: arr })
                                    }}>×</button>
                                </div>
                            ))}
                            <button type="button" className="button" onClick={() => {
                                const arr = [...(taskRef.current.scoreEvents || []), { scoreMin: 10, scoreMax: 20, type: 'play_sound' }]
                                updateTask({ scoreEvents: arr })
                            }}>Add Event</button>
                            <div style={{ marginTop: '8px' }}>
                                <label>
                                    <input type="checkbox" checked={!!task.repeatEvents} onChange={(e) => updateTask({ repeatEvents: e.target.checked })} />
                                    {' '}Repeat Events
                                </label>
                            </div>
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
                            <option value={TaskType.HOLDANDCLAP}>Hold and Clap</option>
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
            {task.type !== TaskType.ENDLESS && executableField}
        </div>
    )
}

export default TaskForm

