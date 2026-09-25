import React from 'react'
import { TaskType, Tempo, calculateHitDepthTimeLimit, calculateClapTimeLimit, calculateSpeakTimeLimit, SpeakMode } from '../Tasks/task'
import AudioSelector from './AudioSelector'
import NumberControl from '../NumberControl'
import {
    getAudioOptionsForTaskType,
    getCustomAudioOptions,
    getDefaultHoldAudioHalfway,
    getDefaultHoldAudioThreeQuarter,
    getDefaultTaskAudio,
    getVoiceLineOptions,
    voiceCategoryForSlot,
    withSavedVoiceOption,
    EVENT_SOUND_OPTIONS,
} from './taskAudioConfig'
import { executableService } from '../../services/executableService'
function captureSupportForTaskType(type) {
    const photos = [
        TaskType.HOLDPOSITION,
        TaskType.HITDEPTH,
        TaskType.UPANDDOWN,
        TaskType.REST,
        TaskType.FINISH,
        TaskType.HOLDANDCLAP,
        TaskType.ENDLESS,
    ].includes(type)
    const videos = [
        TaskType.UPANDDOWN,
        TaskType.HITDEPTH,
        TaskType.HOLDPOSITION,
        TaskType.REST,
        TaskType.FINISH,
        TaskType.HOLDANDCLAP,
        TaskType.ENDLESS,
    ].includes(type)
    return { photos, videos, any: photos || videos }
}

const HOLD_VOICE_MAIN = 'main'
const HOLD_VOICE_HALF = 'halfway'
const HOLD_VOICE_3Q = '3q'

/** Vibe Δ fields: keep stored and displayed values at two decimal places. */
function roundVibrationDeltaField(n) {
    if (typeof n !== 'number' || !Number.isFinite(n)) return 0
    return Math.round(n * 100) / 100
}

/** Endless score events: shared width for sound / optional voice line selects */
const ENDLESS_SCORE_EVENT_VOICE_SELECT_STYLE = {
    flex: '1 1 12rem',
    minWidth: '12rem',
    maxWidth: 'min(44rem, 100%)',
    boxSizing: 'border-box',
}

const ENDLESS_SCORE_EVENT_OPTIONAL_VOICE_COLUMN_STYLE = {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    flex: '1 1 12rem',
    minWidth: 0,
    maxWidth: 'min(44rem, 100%)',
}

const ENDLESS_SCORE_EVENT_PLAY_SOUND_ROW_STYLE = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    alignItems: 'center',
    flex: '1 1 12rem',
    minWidth: 0,
    maxWidth: 'min(44rem, 100%)',
}

const ENDLESS_SCORE_EVENT_OPTIONAL_VOICE_INNER_ROW_STYLE = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    alignItems: 'center',
    width: '100%',
}

/**
 * TaskForm - Form for editing task-specific properties
 * @param {object} task - The task object
 * @param {number} taskNumber - 1-based index for display (e.g. "Task 1")
 * @param {function} onChange - Callback when task changes
 * @param {function} onDelete - Callback when task is deleted
 * @param {string} audioPackId - Optional voice pack ID to use for this level
 * @param {boolean} fixed - When true, the task type and delete action are locked
 */
