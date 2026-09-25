import React from 'react';
import { useState, useRef, useMemo, useEffect } from 'react';
import { DEBUG } from '../../App';
import Level from './Level';
import LevelPrerequisitesModal from './LevelPrerequisitesModal';
import { levelManager } from '../../services/levelManager';
import {
    evaluateLevelQualification,
    shouldEnforcePrerequisites,
} from '../../services/levelPrerequisiteService';
import { useSetAtom, useAtomValue } from 'jotai';
import {
    playerProfilesAtom,
    normalizePlayerProfilesState,
    getResolvedActiveProfileId,
} from '../../atoms/playerAtom';
import { customLevelFolderNamesAtom } from '../../atoms/customLevelFolderNamesAtom';
import {
    normalizeCustomSubfolder,
    customFolderDisplayLabel,
    getCustomSubfolderSlotsWithLevels,
    pickCustomLevelFolderNames,
} from '../../constants/customLevelFolders';
import { currentLevelAtom, levelRunGenerationAtom } from '../../atoms/taskAtom';
import { INITIAL_CAPTURE_SESSION, captureSessionAtom } from '../../atoms/captureAtom';
import { mergeLevelCaptureDefaults } from '../../constants/captureLevelDefaults';
import * as captureService from '../../services/captureService';
import { navAtom } from '../../atoms/navAtom';
import { feedbackAtom, activePackIdAtom, musicPlaybackSessionAtom } from '../../atoms/audioAtom';
import { store } from '../../store';
import * as NAV from '../../atoms/navAtom';
import { getRandomInt } from '../randomInt'
import { audioManager } from '../../services/audioManager';
import { storageService } from '../../services/storageService';
import { externalIntegrationService } from '../../services/externalIntegrationService';
import { resolveExternalAudioPackId } from '../../utils/externalVoicePackResolver';
import { warmAudioForPlay } from '../../services/preflightService';
import { TaskType } from '../Tasks/task';
import { showHiddenContentAtom } from '../../atoms/hiddenContentAtom';
import { isVisibleInUi, isHiddenRecord } from '../../utils/hiddenContentVisibility';

function buildRuntimeTasks(level) {
    return (level.tasks || []).map((task) => ({
        ...task,
        id: task.id || getRandomInt(),
    }))
}

