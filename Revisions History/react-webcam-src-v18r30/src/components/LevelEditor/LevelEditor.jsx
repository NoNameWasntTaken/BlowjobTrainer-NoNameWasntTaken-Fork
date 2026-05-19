import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useSetAtom, useAtom, useAtomValue } from 'jotai'
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
import { normalizePrerequisiteRules } from '../../utils/levelPrerequisitesUtils'
import { Rank } from '../../atoms/taskAtom'
import {
    CUSTOM_SUBFOLDER_COUNT,
    normalizeCustomSubfolder,
    customFolderDisplayLabel,
    pickCustomLevelFolderNames,
} from '../../constants/customLevelFolders'
import { customLevelFolderNamesAtom } from '../../atoms/customLevelFolderNamesAtom'

/**
 * "Custom Level Subfolder Names" slot list — same layout pattern as Session Summary Voice
 * (see SummaryAudioEditor.jsx: margin-y-sm wrapper, flex column gap 10px, maxWidth, paddingLeft 6rem).
 * Adjust gaps here for spacing between rows / within a row.
 */
const SUBFOLDER_NAMES_SLOT_COLUMN_GAP_PX = 6
const SUBFOLDER_NAMES_SLOT_ROW_LABEL_GAP_PX = 4

/**
 * LevelEditor - Main component for creating and editing custom levels
 */