const TaskForm = ({ task, taskNumber, onChange, onDelete, audioPackId = null, fixed = false }) => {
    // Use ref to track current task to avoid stale closures
    const taskRef = React.useRef(task)
    React.useEffect(() => {
        taskRef.current = task
    }, [task])

    /** Which hold voice line the audio dropdown edits (custom hold tasks only) */
    const [holdVoiceSlot, setHoldVoiceSlot] = React.useState(HOLD_VOICE_MAIN)

    /** Collapsed advanced row: fast transition, script, and capture. */
    const [advancedOpen, setAdvancedOpen] = React.useState(false)
    const captureSupport = captureSupportForTaskType(task.type)
    React.useEffect(() => {
        setAdvancedOpen(false)
    }, [task.id])
    React.useEffect(() => {
        if (task.type === TaskType.HOLDPOSITION) {
            setHoldVoiceSlot(HOLD_VOICE_MAIN)
        }
    }, [task.id, task.type])

    const activeVoiceSlot = task.type === TaskType.HOLDPOSITION ? holdVoiceSlot : HOLD_VOICE_MAIN
    const activeVoiceCategory = voiceCategoryForSlot(task, activeVoiceSlot)
    const activeVoiceCue = activeVoiceSlot === HOLD_VOICE_HALF
        ? (task.audioHalfway || null)
        : activeVoiceSlot === HOLD_VOICE_3Q
            ? (task.audioThreeQuarter || null)
            : (task.audio || null)
    const voiceLineOptions = React.useMemo(() => {
        const base = getVoiceLineOptions(task.type, activeVoiceCategory, audioPackId, activeVoiceSlot)
        return withSavedVoiceOption(base, activeVoiceCue)
    }, [task.type, activeVoiceCategory, activeVoiceSlot, activeVoiceCue, audioPackId])

    // Helper function to calculate timeLimit for HOLDPOSITION tasks
    const calculateHoldTimeLimit = (targetDepth, time, repeat) => {
        return 10 + repeat * (time + 5)
    }

    const applyVoiceCategory = (nextCategory) => {
        const current = taskRef.current
        const slot = current.type === TaskType.HOLDPOSITION ? holdVoiceSlot : HOLD_VOICE_MAIN
        if (slot !== HOLD_VOICE_MAIN && nextCategory === 'release') return
        const options = getVoiceLineOptions(current.type, nextCategory, audioPackId, slot)
        const firstCue = options[0]?.value ?? null
        if (slot === HOLD_VOICE_HALF) {
            updateTask({
                audioHalfwayMode: nextCategory,
                audioHalfway: nextCategory === 'standard'
                    ? getDefaultHoldAudioHalfway(current.targetDepth || 1)
                    : firstCue,
            })
            return
        }
        if (slot === HOLD_VOICE_3Q) {
            updateTask({
                audioThreeQuarterMode: nextCategory,
                audioThreeQuarter: nextCategory === 'standard'
                    ? getDefaultHoldAudioThreeQuarter(current.targetDepth || 1)
                    : firstCue,
            })
            return
        }
        updateTask({
            audioMode: nextCategory,
            audio: nextCategory === 'standard' ? getDefaultTaskAudio(current) : firstCue,
        })
    }

    const updateTask = (updates) => {
        const updatedTask = { ...taskRef.current, ...updates }
        const taskTypeChanged = 'type' in updates && updates.type !== taskRef.current.type
        const userPickedMain = Object.prototype.hasOwnProperty.call(updates, 'audio') && !taskTypeChanged
        const userPickedHalf = Object.prototype.hasOwnProperty.call(updates, 'audioHalfway') && !taskTypeChanged
        const userPicked3q = Object.prototype.hasOwnProperty.call(updates, 'audioThreeQuarter') && !taskTypeChanged

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
        }

        // Auto-calculate timeLimit for HITDEPTH when repeat changes
        if (updatedTask.type === TaskType.HITDEPTH) {
            const hasRepeatChange = 'repeat' in updates
            if (hasRepeatChange || taskTypeChanged) {
                updatedTask.timeLimit = calculateHitDepthTimeLimit(updatedTask.repeat)
            }
        }

        // Auto-calculate timeLimit for CLAP when repeat changes
        if (updatedTask.type === TaskType.CLAP) {
            const hasRepeatChange = 'repeat' in updates
            if (hasRepeatChange || taskTypeChanged) {
                updatedTask.timeLimit = calculateClapTimeLimit(updatedTask.repeat)
            }
        }

        if (updatedTask.type === TaskType.SPEAK) {
            const hasRepeatChange = 'repeat' in updates
            if (hasRepeatChange || taskTypeChanged) {
                updatedTask.timeLimit = calculateSpeakTimeLimit(updatedTask.repeat)
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
        }

        const refreshMain = !userPickedMain
            && voiceCategoryForSlot(updatedTask, HOLD_VOICE_MAIN) === 'standard'
            && (
                taskTypeChanged
                || (updatedTask.type === TaskType.HOLDPOSITION && 'targetDepth' in updates)
                || (updatedTask.type === TaskType.UPANDDOWN && (
                    'minDepth' in updates || 'maxDepth' in updates || 'tempo' in updates
                ))
                || (updatedTask.type === TaskType.HITDEPTH && 'targetDepth' in updates)
                || (updatedTask.type === TaskType.HOLDANDCLAP && 'targetDepth' in updates)
            )
        if (refreshMain) {
            updatedTask.audio = getDefaultTaskAudio(updatedTask)
        }

        if (updatedTask.type === TaskType.HOLDPOSITION && (taskTypeChanged || 'targetDepth' in updates)) {
            const depth = updatedTask.targetDepth || 1
            if (!userPickedHalf && voiceCategoryForSlot(updatedTask, HOLD_VOICE_HALF) === 'standard') {
                updatedTask.audioHalfway = getDefaultHoldAudioHalfway(depth)
            }
            if (!userPicked3q && voiceCategoryForSlot(updatedTask, HOLD_VOICE_3Q) === 'standard') {
                updatedTask.audioThreeQuarter = getDefaultHoldAudioThreeQuarter(depth)
            }
        }

        onChange(updatedTask)
    }

    const moveScoreEvent = (idx, direction) => {
        const arr = [...(taskRef.current.scoreEvents || [])]
        if (direction === 'up' && idx > 0) {
            const newArr = [...arr]
            ;[newArr[idx - 1], newArr[idx]] = [newArr[idx], newArr[idx - 1]]
            updateTask({ scoreEvents: newArr })
        } else if (direction === 'down' && idx < arr.length - 1) {
            const newArr = [...arr]
            ;[newArr[idx], newArr[idx + 1]] = [newArr[idx + 1], newArr[idx]]
            updateTask({ scoreEvents: newArr })
        }
    }

    const isElectron = typeof window !== 'undefined' &&
        window.electronAPI &&
        typeof window.electronAPI.executeExternalProgram === 'function';

    const scriptName = (task.executablePath || '').split(/[/\\]/).pop()
    const captureActive = captureSupport.any && (
        !!task.allowPhotos ||
        !!task.allowVideos ||
        (task.captureNotificationVisibilityBias ?? 100) !== 100
    )
    const advancedSummary = [
        task.suppressFeedback ? 'Fast transition' : null,
        scriptName || null,
        captureActive ? 'Capture' : null,
    ].filter(Boolean).join(' · ')

    const advancedSection = (
        <div className="task-advanced">
            <button
                type="button"
                className="task-advanced-toggle"
                aria-expanded={advancedOpen}
                onClick={() => setAdvancedOpen((open) => !open)}
            >
                <span className="task-advanced-marker" aria-hidden="true">{advancedOpen ? '▼' : '▶'}</span>
                <span>Advanced</span>
                {advancedSummary ? (
                    <span className="task-advanced-summary">{advancedSummary}</span>
                ) : null}
            </button>
            {advancedOpen && (
                <div className="task-advanced-body">
                    <label className="task-advanced-check">
                        <input
                            type="checkbox"
                            checked={!!task.suppressFeedback}
                            onChange={(e) => updateTask({ suppressFeedback: e.target.checked })}
                        />
                        Skip feedback (fast transition)
                    </label>
                    <div className="task-script-row">
                        <input
                            type="text"
                            value={task.executablePath || ''}
                            onChange={(e) => updateTask({ executablePath: e.target.value })}
                            placeholder="Select or enter script path..."
                            title="Script runs automatically when this task starts during gameplay."
                        />
                        <button
                            type="button"
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
                            onClick={() => updateTask({ executablePath: undefined })}
                            disabled={!task.executablePath}
                        >
                            Clear
                        </button>
                    </div>
                    {captureSupport.any && (
                        <div className="task-advanced-capture">
                            {captureSupport.photos && (
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={task.allowPhotos === true}
                                        onChange={(e) =>
                                            updateTask({ allowPhotos: e.target.checked })
                                        }
                                    />
                                    Allow photos
                                </label>
                            )}
                            {captureSupport.videos && (
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={task.allowVideos === true}
                                        onChange={(e) =>
                                            updateTask({ allowVideos: e.target.checked })
                                        }
                                    />
                                    Allow videos
                                </label>
                            )}
                            <label>
                                Notification visibility bias (0–100)
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={task.captureNotificationVisibilityBias ?? 100}
                                    onChange={(e) =>
                                        updateTask({
                                            captureNotificationVisibilityBias: Number(e.target.value),
                                        })
                                    }
                                    title="Higher = more likely visible notification + sound. Use < 100 for possible hidden captures when the profile and level allow it."
                                />
                            </label>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    const voiceSelection = (
        <div className="task-editor-voice">
            {task.type === TaskType.HOLDPOSITION && (
                <select
                    value={holdVoiceSlot}
                    onChange={(e) => setHoldVoiceSlot(e.target.value)}
                    aria-label="Hold voice line"
                    title={
                        holdVoiceSlot === HOLD_VOICE_MAIN
                            ? 'Voice-Main:'
                            : holdVoiceSlot === HOLD_VOICE_HALF
                                ? 'Voice-Halfway:'
                                : 'Voice-3Q:'
                    }
                    style={{
                        flex: '0 0 auto',
                        width: '12.5rem',
                        boxSizing: 'border-box',
                    }}
                >
                    <option value={HOLD_VOICE_MAIN}>Voice-Main:</option>
                    <option value={HOLD_VOICE_HALF}>Voice-Halfway:</option>
                    <option value={HOLD_VOICE_3Q}>Voice-3Q:</option>
                </select>
            )}
            <div className="task-audio-selector task-voice-category">
                <div>Voice Category:</div>
                <select
                    className="task-voice-category-select"
                    aria-label="Voice category"
                    value={activeVoiceCategory}
                    onChange={(e) => applyVoiceCategory(e.target.value)}
                >
                    <option value="standard">Task-Specific</option>
                    {activeVoiceSlot === HOLD_VOICE_MAIN && (
                        <option value="release">Release</option>
                    )}
                    <option value="custom">Custom</option>
                </select>
            </div>
            <AudioSelector
                label="Voice Line"
                value={activeVoiceCue}
                onChange={(audio) => {
                    const cue = audio || null
                    if (activeVoiceSlot === HOLD_VOICE_HALF) {
                        updateTask({ audioHalfway: cue })
                    } else if (activeVoiceSlot === HOLD_VOICE_3Q) {
                        updateTask({ audioThreeQuarter: cue })
                    } else {
                        updateTask({ audio: cue })
                    }
                }}
                allowedOptions={voiceLineOptions}
                audioPackId={audioPackId}
            />
        </div>
    )

    const renderTaskFields = () => {
        switch (task.type) {
            case TaskType.GETREADY:
                return (
                    <div>
                        <NumberControl
                            label="Time "
                            value={task.timeLimit || 15}
                            setValue={(fn) => {
                                const currentValue = taskRef.current.timeLimit || 15
                                const newValue = typeof fn === 'function' ? fn(currentValue) : fn
                                updateTask({ timeLimit: Math.max(1, newValue) })
                            }}
                            min={1}
                            step={1}
                        />
                    </div>
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
                                    updateTask({ targetDepth: validatedDepth })
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
                            {/* <small style={{ color: 'var(--muted)', display: 'block', marginTop: '4px', textAlign: 'center' }}>Leave at 0 for Auto</small> */}
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
                                    updateTask({
                                        minDepth: validatedMin,
                                        maxDepth: finalMax,
                                    })
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
                                    updateTask({ maxDepth: validatedMax })
                                }}
                                min={2}
                                max={4}
                                step={1}
                            />
                        </div>
                        <div className="task-tempo-field">
                            <div style={{ textAlign: 'center' }}>Tempo:</div>
                            <select
                                className="task-tempo-select"
                                aria-label="Tempo"
                                value={task.tempo || Tempo.SLOW}
                                onChange={(e) => {
                                    const newTempo = parseInt(e.target.value)
                                    updateTask({ tempo: newTempo })
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
                                    updateTask({ targetDepth: validatedDepth })
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

            case TaskType.SPEAK:
                return (
                    <>
                        <div style={{ width: '100%' }}>
                            <div style={{ textAlign: 'center', marginBottom: '4px' }}>Phrase to match</div>
                            <textarea
                                style={{ width: '100%', minHeight: '72px' }}
                                value={task.phrase ?? ''}
                                onChange={(e) => updateTask({ phrase: e.target.value })}
                                placeholder='Short phrase or, for long mode, sentences separated by . ? ! Use [a, b, c] for acceptable alternatives; add - to allow that word to be omitted (e.g. [suck, duck, -] the water out).'
                            />
                        </div>
                        <div
                            style={{
                                width: '100%',
                                flexBasis: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                            }}
                        >
                            <div>
                                <label>Mode:</label>{' '}
                                <select
                                    value={task.speakMode || SpeakMode.SHORT}
                                    onChange={(e) => updateTask({ speakMode: e.target.value })}
                                    style={{ width: 'min(20rem, 100%)', maxWidth: '100%' }}
                                >
                                    <option value={SpeakMode.SHORT}>Short (one phrase)</option>
                                    <option value={SpeakMode.LONG}>Long (multiple sentences)</option>
                                </select>
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 0 0' }}>
                                {(task.speakMode || SpeakMode.SHORT) === SpeakMode.LONG ? (
                                    <>
                                        Long mode: split sentences with <code>.</code> <code>?</code> or <code>!</code>{' '}
                                        only.
                                    </>
                                ) : (
                                    <>
                                        Short mode: listen for whole phrase up to <code>.</code> <code>?</code> or{' '}
                                        <code>!</code>
                                    </>
                                )}
                            </p>
                            <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 4px 0' }}>
                                Alternatives: <code>[word1, word2, -]</code> = any listed option matches that word
                                (comma-separated). Use <code>-</code> for an optional omitted word.
                            </p>
                        </div>
                        <div>
                            <NumberControl
                                label="Repeat (full passes)"
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
                        </div>
                        <div style={{ width: '100%' }}>
                            <div style={{ textAlign: 'center', marginBottom: '4px' }}>Help text (optional)</div>
                            <input
                                type="text"
                                style={{ width: '100%' }}
                                value={task.helpText ?? ''}
                                onChange={(e) => updateTask({ helpText: e.target.value })}
                            />
                        </div>
                        <label className="task-speak-fuzzy-label">
                            <input
                                type="checkbox"
                                checked={Boolean(task.speakEndpointFuzzy)}
                                onChange={(e) => updateTask({ speakEndpointFuzzy: e.target.checked })}
                            />
                            <span>
                                Fuzzy match at the end of spoken segments (may allow near-misses).
                            </span>
                        </label>
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
                                    updateTask({ targetDepth: validatedDepth })
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
            case 'rest ball':
                return (
                    <>
                        <div>
                            <NumberControl
                                label="Time "
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
                        <div className="task-rest-balls">
                            <label className="task-rest-balls-label">
                                <input
                                    type="checkbox"
                                    checked={!!task.ballsBonus}
                                    onChange={(e) => updateTask({ ballsBonus: e.target.checked })}
                                />
                                Balls bonus (earn points during rest)
                            </label>
                        </div>
                    </>
                )

            case TaskType.FINISH:
                return (
                    <>
                        <div>
                            <NumberControl
                                label="Time "
                                value={task.timeLimit || 15}
                                setValue={(fn) => {
                                    const currentValue = taskRef.current.timeLimit || 15
                                    const newValue = typeof fn === 'function' ? fn(currentValue) : fn
                                    updateTask({ timeLimit: Math.max(1, newValue) })
                                }}
                                min={1}
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
                        {voiceSelection}
                        <div style={{ width: '100%', marginTop: '12px' }}>
                            <h5 style={{ marginBottom: '8px' }}>Score Events</h5>
                            <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px', marginTop: '-4px' }}>
                                Points to earn since the last event (random value in range). First event uses current session score as base.
                            </p>
                            {(task.scoreEvents || []).map((ev, idx) => {
                                const soundUsesCustomVoiceLines =
                                    ev.soundVoiceShowCustom !== undefined
                                        ? !!ev.soundVoiceShowCustom
                                        : !!task.showCustomVoiceLines
                                const scriptUsesCustomVoiceLines =
                                    ev.scriptVoiceShowCustom !== undefined
                                        ? !!ev.scriptVoiceShowCustom
                                        : !!task.showCustomVoiceLines
                                const vibrationUsesCustomVoiceLines =
                                    ev.vibrationVoiceShowCustom !== undefined
                                        ? !!ev.vibrationVoiceShowCustom
                                        : !!task.showCustomVoiceLines
                                return (
                                <div key={idx} className="row flex-wrap control-compact" style={{ gap: '8px', alignItems: 'center', marginBottom: '8px', padding: '8px', backgroundColor: 'var(--surface-soft)', borderRadius: '4px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <button
                                            type="button"
                                            onClick={() => moveScoreEvent(idx, 'up')}
                                            disabled={idx === 0}
                                            style={{ opacity: idx === 0 ? 0.3 : 1 }}
                                        >
                                            ↑
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => moveScoreEvent(idx, 'down')}
                                            disabled={idx === (task.scoreEvents || []).length - 1}
                                            style={{ opacity: idx === (task.scoreEvents || []).length - 1 ? 0.3 : 1 }}
                                        >
                                            ↓
                                        </button>
                                    </div>
                                    <NumberControl label="+Min pts" value={ev.scoreMin ?? 0} setValue={(fn) => {
                                        const arr = [...(taskRef.current.scoreEvents || [])]
                                        arr[idx] = { ...arr[idx], scoreMin: typeof fn === 'function' ? fn(arr[idx]?.scoreMin ?? 0) : fn }
                                        updateTask({ scoreEvents: arr })
                                    }} min={0} step={1} />
                                    <NumberControl label="+Max pts" value={ev.scoreMax ?? ev.scoreMin ?? 0} setValue={(fn) => {
                                        const arr = [...(taskRef.current.scoreEvents || [])]
                                        arr[idx] = { ...arr[idx], scoreMax: typeof fn === 'function' ? fn(arr[idx]?.scoreMax ?? arr[idx]?.scoreMin ?? 0) : fn }
                                        updateTask({ scoreEvents: arr })
                                    }} min={0} step={1} />
                                    <div
                                        className="margin-x"
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <div style={{ textAlign: 'center', visibility: 'hidden', userSelect: 'none' }} aria-hidden>
                                            +Min pts
                                        </div>
                                        <div
                                            style={{
                                                height: '38px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <button type="button" className="button-delete task-delete-button" onClick={() => {
                                                const arr = (taskRef.current.scoreEvents || []).filter((_, i) => i !== idx)
                                                updateTask({ scoreEvents: arr })
                                            }}>×</button>
                                        </div>
                                    </div>
                                    <select
                                        value={ev.type || 'play_sound'}
                                        onChange={(e) => {
                                            const arr = [...(taskRef.current.scoreEvents || [])]
                                            const nextType = e.target.value
                                            let nextEv = { ...arr[idx], type: nextType }
                                            if (nextType !== 'run_script') {
                                                const { scriptVoiceKey, scriptVoiceShowCustom, ...restRs } = nextEv
                                                nextEv = restRs
                                            }
                                            if (nextType !== 'play_sound') {
                                                const { soundVoiceShowCustom, ...restPs } = nextEv
                                                nextEv = restPs
                                            }
                                            if (nextType !== 'add_grace') {
                                                const { graceVoiceKey, graceVoiceShowCustom, graceMin, graceMax, ...restAg } = nextEv
                                                nextEv = restAg
                                            }
                                            if (nextType !== 'add_vibration') {
                                                const {
                                                    vibrationVoiceKey,
                                                    vibrationVoiceShowCustom,
                                                    vibrationMin,
                                                    vibrationMax,
                                                    ...restVib
                                                } = nextEv
                                                nextEv = restVib
                                            }
                                            if (nextType === 'add_vibration') {
                                                let vMin =
                                                    typeof nextEv.vibrationMin === 'number'
                                                        ? roundVibrationDeltaField(nextEv.vibrationMin)
                                                        : roundVibrationDeltaField(0.05)
                                                let vMax =
                                                    typeof nextEv.vibrationMax === 'number'
                                                        ? roundVibrationDeltaField(nextEv.vibrationMax)
                                                        : undefined
                                                if (vMax === undefined) {
                                                    vMax =
                                                        typeof nextEv.vibrationMin === 'number'
                                                            ? roundVibrationDeltaField(nextEv.vibrationMin)
                                                            : roundVibrationDeltaField(0.1)
                                                }
                                                nextEv = { ...nextEv, vibrationMin: vMin, vibrationMax: vMax }
                                            }
                                            arr[idx] = nextEv
                                            updateTask({ scoreEvents: arr })
                                        }}
                                    >
                                        <option value="play_sound">Play Sound</option>
                                        <option value="add_grace">Add Grace</option>
                                        <option value="add_vibration">Add Vibration</option>
                                        <option value="run_script">Run Script</option>
                                    </select>
                                    {(ev.type || 'play_sound') === 'play_sound' && (
                                        <div style={ENDLESS_SCORE_EVENT_PLAY_SOUND_ROW_STYLE}>
                                            <select
                                                value={ev.soundKey || ''}
                                                onChange={(e) => {
                                                    const arr = [...(taskRef.current.scoreEvents || [])]
                                                    arr[idx] = { ...arr[idx], soundKey: e.target.value || undefined }
                                                    updateTask({ scoreEvents: arr })
                                                }}
                                                style={ENDLESS_SCORE_EVENT_VOICE_SELECT_STYLE}
                                            >
                                                <option value="">Select sound...</option>
                                                {(soundUsesCustomVoiceLines
                                                    ? [...EVENT_SOUND_OPTIONS, ...getCustomAudioOptions(audioPackId)]
                                                    : EVENT_SOUND_OPTIONS
                                                ).map((o) => (
                                                    <option key={o.value} value={o.value}>{o.label}</option>
                                                ))}
                                            </select>
                                            <label
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    fontSize: '12px',
                                                    lineHeight: 1.2,
                                                    margin: 0,
                                                    cursor: 'pointer',
                                                    whiteSpace: 'nowrap',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={soundUsesCustomVoiceLines}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked
                                                        const arr = [...(taskRef.current.scoreEvents || [])]
                                                        const row = { ...arr[idx] }
                                                        row.soundVoiceShowCustom = checked
                                                        arr[idx] = row
                                                        updateTask({ scoreEvents: arr })
                                                    }}
                                                    style={{ margin: 0, flexShrink: 0, verticalAlign: 'middle' }}
                                                />
                                                Show Custom Voice Lines
                                            </label>
                                        </div>
                                    )}
                                    {(ev.type || 'play_sound') === 'run_script' && (
                                        <>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    gap: '4px',
                                                    alignItems: 'center',
                                                    flex: '1 1 12rem',
                                                    minWidth: 0,
                                                    maxWidth: 'min(29.5rem, 100%)',
                                                }}
                                            >
                                                <input
                                                    type="text"
                                                    value={ev.executablePath || ''}
                                                    onChange={(e) => {
                                                        const arr = [...(taskRef.current.scoreEvents || [])]
                                                        arr[idx] = {
                                                            ...arr[idx],
                                                            executablePath: e.target.value || undefined,
                                                        }
                                                        updateTask({ scoreEvents: arr })
                                                    }}
                                                    placeholder="Script path..."
                                                    style={{
                                                        flex: 1,
                                                        minWidth: '14rem',
                                                        width: 0,
                                                        boxSizing: 'border-box',
                                                    }}
                                                />
                                                <button type="button" className="button" disabled={!isElectron} onClick={async () => {
                                                    const selected = await executableService.pickExecutable(ev.executablePath || 'scripts')
                                                    if (selected) {
                                                        const arr = [...(taskRef.current.scoreEvents || [])]
                                                        arr[idx] = { ...arr[idx], executablePath: selected }
                                                        updateTask({ scoreEvents: arr })
                                                    }
                                                }}>Browse</button>
                                            </div>
                                            <div style={ENDLESS_SCORE_EVENT_OPTIONAL_VOICE_COLUMN_STYLE}>
                                                <span>Voice line (optional)</span>
                                                <div style={ENDLESS_SCORE_EVENT_OPTIONAL_VOICE_INNER_ROW_STYLE}>
                                                    <select
                                                        value={ev.scriptVoiceKey || ''}
                                                        onChange={(e) => {
                                                            const arr = [...(taskRef.current.scoreEvents || [])]
                                                            arr[idx] = {
                                                                ...arr[idx],
                                                                scriptVoiceKey: e.target.value || undefined,
                                                            }
                                                            updateTask({ scoreEvents: arr })
                                                        }}
                                                        style={ENDLESS_SCORE_EVENT_VOICE_SELECT_STYLE}
                                                    >
                                                        <option value="">None</option>
                                                        {(scriptUsesCustomVoiceLines
                                                            ? [...EVENT_SOUND_OPTIONS, ...getCustomAudioOptions(audioPackId)]
                                                            : EVENT_SOUND_OPTIONS
                                                        ).map((o) => (
                                                            <option key={o.value} value={o.value}>{o.label}</option>
                                                        ))}
                                                    </select>
                                                    <label
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            fontSize: '12px',
                                                            lineHeight: 1.2,
                                                            margin: 0,
                                                            cursor: 'pointer',
                                                            whiteSpace: 'nowrap',
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={scriptUsesCustomVoiceLines}
                                                            onChange={(e) => {
                                                                const checked = e.target.checked
                                                                const arr = [...(taskRef.current.scoreEvents || [])]
                                                                const row = { ...arr[idx] }
                                                                row.scriptVoiceShowCustom = checked
                                                                arr[idx] = row
                                                                updateTask({ scoreEvents: arr })
                                                            }}
                                                            style={{ margin: 0, flexShrink: 0, verticalAlign: 'middle' }}
                                                        />
                                                        Show Custom Voice Lines
                                                    </label>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                    {(ev.type || 'play_sound') === 'add_grace' && (
                                        <>
                                            <NumberControl label="+Grace Min" value={ev.graceMin ?? 1} setValue={(fn) => {
                                                const arr = [...(taskRef.current.scoreEvents || [])]
                                                arr[idx] = { ...arr[idx], graceMin: typeof fn === 'function' ? fn(arr[idx]?.graceMin ?? 1) : fn }
                                                updateTask({ scoreEvents: arr })
                                            }} min={1} max={30} step={1} />
                                            <NumberControl label="+Grace Max" value={ev.graceMax ?? ev.graceMin ?? 1} setValue={(fn) => {
                                                const arr = [...(taskRef.current.scoreEvents || [])]
                                                arr[idx] = { ...arr[idx], graceMax: typeof fn === 'function' ? fn(arr[idx]?.graceMax ?? arr[idx]?.graceMin ?? 1) : fn }
                                                updateTask({ scoreEvents: arr })
                                            }} min={1} max={30} step={1} />
                                            <div style={ENDLESS_SCORE_EVENT_OPTIONAL_VOICE_COLUMN_STYLE}>
                                                <span>Voice line (optional)</span>
                                                <div style={ENDLESS_SCORE_EVENT_OPTIONAL_VOICE_INNER_ROW_STYLE}>
                                                    <select
                                                        value={ev.graceVoiceKey || ''}
                                                        onChange={(e) => {
                                                            const arr = [...(taskRef.current.scoreEvents || [])]
                                                            arr[idx] = {
                                                                ...arr[idx],
                                                                graceVoiceKey: e.target.value || undefined,
                                                            }
                                                            updateTask({ scoreEvents: arr })
                                                        }}
                                                        style={ENDLESS_SCORE_EVENT_VOICE_SELECT_STYLE}
                                                    >
                                                        <option value="">None</option>
                                                        {getAudioOptionsForTaskType(
                                                            TaskType.REST,
                                                            !!ev.graceVoiceShowCustom,
                                                            audioPackId
                                                        ).map((o) => (
                                                            <option key={o.value} value={o.value}>{o.label}</option>
                                                        ))}
                                                    </select>
                                                    <label
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            fontSize: '12px',
                                                            lineHeight: 1.2,
                                                            margin: 0,
                                                            cursor: 'pointer',
                                                            whiteSpace: 'nowrap',
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={!!ev.graceVoiceShowCustom}
                                                            onChange={(e) => {
                                                                const checked = e.target.checked
                                                                const arr = [...(taskRef.current.scoreEvents || [])]
                                                                const row = { ...arr[idx] }
                                                                if (checked) row.graceVoiceShowCustom = true
                                                                else delete row.graceVoiceShowCustom
                                                                arr[idx] = row
                                                                updateTask({ scoreEvents: arr })
                                                            }}
                                                            style={{ margin: 0, flexShrink: 0, verticalAlign: 'middle' }}
                                                        />
                                                        Show Custom Voice Lines
                                                    </label>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                    {(ev.type || 'play_sound') === 'add_vibration' && (
                                        <>
                                            <NumberControl
                                                label="+Vibe Min"
                                                value={roundVibrationDeltaField(ev.vibrationMin ?? 0.05)}
                                                setValue={(fn) => {
                                                    const arr = [...(taskRef.current.scoreEvents || [])]
                                                    const cur = roundVibrationDeltaField(arr[idx]?.vibrationMin ?? 0.05)
                                                    const raw = typeof fn === 'function' ? fn(cur) : fn
                                                    const vibrationMin = roundVibrationDeltaField(
                                                        typeof raw === 'number' ? raw : parseFloat(raw) || cur
                                                    )
                                                    arr[idx] = { ...arr[idx], vibrationMin }
                                                    updateTask({ scoreEvents: arr })
                                                }}
                                                min={-1}
                                                max={1}
                                                step={0.05}
                                            />
                                            <NumberControl
                                                label="+Vibe Max"
                                                value={roundVibrationDeltaField(
                                                    ev.vibrationMax ?? ev.vibrationMin ?? 0.05
                                                )}
                                                setValue={(fn) => {
                                                    const arr = [...(taskRef.current.scoreEvents || [])]
                                                    const cur = roundVibrationDeltaField(
                                                        arr[idx]?.vibrationMax ??
                                                            arr[idx]?.vibrationMin ??
                                                            0.05
                                                    )
                                                    const raw = typeof fn === 'function' ? fn(cur) : fn
                                                    const vibrationMax = roundVibrationDeltaField(
                                                        typeof raw === 'number' ? raw : parseFloat(raw) || cur
                                                    )
                                                    arr[idx] = { ...arr[idx], vibrationMax }
                                                    updateTask({ scoreEvents: arr })
                                                }}
                                                min={-1}
                                                max={1}
                                                step={0.05}
                                            />
                                            <div style={ENDLESS_SCORE_EVENT_OPTIONAL_VOICE_COLUMN_STYLE}>
                                                <span>Voice line (optional)</span>
                                                <div style={ENDLESS_SCORE_EVENT_OPTIONAL_VOICE_INNER_ROW_STYLE}>
                                                    <select
                                                        value={ev.vibrationVoiceKey || ''}
                                                        onChange={(e) => {
                                                            const arr = [...(taskRef.current.scoreEvents || [])]
                                                            arr[idx] = {
                                                                ...arr[idx],
                                                                vibrationVoiceKey: e.target.value || undefined,
                                                            }
                                                            updateTask({ scoreEvents: arr })
                                                        }}
                                                        style={ENDLESS_SCORE_EVENT_VOICE_SELECT_STYLE}
                                                    >
                                                        <option value="">None</option>
                                                        {(vibrationUsesCustomVoiceLines
                                                            ? [
                                                                  ...EVENT_SOUND_OPTIONS,
                                                                  ...getCustomAudioOptions(audioPackId),
                                                              ]
                                                            : EVENT_SOUND_OPTIONS
                                                        ).map((o) => (
                                                            <option key={o.value} value={o.value}>
                                                                {o.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <label
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            fontSize: '12px',
                                                            lineHeight: 1.2,
                                                            margin: 0,
                                                            cursor: 'pointer',
                                                            whiteSpace: 'nowrap',
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={vibrationUsesCustomVoiceLines}
                                                            onChange={(e) => {
                                                                const checked = e.target.checked
                                                                const arr = [...(taskRef.current.scoreEvents || [])]
                                                                const row = { ...arr[idx] }
                                                                row.vibrationVoiceShowCustom = checked
                                                                arr[idx] = row
                                                                updateTask({ scoreEvents: arr })
                                                            }}
                                                            style={{
                                                                margin: 0,
                                                                flexShrink: 0,
                                                                verticalAlign: 'middle',
                                                            }}
                                                        />
                                                        Show Custom Voice Lines
                                                    </label>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                                )
                            })}
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
        <div className="task-editor-card margin-y">
            <div className="task-editor-header">
                <div className="row flex-wrap" style={{ gap: '8px', alignItems: 'center' }}>
                    {taskNumber != null && (
                        <span style={{ fontWeight: 'bold', color: 'var(--muted)' }}>#{taskNumber}</span>
                    )}
                    <div className="task-editor-type">
                        <select
                            className="task-type-select"
                            disabled={fixed}
                            value={task.type === 'rest ball' ? TaskType.REST : task.type}
                            onChange={(e) => updateTask({ type: e.target.value })}
                        >
                            <option value={TaskType.GETREADY}>Get Ready</option>
                            <option value={TaskType.HOLDPOSITION}>Hold Position</option>
                            <option value={TaskType.UPANDDOWN}>Up and Down</option>
                            <option value={TaskType.HITDEPTH}>Hit Depth</option>
                            <option value={TaskType.CLAP}>Clap</option>
                            <option value={TaskType.SPEAK}>Speak</option>
                            <option value={TaskType.HOLDANDCLAP}>Hold and Clap</option>
                            <option value={TaskType.REST}>Rest</option>
                            <option value={TaskType.FINISH}>Finish</option>
                            <option value={TaskType.ENDLESS}>Endless</option>
                        </select>
                    </div>
                </div>
                {!fixed && (
                    <button
                        className="button-delete task-delete-button"
                        onClick={onDelete}
                        type="button"
                    >
                        ×
                    </button>
                )}
            </div>
            <div className="task-editor-fields row flex-wrap margin-y-sm" style={{ gap: '8px' }}>
                {renderTaskFields()}
            </div>
            {task.type !== TaskType.ENDLESS && voiceSelection}
            {advancedSection}
        </div>
    )
}

export default TaskForm