const Training = () => {

    const [selectedLevel, setSelectedLevel] = useState(null)
    const [activeTab, setActiveTab] = useState('default')
    const [activeCustomSubfolder, setActiveCustomSubfolder] = useState(null)

    const showHiddenContent = useAtomValue(showHiddenContentAtom)
    const playerProfiles = useAtomValue(playerProfilesAtom)
    const folderNameSets = useAtomValue(customLevelFolderNamesAtom)

    const normalizedProfiles = useMemo(
        () => normalizePlayerProfilesState(playerProfiles),
        [playerProfiles]
    )
    const activeProfileId = getResolvedActiveProfileId(normalizedProfiles)
    const activeProfile = normalizedProfiles.profiles[activeProfileId]

    const [prereqModal, setPrereqModal] = useState(null)
    const displayFolderNames = useMemo(
        () => pickCustomLevelFolderNames(folderNameSets, showHiddenContent),
        [folderNameSets, showHiddenContent]
    )

    const defaultLevels = useMemo(() => levelManager.getDefaultLevels(), [])
    const allCustomLevels = levelManager.getCustomLevels()
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    const customLevels = allCustomLevels.filter((l) => isVisibleInUi(l, showHiddenContent))
    const showTabs = allCustomLevels.length > 0

    const folderIndicesWithLevels = useMemo(
        () => getCustomSubfolderSlotsWithLevels(customLevels),
        [customLevels]
    )

    const showSubfolderRow =
        activeTab === 'custom' &&
        customLevels.length > 0 &&
        folderIndicesWithLevels.length > 1

    const selectedCustomSubfolder = useMemo(() => {
        if (!showSubfolderRow) return null
        if (
            activeCustomSubfolder != null &&
            folderIndicesWithLevels.includes(activeCustomSubfolder)
        ) {
            return activeCustomSubfolder
        }
        return folderIndicesWithLevels[0]
    }, [showSubfolderRow, folderIndicesWithLevels, activeCustomSubfolder])

    const levelsToShow = useMemo(() => {
        if (activeTab === 'default') return defaultLevels
        if (!showSubfolderRow) return customLevels
        return customLevels.filter(
            (l) => normalizeCustomSubfolder(l.customSubfolder) === selectedCustomSubfolder
        )
    }, [activeTab, defaultLevels, customLevels, showSubfolderRow, selectedCustomSubfolder])

    const levelPrerequisiteQualified = useMemo(() => {
        const map = new Map()
        const enforce = shouldEnforcePrerequisites(activeProfile, showHiddenContent)
        if (!enforce) {
            levelsToShow.forEach((l) => map.set(l.id, true))
            return map
        }
        levelsToShow.forEach((level) => {
            map.set(
                level.id,
                evaluateLevelQualification(
                    activeProfile,
                    level.id,
                    showHiddenContent
                ).qualified
            )
        })
        return map
    }, [activeProfile, showHiddenContent, levelsToShow])

    const beginAllowed = useMemo(() => {
        if (!selectedLevel) return false
        if (!shouldEnforcePrerequisites(activeProfile, showHiddenContent)) return true
        return evaluateLevelQualification(
            activeProfile,
            selectedLevel.id,
            showHiddenContent
        ).qualified
    }, [selectedLevel, activeProfile, showHiddenContent])

    const handleTabChange = (tab) => {
        setActiveTab(tab)
        setSelectedLevel(null)
        selectedRuntimeTasksRef.current = null
        setPrereqModal(null)
    }

    const handleCustomSubfolderClick = (folderIndex) => {
        setActiveCustomSubfolder(folderIndex)
        setSelectedLevel(null)
        selectedRuntimeTasksRef.current = null
        setPrereqModal(null)
    }

    const subfolderButtonStyle = {
        fontSize: '0.82rem',
        padding: '5px 12px',
        margin: '0 4px',
    }
    const capturesPreflight = useMemo(() => {
        if (!selectedLevel) return { allowed: false }
        const def = levelManager.getLevel(selectedLevel.id) || selectedLevel
        return captureService.runCapturesPreflight(activeProfile, mergeLevelCaptureDefaults(def))
    }, [selectedLevel, activeProfile])

    const isPackagedCapture = captureService.isElectronPackaged()
    const setNav = useSetAtom(navAtom)
    const setCurrentLevel = useSetAtom(currentLevelAtom)
    const setFeedback = useSetAtom(feedbackAtom)
    const activationRef = useRef(null)
    /** Stable task ids between level select and Begin (warm-up cache keys must match). */
    const selectedRuntimeTasksRef = useRef(null)

    useEffect(() => {
        setSelectedLevel(null)
        selectedRuntimeTasksRef.current = null
        setPrereqModal(null)
    }, [activeProfileId])

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

    useEffect(() => {
        if (selectedLevel && isHiddenRecord(selectedLevel) && !showHiddenContent) {
            setSelectedLevel(null)
            selectedRuntimeTasksRef.current = null
        }
    }, [showHiddenContent, selectedLevel])

    const trySelectLevelRef = useRef(
        /** @type {null | ((level: object) => Promise<void>)} */ (null)
    )

    const applySelectLevel = async (level) => {
        if (activationRef.current) {
            activationRef.current.cancelled = true
        }
        activationRef.current = { cancelled: false }

        setSelectedLevel(level)
        store.set(captureSessionAtom, { ...INITIAL_CAPTURE_SESSION })
        const runtimeTasks = buildRuntimeTasks(level)
        selectedRuntimeTasksRef.current = { levelId: level.id, tasks: runtimeTasks }
        const mergedMeta = mergeLevelCaptureDefaults(levelManager.getLevel(level.id) || level)
        // Automatically set the current level when a level is selected
        setCurrentLevel({
            id: level.id,
            title: mergedMeta.title,
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
            metrics: {},
            capturesUserEnabled: false,
            chanceOfCapture: mergedMeta.chanceOfCapture,
            compoundingChance: mergedMeta.compoundingChance,
            captureCooldown: mergedMeta.captureCooldown,
            captureTypeBias: mergedMeta.captureTypeBias,
            captureOutput: mergedMeta.captureOutput,
            photoCaptureLimit: mergedMeta.photoCaptureLimit,
            videoCaptureLimit: mergedMeta.videoCaptureLimit,
            showStandbyInactiveIcons: mergedMeta.showStandbyInactiveIcons,
            allowsCaptures: mergedMeta.allowsCaptures,
            allowsHiddenCaptures: mergedMeta.allowsHiddenCaptures,
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

    const trySelectLevel = async (level) => {
        if (externalIntegrationService.isExternalMode()) {
            await applySelectLevel(level)
            return
        }
        if (!shouldEnforcePrerequisites(activeProfile, showHiddenContent)) {
            await applySelectLevel(level)
            return
        }
        const { qualified, requirements } = evaluateLevelQualification(
            activeProfile,
            level.id,
            showHiddenContent
        )
        if (qualified) {
            await applySelectLevel(level)
            return
        }
        setPrereqModal({
            open: true,
            targetTitle: level.title,
            requirements,
        })
    }

    trySelectLevelRef.current = trySelectLevel

    // Handle pre-loaded level from CLI (prerequisites skipped; same as prior behavior)
    useEffect(() => {
        const isExternalMode = externalIntegrationService.isExternalMode()
        if (!isExternalMode) return

        const levelId = externalIntegrationService.getLevelId()
        if (!levelId) return

        const level = levelManager.getLevel(levelId)
        if (level && trySelectLevelRef.current) {
            void trySelectLevelRef.current(level)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount for external mode
    }, [])

    const handleBeginLevel = async () => {
        if (!selectedLevel || !beginAllowed) return
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
        store.set(captureSessionAtom, { ...INITIAL_CAPTURE_SESSION })
        const mergedMeta = mergeLevelCaptureDefaults(
            levelManager.getLevel(selectedLevel.id) || selectedLevel
        )
        // Initialize the currentLevel with the selected level data
        setCurrentLevel({
            id: selectedLevel.id,
            title: mergedMeta.title,
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
            metrics: {},
            capturesUserEnabled: false,
            chanceOfCapture: mergedMeta.chanceOfCapture,
            compoundingChance: mergedMeta.compoundingChance,
            captureCooldown: mergedMeta.captureCooldown,
            captureTypeBias: mergedMeta.captureTypeBias,
            captureOutput: mergedMeta.captureOutput,
            photoCaptureLimit: mergedMeta.photoCaptureLimit,
            videoCaptureLimit: mergedMeta.videoCaptureLimit,
            showStandbyInactiveIcons: mergedMeta.showStandbyInactiveIcons,
            allowsCaptures: mergedMeta.allowsCaptures,
            allowsHiddenCaptures: mergedMeta.allowsHiddenCaptures,
        })
        store.set(levelRunGenerationAtom, (n) => n + 1)
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
            <h2 className="tab-title">Select a Level</h2>
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
            {showSubfolderRow && (
                <div className="row-centered margin-y-sm" style={{ flexWrap: 'wrap' }}>
                    {folderIndicesWithLevels.map((slot) => (
                        <button
                            key={slot}
                            type="button"
                            className={`button ${selectedCustomSubfolder === slot ? 'button-primary' : ''}`}
                            style={subfolderButtonStyle}
                            onClick={() => handleCustomSubfolderClick(slot)}
                        >
                            {customFolderDisplayLabel(displayFolderNames, slot)}
                        </button>
                    ))}
                </div>
            )}
            <div className="grid-three">
                {levelsToShow.map((level) => (
                    <Level
                        key={level.id}
                        isSelected={selectedLevel?.id === level.id}
                        level={level}
                        locked={!levelPrerequisiteQualified.get(level.id)}
                        onSelect={trySelectLevel}
                    />
                ))}
            </div>
            <LevelPrerequisitesModal
                open={!!prereqModal?.open}
                onClose={() => setPrereqModal(null)}
                targetTitle={prereqModal?.targetTitle ?? ''}
                requirements={prereqModal?.requirements ?? []}
            />
            <div className="row-centered margin-y">
                <button
                    className={`button padding-x margin-y ${selectedLevel && beginAllowed ? 'button-primary' : ''}`}
                    onClick={handleBeginLevel}
                    disabled={!selectedLevel || !beginAllowed}
                >
                    {selectedLevel ? `Begin Level ${selectedLevel.order}` : 'No level selected'}
                </button>
            </div>

            {isPackagedCapture &&
                capturesPreflight.allowed &&
                externalIntegrationService.isExternalMode() &&
                !externalIntegrationService.isAutoStartMode() && (
                <div className="row-centered margin-y-sm" style={{ fontSize: '0.9rem', maxWidth: 480 }}>
                    External mode: enable captures with the <code>--enable-captures</code> CLI flag (and optional{' '}
                    <code>--capture-output</code>).
                </div>
            )}

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
                                <li key={index} style={{ margin: '5px 0', padding: '5px', backgroundColor: index % 2 === 0 ? 'var(--surface-soft)' : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