const LevelEditor = () => {
    const setNav = useSetAtom(navAtom)
    const showHiddenContent = useAtomValue(showHiddenContentAtom)
    const [folderNameSets, setFolderNameSets] = useAtom(customLevelFolderNamesAtom)
    const activeFolderRow = useMemo(
        () => pickCustomLevelFolderNames(folderNameSets, showHiddenContent),
        [folderNameSets, showHiddenContent]
    )

    /** Which name row is edited in the folder UI (matches Training / subfolder select). */
    const folderNamesEditRow = showHiddenContent ? 'revealed' : 'concealed'

    const setFolderNameSlot = (index, value) => {
        const rowKey = showHiddenContent ? 'revealed' : 'concealed'
        setFolderNameSets((prev) => {
            const nextRow = [...prev[rowKey]]
            nextRow[index] = value
            return { ...prev, [rowKey]: nextRow }
        })
    }
    const [level, setLevel] = useState({
        id: `custom-${Date.now()}`,
        order: 1,
        title: '',
        description: '',
        image: 'https://via.placeholder.com/200',
        tasks: [],
        summaryAudio: { ...DEFAULT_EDITOR_SUMMARY_AUDIO },
        hidden: false,
        customSubfolder: 1,
        prerequisites: [],
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
            const exists = (id) => levelManager.getLevel(id) != null
            const normalizedPrereqs = normalizePrerequisiteRules(
                loadedLevel.id,
                loadedLevel.prerequisites || [],
                exists
            )
            setLevel({
                ...loadedLevel,
                tasks: loadedLevel.tasks || [],
                summaryAudio: normalizeEditorSummaryAudioOnLoad(loadedLevel.summaryAudio),
                hidden: loadedLevel.hidden === true,
                customSubfolder: normalizeCustomSubfolder(loadedLevel.customSubfolder),
                prerequisites: normalizedPrereqs,
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
            customSubfolder: 1,
            prerequisites: [],
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
                    const impId = importedLevel.id || `custom-${Date.now()}`
                    const existsImp = (id) => levelManager.getLevel(id) != null
                    const normalizedImpPrereqs = normalizePrerequisiteRules(
                        impId,
                        importedLevel.prerequisites || [],
                        existsImp
                    )
                    setLevel({
                        ...importedLevel,
                        id: impId,
                        tasks: importedLevel.tasks || [],
                        summaryAudio: normalizeEditorSummaryAudioOnLoad(importedLevel.summaryAudio),
                        customSubfolder: normalizeCustomSubfolder(importedLevel.customSubfolder),
                        prerequisites: normalizedImpPrereqs,
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

    const PREREQ_RANK_OPTIONS = [
        { value: Rank.APPRENTICE, label: 'Pass' },
        { value: Rank.JOURNEYMAN, label: 'Good' },
        { value: Rank.MASTER, label: 'Perfect' },
    ]

    const prerequisiteSourceLevels = useMemo(() => {
        const defs = levelManager.getDefaultLevels()
        const customs = existingLevels
            .filter((c) => c.id !== level.id)
            .sort((a, b) => {
                const oa = a.order ?? 999
                const ob = b.order ?? 999
                if (oa !== ob) return oa - ob
                return String(a.id).localeCompare(String(b.id))
            })
        return [...defs, ...customs]
    }, [level.id, existingLevels])

    const canAddPrerequisite = useMemo(() => {
        const selected = new Set(
            (level.prerequisites || [])
                .map((r) => r.levelId)
                .filter(Boolean)
        )
        return prerequisiteSourceLevels.some((l) => !selected.has(l.id))
    }, [level.prerequisites, prerequisiteSourceLevels])

    const handleAddPrerequisite = () => {
        setLevel((prev) => ({
            ...prev,
            prerequisites: [
                ...(prev.prerequisites || []),
                { levelId: '', minRank: Rank.APPRENTICE },
            ],
        }))
    }

    const handleRemovePrerequisite = (index) => {
        setLevel((prev) => ({
            ...prev,
            prerequisites: (prev.prerequisites || []).filter((_, i) => i !== index),
        }))
    }

    const handlePrerequisiteLevelChange = (index, levelId) => {
        setLevel((prev) => {
            const rows = prev.prerequisites || []
            if (!rows[index]) return prev
            if (levelId) {
                const takenElsewhere = rows.some(
                    (r, i) => i !== index && r.levelId === levelId
                )
                if (takenElsewhere) return prev
            }
            const next = [...rows]
            next[index] = { ...next[index], levelId }
            return { ...prev, prerequisites: next }
        })
    }

    const handlePrerequisiteRankChange = (index, minRank) => {
        setLevel((prev) => {
            const next = [...(prev.prerequisites || [])]
            if (!next[index]) return prev
            next[index] = { ...next[index], minRank: Number(minRank) }
            return { ...prev, prerequisites: next }
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

                        <div className='margin-y-sm'>
                            <p className='margin-y-sm'>Custom subfolder:</p>
                            <select
                                value={normalizeCustomSubfolder(level.customSubfolder)}
                                onChange={(e) =>
                                    setLevel({
                                        ...level,
                                        customSubfolder: Number(e.target.value),
                                    })
                                }
                            >
                                {Array.from({ length: CUSTOM_SUBFOLDER_COUNT }, (_, i) => i + 1).map((slot) => (
                                    <option key={slot} value={slot}>
                                        {customFolderDisplayLabel(activeFolderRow, slot)}
                                    </option>
                                ))}
                            </select>
                            <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
                                Labels match your folder names for the current hidden-content mode
                                (concealed vs visible).
                            </small>
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

                    <div className='border-grey margin-y padding-x padding-y-md'>
                        <h3>Prerequisites</h3>
                        <p
                            className="margin-y-sm"
                            style={{ color: '#666', fontSize: '13px', maxWidth: '40rem' }}
                        >
                            Optional. Leave empty for this level to be accessible immediately. <br></br>
                            Each other level can appear at most once (one minimum rank per level). <br></br>
                            Levels cannot include themselves as requirements, and cannot include cycles (A requires B, and B requires A).
                        </p>
                        {(level.prerequisites || []).map((row, index) => {
                            const usedByOtherRows = new Set(
                                (level.prerequisites || [])
                                    .map((r, i) =>
                                        i !== index && r.levelId ? r.levelId : null
                                    )
                                    .filter(Boolean)
                            )
                            const candidates = prerequisiteSourceLevels.filter(
                                (l) =>
                                    l.id === row.levelId || !usedByOtherRows.has(l.id)
                            )
                            const rowOptions = withEditorSelectInjection(
                                candidates,
                                row.levelId || null,
                                (l) => l.id,
                                showHiddenContent
                            )
                            return (
                                <div
                                    key={index}
                                    className="margin-y-sm"
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                        gap: '6px',
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: '8px',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: '2.0rem',
                                                minWidth: '1.3rem',
                                                flexShrink: 0,
                                                color: '#444',
                                            }}
                                        >
                                            {index + 1}:
                                        </span>
                                        <select
                                            className="button"
                                            value={row.levelId}
                                            onChange={(e) =>
                                                handlePrerequisiteLevelChange(index, e.target.value)
                                            }
                                            style={{
                                                minWidth: '22.5rem',
                                                maxWidth: 'min(28rem, 100%)',
                                                width: '15rem',
                                                boxSizing: 'border-box',
                                                fontSize: '0.85rem',
                                                padding: '5px 8px',
                                                textAlign: 'left',
                                            }}
                                        >
                                            <option value="">Select level…</option>
                                            {rowOptions.map((l) => (
                                                <option key={l.id} value={l.id}>
                                                {levelManager.isDefaultLevel(l.id)
                                                    ? `Default: ${l.title}`
                                                    : l.title}
                                                </option>
                                            ))}
                                        </select>
                                        <select
                                            className="button"
                                            value={row.minRank}
                                            onChange={(e) =>
                                                handlePrerequisiteRankChange(index, e.target.value)
                                            }
                                            style={{
                                                minWidth: '10.5rem',
                                                maxWidth: 'min(22rem, 100%)',
                                                width: '10.5rem',
                                                boxSizing: 'border-box',
                                                fontSize: '0.85rem',
                                                padding: '5px 8px',
                                                textAlign: 'left',
                                            }}
                                        >
                                            {PREREQ_RANK_OPTIONS.map((o) => (
                                                <option key={o.value} value={o.value}>
                                                    {o.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        type="button"
                                        className="button"
                                        onClick={() => handleRemovePrerequisite(index)}
                                        style={{
                                            fontSize: '0.85rem',
                                            padding: '4px 10px',
                                            lineHeight: 1.2,
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            )
                        })}
                        <button
                            type="button"
                            className="button margin-y-sm"
                            onClick={handleAddPrerequisite}
                            disabled={!canAddPrerequisite}
                            title={
                                canAddPrerequisite
                                    ? undefined
                                    : 'Every available level is already listed as a prerequisite.'
                            }
                        >
                            Add prerequisite
                        </button>
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

            <div
                className="border-grey margin-y padding-x padding-y-md"
                style={{ marginTop: '5rem' }}
            >
                <h3>Custom Level Subfolder Names</h3>
                <p className="margin-y-sm" style={{ color: '#666', fontSize: '13px', maxWidth: '48rem' }}>
                    Global labels for the five Training subfolders (folders 1–5). Use these to categorize custom levels to your liking.
                </p>
                <p
                    style={{
                        fontWeight: 600,
                        margin: '12px 0 8px',
                        fontSize: '0.9rem',
                        color: '#444',
                    }}
                >
                    {showHiddenContent
                        ? 'Subfolders have unique names when hidden content is visible, to avoid giving away the presence of hidden levels.'
                        : ''}
                </p>
                <p></p>
                <div
                    className="margin-y-sm"
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: `${SUBFOLDER_NAMES_SLOT_COLUMN_GAP_PX}px`,
                        alignItems: 'stretch',
                        maxWidth: 'min(100%, 58rem)',
                        paddingLeft: '6rem',
                    }}
                >
                    {Array.from({ length: CUSTOM_SUBFOLDER_COUNT }, (_, i) => (
                        <div
                            key={`folder-slot-${i}`}
                            style={{
                                display: 'flex',
                                justifyContent: 'flex-start',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: `${SUBFOLDER_NAMES_SLOT_ROW_LABEL_GAP_PX}px`,
                            }}
                        >
                            <label
                                htmlFor={`custom-subfolder-name-folder-${i + 1}`}
                                style={{
                                    minWidth: '5.5rem',
                                    fontSize: '14px',
                                    lineHeight: 1.2,
                                    margin: 0,
                                    cursor: 'default',
                                }}
                            >
                                Folder {i + 1}:
                            </label>
                            <input
                                id={`custom-subfolder-name-folder-${i + 1}`}
                                type="text"
                                className="button"
                                style={{
                                    flex: '1 1 200px',
                                    minWidth: '160px',
                                    maxWidth: '28rem',
                                    textAlign: 'left',
                                    boxSizing: 'border-box',
                                    margin: 0,
                                }}
                                value={folderNameSets[folderNamesEditRow][i] ?? ''}
                                onChange={(e) => setFolderNameSlot(i, e.target.value)}
                                aria-label={`Custom level folder ${i + 1} name (${folderNamesEditRow})`}
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div className='margin-y-lg'>

            </div>
        </>
    )
}

export default LevelEditor

