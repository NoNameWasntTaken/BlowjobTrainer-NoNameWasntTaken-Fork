import React from 'react';
import { useState, useRef } from 'react';
import { DEBUG } from '../../App';
import Level from './Level';
import { levelManager } from '../../services/levelManager';
import { useSetAtom } from 'jotai';
import { currentLevelAtom } from '../../atoms/taskAtom';
import { navAtom } from '../../atoms/navAtom';
import { feedbackAtom, activePackIdAtom, musicPlaybackSessionAtom } from '../../atoms/audioAtom';
import { store } from '../../store';
import * as NAV from '../../atoms/navAtom';
import { getRandomInt } from '../randomInt'
import { audioManager } from '../../services/audioManager';
import { storageService } from '../../services/storageService';
import { externalIntegrationService } from '../../services/externalIntegrationService';
import { resolveExternalAudioPackId } from '../../utils/externalVoicePackResolver';
import { useEffect } from 'react';
import { warmAudioForPlay } from '../../services/preflightService';
import { TaskType } from '../Tasks/task';

function buildRuntimeTasks(level) {
    return (level.tasks || []).map((task) => ({
        ...task,
        id: task.id || getRandomInt(),
    }))
}

const Training = () => {

    const [selectedLevel, setSelectedLevel] = useState(null)
    const [activeTab, setActiveTab] = useState('default')

    const defaultLevels = levelManager.getDefaultLevels()
    const customLevels = levelManager.getCustomLevels()
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    const showTabs = customLevels.length > 0
    const levelsToShow = activeTab === 'default' ? defaultLevels : customLevels

    const handleTabChange = (tab) => {
        setActiveTab(tab)
        setSelectedLevel(null)
        selectedRuntimeTasksRef.current = null
    }
    const setCurrentLevel = useSetAtom(currentLevelAtom)
    const setNav = useSetAtom(navAtom)
    const setFeedback = useSetAtom(feedbackAtom)
    const activationRef = useRef(null)
    /** Stable task ids between level select and Begin (warm-up cache keys must match). */
    const selectedRuntimeTasksRef = useRef(null)

    /**
     * Apply the correct audio pack for a level (external vs normal, default vs custom).
     * Awaits so the pack is active before returning. Used on level select and before starting play.
     * @param {object} level - Level object
     * @param {{ activationRef?: React.MutableRefObject<{ cancelled: boolean } | null> }} options - Optional activationRef for cancellation when called from handleSelectLevel
     */
    const applyAudioPackForLevel = async (level, { activationRef: actRef } = {}) => {
        const isExternalMode = externalIntegrationService.isExternalMode()
        const cliAudioPackId = externalIntegrationService.getAudioPackId()

        if (isExternalMode) {
            const audioPackId = resolveExternalAudioPackId(level, cliAudioPackId)
            await audioManager.setActiveCustomPack(audioPackId)
            audioManager.setFallbackPack(null)
            return
        }

        const isDefault = levelManager.isDefaultLevel(level.id)
        if (isDefault) {
            const currentlySelectedPackId = store.get(activePackIdAtom) ?? storageService.getActiveAudioPack()
            if (!actRef?.current?.cancelled) {
                if (currentlySelectedPackId) {
                    await audioManager.setActiveCustomPack(currentlySelectedPackId)
                }
                audioManager.setFallbackPack(null)
            }
            return
        }

        // Custom level
        const activation = { cancelled: false }
        if (actRef) actRef.current = activation
        const currentlySelectedPackId = store.get(activePackIdAtom) ?? storageService.getActiveAudioPack()
        if (activation.cancelled) return

        if (level.audioPackId) {
            const pack = audioManager.loadPack(level.audioPackId)
            if (activation.cancelled) return
            if (pack) {
                if (!activation.cancelled) {
                    await audioManager.setActiveCustomPack(level.audioPackId)
                    audioManager.setFallbackPack(currentlySelectedPackId)
                }
            } else {
                console.warn(`Audio pack ${level.audioPackId} not found, using currently selected pack`)
                if (!activation.cancelled) {
                    if (currentlySelectedPackId) {
                        await audioManager.setActiveCustomPack(currentlySelectedPackId)
                        audioManager.setFallbackPack(null)
                    } else {
                        await audioManager.setActiveCustomPack(null)
                        audioManager.setFallbackPack(null)
                    }
                }
            }
        } else {
            if (!activation.cancelled) {
                if (currentlySelectedPackId) {
                    await audioManager.setActiveCustomPack(currentlySelectedPackId)
                    audioManager.setFallbackPack(null)
                } else {
                    await audioManager.setActiveCustomPack(null)
                    audioManager.setFallbackPack(null)
                }
            }
        }
        if (actRef && activation === actRef.current) actRef.current = null
    }

    // Handle pre-loaded level from CLI
    useEffect(() => {
        const isExternalMode = externalIntegrationService.isExternalMode();
        if (!isExternalMode) return;

        const levelId = externalIntegrationService.getLevelId();
        if (!levelId) return;

        const level = levelManager.getLevel(levelId);
        if (level) {
            handleSelectLevel(level);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount for external mode
    }, []);

    const handleSelectLevel = async (level) => {
        // Cancel previous activation if pending
        if (activationRef.current) {
            activationRef.current.cancelled = true
        }
        
        setSelectedLevel(level)
        const runtimeTasks = buildRuntimeTasks(level)
        selectedRuntimeTasksRef.current = { levelId: level.id, tasks: runtimeTasks }
        // Automatically set the current level when a level is selected
        setCurrentLevel({
            id: level.id,
            status: 'idle',
            startTime: null,
            totalTime: 0,
            soft: level.soft ?? false,
            currentScore: 0,
            backgroundMusicId: level.backgroundMusicId,
            tasks: runtimeTasks,
            currentTask: null,
            completedTasks: [],
            milestones: {},
            taskScores: {},
            metrics: {}
        })
        
        await applyAudioPackForLevel(level, { activationRef })
        if (!activationRef.current?.cancelled) {
            const first = runtimeTasks[0] ?? null
            const preloadSherpa = runtimeTasks.some((t) => t.type === TaskType.SPEAK)
            await warmAudioForPlay({
                levelId: level.id,
                firstTask: first,
                preloadSherpa,
            })
        }
    }

    const handleBeginLevel = async () => {
        if (!selectedLevel) return
        // Apply audio pack before navigating so the first line and all subsequent lines use the selected pack
        await applyAudioPackForLevel(selectedLevel)
        const runtimeTasks =
            selectedRuntimeTasksRef.current?.levelId === selectedLevel.id
                ? selectedRuntimeTasksRef.current.tasks
                : buildRuntimeTasks(selectedLevel)
        const first = runtimeTasks[0] ?? null
        const preloadSherpa = runtimeTasks.some((t) => t.type === TaskType.SPEAK)
        await warmAudioForPlay({
            levelId: selectedLevel.id,
            firstTask: first,
            preloadSherpa,
        })
        // Stop any test music session so Begin on Playing starts clean
        store.set(musicPlaybackSessionAtom, (prev) => ({
            url: null,
            generation: prev.generation + 1,
            stopFade: false
        }))
        // Initialize the currentLevel with the selected level data
        setCurrentLevel({
            id: selectedLevel.id,
            status: 'idle',
            startTime: null,
            totalTime: 0,
            soft: selectedLevel?.soft ?? false,
            currentScore: 0,
            backgroundMusicId: selectedLevel.backgroundMusicId,
            tasks: runtimeTasks,
            currentTask: null,
            completedTasks: [],
            milestones: {},
            taskScores: {},
            metrics: {}
        })
        setNav(NAV.PLAYING)
    }

    // Handle playing the audio for a task
    const handlePlayAudio = (task) => {
        if (task.audio) {
            setFeedback(task.audio)
        }
    }


    return (
        <React.Fragment>
            <div className="row-centered">
                <h4 className="margin-y-sm">Select a Level</h4>
            </div>
            {showTabs && (
                <div className="row-centered margin-y-sm">
                    <button
                        className={`button padding-x margin-x-sm ${activeTab === 'default' ? 'button-primary' : ''}`}
                        onClick={() => handleTabChange('default')}
                    >
                        Default
                    </button>
                    <button
                        className={`button padding-x margin-x-sm ${activeTab === 'custom' ? 'button-primary' : ''}`}
                        onClick={() => handleTabChange('custom')}
                    >
                        Custom
                    </button>
                </div>
            )}
            <div className="grid-three">
                {levelsToShow.map(level =>
                    <Level
                        key={level.id}
                        isSelected={selectedLevel?.id === level.id}
                        level={level}
                        onSelect={handleSelectLevel}
                    />)}
            </div>
            <div className="row-centered margin-y">
                <button
                    className={`button padding-x margin-y ${selectedLevel ? 'button-primary' : ''}`}
                    onClick={handleBeginLevel}
                    disabled={!selectedLevel}
                >
                    {selectedLevel ? `Begin Level ${selectedLevel.order}` : 'No level selected'}
                </button>
            </div>

            {DEBUG && selectedLevel && <div className="row margin-y">
                <div>
                    <h4>Tasks for Level {selectedLevel?.id}: {selectedLevel?.title}</h4>
                    <ul style={{ listStyleType: 'none', padding: 0 }}>
                        {selectedLevel?.tasks.map((task, index) => {
                            let taskDescription = `Task ${index + 1}: ${task.type}`
                            if (task.targetDepth) taskDescription += ` - Depth: ${task.targetDepth}`
                            if (task.minDepth && task.maxDepth) taskDescription += ` - Depth Range: ${task.minDepth}-${task.maxDepth}`
                            if (task.tempo) taskDescription += ` - Tempo: ${task.tempo}`
                            if (task.time) taskDescription += ` - Time: ${task.time}s`
                            if (task.repeat) taskDescription += ` - Repeat: ${task.repeat}x`
                            if (task.timeLimit) taskDescription += ` - Time Limit: ${task.timeLimit}s`

                            return (
                                <li key={index} style={{ margin: '5px 0', padding: '5px', backgroundColor: index % 2 === 0 ? '#f5f5f5' : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>
                                        {taskDescription}
                                        {task.audio && (
                                            <span> - <b>{audioManager.getAudioKey(task.audio) || 'Audio'}</b></span>
                                        )}
                                    </span>
                                    {task.audio && (
                                        <button className='button'
                                            onClick={() => handlePlayAudio(task)}
                                        >
                                            Play Audio
                                        </button>
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                </div>
            </div>}



            {/* Score Preview for debugging */}
            {/* <div className="row margin-y">
                <ScorePreview level={selectedLevel?.id || 1} />
            </div> */}
        </React.Fragment>
    )
};



// function Training() {

//     // this is our global state
//     const [mission, setMission] = useState(10)

//     function handleClick() {
//         setMission(mission + 1)
//     }

//     return (
//         <div>
//             <h2>Training</h2>
//             <MyButton mission={mission} onClick={handleClick} />
//         </div>
//     );
// }

export default Training;
