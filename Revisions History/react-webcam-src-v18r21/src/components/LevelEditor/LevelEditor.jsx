import React, { useState, useEffect, useCallback } from 'react'
import { useSetAtom, useAtomValue } from 'jotai'
import { navAtom } from '../../atoms/navAtom'
import * as NAV from '../../atoms/navAtom'
import { levelManager } from '../../services/levelManager'
import { audioManager } from '../../services/audioManager'
import { musicTrackManager } from '../../services/musicTrackManager'
import { levelDifficultyService } from '../../services/levelDifficultyService'
import { calculateLevelDuration } from '../Tasks/task'
import TaskBuilder from './TaskBuilder'
import SummaryAudioEditor from './SummaryAudioEditor'
import { DEFAULT_EDITOR_SUMMARY_AUDIO, normalizeEditorSummaryAudioOnLoad } from './taskAudioConfig'
import NumberControl from '../NumberControl'
import Level from '../Training/Level'
import { showHiddenContentAtom } from '../../atoms/hiddenContentAtom'
import { isVisibleInUi, withEditorSelectInjection } from '../../utils/hiddenContentVisibility'

/**
 * LevelEditor - Main component for creating and editing custom levels
 */
const LevelEditor = () => {
    const setNav = useSetAtom(navAtom)
    const showHiddenContent = useAtomValue(showHiddenContentAtom)
    const [level, setLevel] = useState({
        id: `custom-${Date.now()}`,
        order: 1,
        title: '',
        description: '',
        image: 'https://via.placeholder.com/200',
        tasks: [],
        summaryAudio: { ...DEFAULT_EDITOR_SUMMARY_AUDIO },
        hidden: false,
    })
    const [audioPackId, setAudioPackId] = useState(null)
    /** '' = none, 'use_selected', or a concrete track id */
    const [backgroundMusicId, setBackgroundMusicId] = useState('')
    const [isEditing, setIsEditing] = useState(false)
    const [existingLevels, setExistingLevels] = useState([])

    const refreshExistingLevels = useCallback(() => {
        const sorted = levelManager.getCustomLevels()
            .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
        setExistingLevels(sorted.filter((l) => isVisibleInUi(l, showHiddenContent)))
    }, [showHiddenContent])

    useEffect(() => {
        refreshExistingLevels()
    }, [refreshExistingLevels])

    const handleLoadLevel = (levelId) => {
        const loadedLevel = levelManager.getLevel(levelId)
        if (loadedLevel) {
            setLevel({
                ...loadedLevel,
                tasks: loadedLevel.tasks || [],
                summaryAudio: normalizeEditorSummaryAudioOnLoad(loadedLevel.summaryAudio),
                hidden: loadedLevel.hidden === true,
            })
            setAudioPackId(loadedLevel.audioPackId || null)
            const bg = loadedLevel.backgroundMusicId
            if (bg === 'use_selected') setBackgroundMusicId('use_selected')
            else if (bg && bg !== '') setBackgroundMusicId(bg)
            else setBackgroundMusicId('')
            setIsEditing(true)
        }
    }

    const handleNewLevel = () => {
        setLevel({
            id: `custom-${Date.now()}`,
            order: 1,
            title: '',
            description: '',
            image: 'https://via.placeholder.com/200',
            tasks: [],
            summaryAudio: { ...DEFAULT_EDITOR_SUMMARY_AUDIO },
            hidden: false,
        })
        setBackgroundMusicId('')
        setIsEditing(false)
    }

    const handleSave = () => {
        if (!level.id || !level.title) {
            alert('Please provide a level ID and title')
            return
        }

        if (level.tasks.length === 0) {
            alert('Please add at least one task')
            return
        }

        try {
            const levelToSave = {
                ...level,
                audioPackId: audioPackId || undefined
            }
            if (backgroundMusicId === 'use_selected') {
                levelToSave.backgroundMusicId = 'use_selected'
            } else if (backgroundMusicId && backgroundMusicId !== '') {
                levelToSave.backgroundMusicId = backgroundMusicId
            } else {
                delete levelToSave.backgroundMusicId
            }
            levelManager.saveLevel(levelToSave)
            alert('Level saved successfully!')

            // Refresh existing levels list (sorted by level number)
            refreshExistingLevels()
            setIsEditing(true)
        } catch (error) {
            alert(`Error saving level: ${error.message}`)
        }
    }

    const handleExport = () => {
        if (!level.id) {
            alert('Please save the level first')
            return
        }

        const exportData = {
            format: 'level-v1',
            level: {
                ...level,
                audioPackId: audioPackId || undefined,
                ...(backgroundMusicId === 'use_selected'
                    ? { backgroundMusicId: 'use_selected' }
                    : backgroundMusicId && backgroundMusicId !== ''
                        ? { backgroundMusicId }
                        : {})
            }
        }

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${level.title.replace(/\s+/g, '-')}-level.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    const handleImport = (event) => {
        const file = event.target.files[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const importData = JSON.parse(e.target.result)
                if (importData.format === 'level-v1' && importData.level) {
                    const importedLevel = importData.level
                    setLevel({
                        ...importedLevel,
                        tasks: importedLevel.tasks || [],
                        summaryAudio: normalizeEditorSummaryAudioOnLoad(importedLevel.summaryAudio),
                    })
                    setAudioPackId(importedLevel.audioPackId || null)
                    const bg = importedLevel.backgroundMusicId
                    if (bg === 'use_selected') setBackgroundMusicId('use_selected')
                    else if (bg && bg !== '') setBackgroundMusicId(bg)
                    else setBackgroundMusicId('')
                    setIsEditing(false) // Treat as new level (will get new ID on save)
                    alert('Level imported successfully!')
                } else {
                    alert('Invalid level file format')
                }
            } catch (error) {
                alert(`Error importing level: ${error.message}`)
            }
        }
        reader.readAsText(file)
    }

    const handleDelete = () => {
        if (!isEditing) {
            alert('This level is not saved yet')
            return
        }

        if (window.confirm(`Are you sure you want to delete "${level.title}"?`)) {
            try {
                levelManager.deleteLevel(level.id)
                alert('Level deleted')
                handleNewLevel()

                // Refresh existing levels list
                refreshExistingLevels()
            } catch (error) {
                alert(`Error deleting level: ${error.message}`)
            }
        }
    }

    const handleSummaryRankChange = (rankKey, value) => {
        setLevel((prev) => {
            const nextSummary = { ...(prev.summaryAudio || {}) }
            if (value == null || value === '') {
                delete nextSummary[rankKey]
            } else {
                nextSummary[rankKey] = value
            }
            const keys = Object.keys(nextSummary)
            return {
                ...prev,
                summaryAudio: keys.length > 0 ? nextSummary : undefined,
            }
        })
    }

    const handleSummaryShowCustomChange = (rankKey, checked) => {
        setLevel((prev) => {
            const next = { ...(prev.summaryAudioShowCustom || {}) }
            if (checked) {
                next[rankKey] = true
            } else {
                delete next[rankKey]
            }
            const keys = Object.keys(next)
            return {
                ...prev,
                summaryAudioShowCustom: keys.length > 0 ? next : undefined,
            }
        })
    }

    const estimatedDuration = level.tasks.length > 0
        ? calculateLevelDuration(level.tasks, true)
        : '0 min'

    const availablePacks = audioManager.getAllPacks()
    const allMusicTracks = Object.values(musicTrackManager.getAllTracks())
    const customPackList = Object.values(availablePacks).filter((pack) => !pack.isDefault)
    const packOptionsForSelect = withEditorSelectInjection(
        customPackList,
        audioPackId,
        (p) => p.id,
        showHiddenContent
    )
    const bgSelectId =
        backgroundMusicId && backgroundMusicId !== '' && backgroundMusicId !== 'use_selected'
            ? backgroundMusicId
            : null
    const trackOptionsForSelect = withEditorSelectInjection(
        allMusicTracks,
        bgSelectId,
        (t) => t.id,
        showHiddenContent
    )
    const resolvedBgTrack =
        backgroundMusicId && backgroundMusicId !== '' && backgroundMusicId !== 'use_selected'
            ? musicTrackManager.getTrack(backgroundMusicId)
            : null
    const backgroundMusicHelpMessage =
        backgroundMusicId === ''
            ? 'Ignores the Content Library and plays no background track for this level.'
            : backgroundMusicId === 'use_selected'
                ? 'Uses the background track currently selected in the Content Library.'
                : resolvedBgTrack
                    ? `Uses this specified background track for this level.`
                    : 'Uses this specified background track for this level.'

    return (
        <>
            <div className="row-space-between margin-y">
                <h2>Level Editor</h2>
                <button
                    className="button padding-x"
                    onClick={() => setNav(NAV.TRAINING)}
                >
                    ← Back to Training
                </button>
            </div>

            {/* Existing Levels */}
            {existingLevels.length > 0 && (
                <div className="margin-y padding-x padding-y-md">
                    <h6>Load Existing Level</h6>
                    <select
                        onChange={(e) => e.target.value && handleLoadLevel(e.target.value)}
                    >
                        <option value="">Select a level to edit...</option>
                        {existingLevels.map(l => (
                            <option key={l.id} value={l.id}>
                                {l.title} (Level: {l.order})
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Actions */}
            <div className="row flex-wrap margin-y-sm" >
                <button className="button padding-x margin-x" onClick={handleNewLevel}>
                    Create New
                </button>
                <button className="button button-primary padding-x margin-x" onClick={handleSave}>
                    Save Level
                </button>
                <button className="button padding-x margin-x" onClick={handleExport}>
                    Export Level File
                </button>
                <label className="button padding-x margin-x" style={{ cursor: 'pointer', margin: 0 }}>
                    Import Level File
                    <input
                        type="file"
                        accept=".json"
                        onChange={handleImport}
                        style={{ display: 'none' }}
                    />
                </label>
                {isEditing && (
                    <button className="button button-warning padding-x margin-x" onClick={handleDelete}>
                        Delete
                    </button>
                )}
            </div>
            <div className='margin-y-sm'>
                <p className='margin-y-sm'>Saving a level stores it in your local storage.  For a proper backup, export the file. </p>
            </div>

            <div className='grid-two' >
                {/* Left Column: Level Metadata */}
                <div>
                    <div className='border-grey margin-y padding-x padding-y-md'>
                        <h3>Level Metadata</h3>

                        <div className='margin-y-sm'>
                            <p className='margin-y-sm'>Title:</p>
                            <input
                                type="text"
                                value={level.title}
                                onChange={(e) => setLevel({ ...level, title: e.target.value })}
                                placeholder="My Custom Level"
                            />
                        </div>

                        <div className='margin-y-sm'>
                            <p className='margin-y-sm'>Description:</p>
                            <input
                                value={level.description}
                                onChange={(e) => setLevel({ ...level, description: e.target.value })}
                                placeholder="A custom training level..."
                            />
                        </div>

                        {/* Hide the level id - this just needs to be a unique id */}
                        {/* <div className='margin-y-sm'>
                            <p className='margin-y-sm'>Level Id:</p>
                            <input
                                type="text"
                                value={level.id}
                                onChange={(e) => setLevel({ ...level, id: e.target.value })}
                                disabled={isEditing}
                                placeholder="custom-level-1"
                            />
                            {isEditing && <small style={{ color: '#666' }}>ID cannot be changed after saving</small>}
                        </div> */}

                        <div className='margin-y-sm' style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-block' }}>
                                <NumberControl
                                    label="Level Number"
                                    value={level.order}
                                    setValue={(fn) => setLevel((prevLevel) => ({ ...prevLevel, order: fn(prevLevel.order) }))}
                                    min={0}
                                    step={1}
                                />
                            </div>
                        </div>

                        <div className='margin-y-sm' style={{ textAlign: 'center' }}>
                            <p className='margin-y-sm'>Difficulty: {levelDifficultyService.getDifficulty(level)}</p>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                <input
                                    type="checkbox"
                                    checked={!!level.useDifficultyOverride}
                                    onChange={(e) => setLevel({ ...level, useDifficultyOverride: e.target.checked })}
                                />
                                Override Difficulty
                            </label>
                            {level.useDifficultyOverride && (
                                <div style={{ marginTop: '8px' }}>
                                    <NumberControl
                                        label="Difficulty Override"
                                        value={level.difficultyOverride ?? 1}
                                        setValue={(fn) => setLevel(prev => ({
                                            ...prev,
                                            difficultyOverride: fn(prev.difficultyOverride ?? 1)
                                        }))}
                                        min={1}
                                        max={11}
                                        step={0.5}
                                    />
                                </div>
                            )}
                        </div>

                        <div className='margin-y-sm'>
                            <p className='margin-y-sm'>Voice Pack:</p>
                            <select
                                value={audioPackId || ''}
                                onChange={(e) => setAudioPackId(e.target.value || null)}
                            >
                                <option value="">Use Selected Voice in Library</option>
                                {packOptionsForSelect.map((pack) => (
                                    <option key={pack.id} value={pack.id}>
                                        {pack.name}
                                    </option>
                                ))}
                            </select>
                            <small style={{ color: '#666' }}>
                                {audioPackId 
                                    ? 'Uses this specified voice pack for this level.'
                                    : 'Uses the voice pack currently selected in the Content Library.'}
                            </small>
                        </div>

                        <div className='margin-y-sm'>
                            <p className='margin-y-sm'>Background Music:</p>
                            <select
                                value={backgroundMusicId === '' ? '' : backgroundMusicId}
                                onChange={(e) => setBackgroundMusicId(e.target.value)}
                            >
                                <option value="">None</option>
                                <option value="use_selected">Use Selected Track in Library</option>
                                {trackOptionsForSelect.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.name || t.id}
                                    </option>
                                ))}
                            </select>
                            <small style={{ color: '#666' }}>
                                {backgroundMusicHelpMessage}
                            </small>
                        </div>

                        {showHiddenContent && isEditing && (
                            <div className='margin-y-sm' style={{ textAlign: 'center' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                    <input
                                        type="checkbox"
                                        checked={level.hidden === true}
                                        onChange={(e) => setLevel({ ...level, hidden: e.target.checked })}
                                    />
                                    Hidden
                                </label>
                            </div>
                        )}
                    </div>


                </div>

                {/* Right Column: Preview */}
                <div>
                    <div className='border-grey margin-y padding-x padding-y-md'>
                        <h3>Preview</h3>
                        <p><strong>Level ID:</strong> <code style={{ fontFamily: 'monospace', backgroundColor: '#f5f5f5', padding: '2px 6px', borderRadius: '3px' }}>{level.id || 'Not set'}</code></p>
                        <p><strong>Estimated Duration:</strong> {estimatedDuration}</p>
                        <p><strong>Number of Tasks:</strong> {level.tasks.length}</p>
                    </div>

                    <div className='margin-y'>
                        <Level
                            level={level}
                            isSelected={false}
                            onSelect={() => { }}
                        />
                    </div>
                </div>
            </div>

            {/* Task Builder - Full Width */}
            <div>
                <TaskBuilder
                    tasks={level.tasks}
                    onChange={(tasks) => setLevel({ ...level, tasks })}
                    audioPackId={audioPackId}
                />
            </div>

            <div style={{ marginTop: '5rem' }}>
                <SummaryAudioEditor
                    summaryAudio={level.summaryAudio}
                    summaryAudioShowCustom={level.summaryAudioShowCustom}
                    onRankChange={handleSummaryRankChange}
                    onShowCustomChange={handleSummaryShowCustomChange}
                    audioPackId={audioPackId}
                />
            </div>

            <div className='margin-y-lg'>

            </div>
        </>
    )
}

export default LevelEditor

