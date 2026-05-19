import React from 'react';
import { useState, useRef } from 'react';
import { DEBUG } from '../../App';
import Level from './Level';
import { levelManager } from '../../services/levelManager';
import { generateTask } from '../Tasks/task';
import { useSetAtom } from 'jotai';
import { currentLevelAtom } from '../../atoms/taskAtom';
import { navAtom } from '../../atoms/navAtom';
import { feedbackAtom } from '../../atoms/audioAtom';
import * as NAV from '../../atoms/navAtom';
import { getRandomInt } from '../randomInt'
import { ScorePreview } from './ScorePreview'
import { audioManager } from '../../services/audioManager';
import { storageService } from '../../services/storageService';

const Training = () => {

    const [selectedLevel, setSelectedLevel] = useState(null)
    const setCurrentLevel = useSetAtom(currentLevelAtom)
    const setNav = useSetAtom(navAtom)
    const setFeedback = useSetAtom(feedbackAtom)
    const activationRef = useRef(null)

    const handleSelectLevel = async (level) => {
        // Cancel previous activation if pending
        if (activationRef.current) {
            activationRef.current.cancelled = true
        }
        
        setSelectedLevel(level)
        // Automatically set the current level when a level is selected
        setCurrentLevel({
            status: 'idle',
            startTime: null,
            totalTime: 0,
            currentScore: 0,
            tasks: (level.tasks || []).map(task => ({
                ...task,
                id: task.id || getRandomInt()
            })),
            currentTask: null,
            completedTasks: [],
            milestones: {},
            taskScores: {},
            metrics: {}
        })
        
        // Check if this is a default level
        const isDefault = levelManager.isDefaultLevel(level.id)
        
        if (isDefault) {
            // Default level: Do NOT change active pack
            // Use currently selected pack from Content Library (already in activeCustomPack)
            // Set fallback to default (null) for missing files
            if (!activationRef.current?.cancelled) {
                audioManager.setFallbackPack(null)
            }
        } else {
            // Custom level: Use level's audio pack with fallbacks
            const activation = { cancelled: false }
            activationRef.current = activation
            
            // Get currently selected pack from Content Library (before we change activeCustomPack)
            const currentlySelectedPackId = storageService.getActiveAudioPack()
            const currentlySelectedPack = currentlySelectedPackId 
                ? audioManager.loadPack(currentlySelectedPackId)
                : null
            
            // Check cancellation early
            if (activation.cancelled) return
            
            if (level.audioPackId) {
                // Level has a custom audio pack specified
                const pack = audioManager.loadPack(level.audioPackId)
                
                // Check cancellation again before async operation
                if (activation.cancelled) return
                
                if (pack) {
                    // Pack exists - use it as primary, with fallback to currently selected pack
                    if (!activation.cancelled) {
                        await audioManager.setActiveCustomPack(level.audioPackId)
                        audioManager.setFallbackPack(currentlySelectedPackId)
                    }
                } else {
                    // Pack doesn't exist - fall back to currently selected pack (or default)
                    console.warn(`Audio pack ${level.audioPackId} not found, using currently selected pack`)
                    if (!activation.cancelled) {
                        if (currentlySelectedPackId) {
                            await audioManager.setActiveCustomPack(currentlySelectedPackId)
                            audioManager.setFallbackPack(null) // Fallback to default
                        } else {
                            await audioManager.setActiveCustomPack(null) // Use default
                            audioManager.setFallbackPack(null)
                        }
                    }
                }
            } else {
                // No pack specified - use currently selected pack from Content Library
                if (!activation.cancelled) {
                    if (currentlySelectedPackId) {
                        await audioManager.setActiveCustomPack(currentlySelectedPackId)
                        audioManager.setFallbackPack(null) // Fallback to default
                    } else {
                        await audioManager.setActiveCustomPack(null) // Use default
                        audioManager.setFallbackPack(null)
                    }
                }
            }
            
            // Only clear if this is still the current activation
            if (activation === activationRef.current) {
                activationRef.current = null
            }
        }
    }

    const handleBeginLevel = () => {
        // Initialize the currentLevel with the selected level data
        setCurrentLevel({
            id: selectedLevel.id,
            status: 'idle',
            startTime: null,
            totalTime: 0,
            soft: selectedLevel?.soft ?? false,
            currentScore: 0,
            tasks: (selectedLevel.tasks || []).map(task => ({
                ...task,
                id: task.id || getRandomInt()
            })),
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
            <div className="grid-three">
                {levelManager.getAllLevels().map(level =>
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
