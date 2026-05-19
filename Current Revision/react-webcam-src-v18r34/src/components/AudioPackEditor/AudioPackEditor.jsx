import React, { useState, useEffect, useCallback } from 'react'
import { useAtomValue } from 'jotai'
import { audioManager } from '../../services/audioManager'
import { exportAudioPackToFile } from '../../services/audioPackExportService'
import { AUDIO } from '../Tasks/audio'
import { CUSTOM_VOICE_SLOT_KEYS } from '../../constants/customVoiceCategories'
import AudioCategoryEditor from './AudioCategoryEditor'
import { PackIdConflictError } from '../../services/audioManager'
import './AudioPackEditor.css'
import { showHiddenContentAtom } from '../../atoms/hiddenContentAtom'
import { withEditorSelectInjection } from '../../utils/hiddenContentVisibility'

const AudioPackEditor = () => {
    const showHiddenContent = useAtomValue(showHiddenContentAtom)
    const [pack, setPack] = useState({
        id: `pack-${Date.now()}`,
        name: '',
        author: '',
        version: '1.0.0',
        description: '',
        audioFiles: {},
        customNames: {}
    })
    const [isEditing, setIsEditing] = useState(false)
    const [existingPacks, setExistingPacks] = useState([])
    const [importError, setImportError] = useState(null)
    const [importWarnings, setImportWarnings] = useState([])

    const loadExistingPacks = useCallback(() => {
        const allPacks = audioManager.getAllPacks()
        const customPacks = Object.values(allPacks).filter((p) => !p.isDefault)
        const forSelect = withEditorSelectInjection(
            customPacks,
            isEditing ? pack.id : null,
            (p) => p.id,
            showHiddenContent
        )
        setExistingPacks(forSelect)
    }, [showHiddenContent, isEditing, pack.id])

    useEffect(() => {
        loadExistingPacks()
    }, [loadExistingPacks])

    const handleNewPack = () => {
        setPack({
            id: `pack-${Date.now()}`,
            name: '',
            author: '',
            version: '1.0.0',
            description: '',
            audioFiles: {},
            customNames: {}
        })
        setIsEditing(false)
        setImportError(null)
        setImportWarnings([])
    }

    const handleLoadPack = (packId) => {
        const loadedPack = audioManager.loadPack(packId)
        if (loadedPack) {
            setPack(loadedPack)
            setIsEditing(true)
            setImportError(null)
            setImportWarnings([])
        }
    }

    const handleSave = () => {
        if (!pack.name.trim()) {
            alert('Please enter a pack name')
            return
        }
        
        audioManager.savePack(pack)
        loadExistingPacks()
        alert('Pack saved successfully!')
    }

    const handleExport = async () => {
        if (!pack.id || !isEditing) {
            alert('Please save the pack first')
            return
        }

        try {
            const zipBlob = await audioManager.exportPack(pack.id)
            const fileName = `${pack.name || pack.id}.zip`

            const result = await exportAudioPackToFile(zipBlob, fileName)

            if (result.success) {
                if (result.blob) {
                    // Browser: trigger blob download
                    const url = URL.createObjectURL(result.blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = fileName
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(url)
                }
                alert('Pack exported successfully!')
            } else if (!result.canceled) {
                alert(`Export failed: ${result.error}`)
            }
        } catch (error) {
            alert(`Export failed: ${error.message}`)
        }
    }

    const handleImport = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        setImportError(null)
        setImportWarnings([])

        try {
            const result = await audioManager.importPack(file)
            
            if (result.warnings && result.warnings.length > 0) {
                setImportWarnings(result.warnings)
            }
            
            loadExistingPacks()
            setPack(result.pack)
            setIsEditing(true)
            alert('Pack imported successfully!')
        } catch (error) {
            if (error instanceof PackIdConflictError) {
                const overwrite = window.confirm(
                    `Pack "${error.existingName}" (ID: ${error.existingId}) already exists.\n\n` +
                    `Click OK to overwrite, or Cancel to cancel import.`
                )
                if (overwrite) {
                    try {
                        const result = await audioManager.importPack(file, { overwrite: true })
                        if (result.warnings && result.warnings.length > 0) {
                            setImportWarnings(result.warnings)
                        }
                        loadExistingPacks()
                        setPack(result.pack)
                        setIsEditing(true)
                        alert('Pack imported successfully!')
                    } catch (err) {
                        setImportError(err.message)
                    }
                }
            } else {
                setImportError(error.message)
            }
        } finally {
            e.target.value = ''
        }
    }

    const handleUpdateAudioFiles = (updater) => {
        setPack((prev) => ({
            ...prev,
            audioFiles: updater(prev.audioFiles),
        }))
    }

    const handleUpdateCustomNames = (updated) => {
        setPack(prev => ({ ...prev, customNames: updated }))
    }

    // Define category groups with headings
    const categoryGroups = [
        {
            heading: 'Baseline',
            categories: ['Sfx', 'Calibration']
        },
        {
            heading: 'Session Start',
            categories: ['Level', 'Lvl_begint', 'Lvl_quickbg', 'Lvl_basicr', 'Lvl_cockw']
        },
        {
            heading: 'Task Assignment',
            categories: ['Warmup', 'Hit', 'UpDown', 'Hold', 'Clap', 'Rest', 'HoldAndClap', 'Speak', 'Endless']
        },
        {
            heading: 'Performance',
            categories: ['Feedback', 'Task']
        },
        {
            heading: 'Session End',
            categories: ['Release', 'Finish']
        },
        {
            heading: 'Session Summary',
            categories: ['Rank']
        },
        {
            heading: 'Custom',
            categories: ['Custom']
        }
    ]

    // Get all categories from default AUDIO (include Custom so it is not filtered out)
    const allCategories = [
        ...Object.keys(AUDIO).filter(key => typeof AUDIO[key] === 'object' && AUDIO[key] !== null),
        'Custom'
    ]
    
    // Process groups: filter to only include categories that exist in default AUDIO
    const processedGroups = categoryGroups.map(group => ({
        ...group,
        categories: group.categories.filter(cat => allCategories.includes(cat))
    })).filter(group => group.categories.length > 0)

    return (
        <div className="audio-pack-editor">
            <h2>Voice Pack Editor</h2>
            
            <div className="editor-controls" style={{ marginBottom: '20px' }}>
                <button className="button" onClick={handleNewPack}>New Pack</button>
                <button
                    className={`button${pack.name.trim() ? ' button-primary' : ''}`}
                    onClick={handleSave}
                    disabled={!pack.name.trim()}
                >
                    Save Pack
                </button>
                <button className="button" onClick={handleExport} disabled={!isEditing}>Export Pack</button>
                <label className="button" style={{ cursor: 'pointer' }}>
                    Import Pack
                    <input
                        type="file"
                        accept=".zip"
                        onChange={handleImport}
                        style={{ display: 'none' }}
                    />
                </label>
            </div>

            {importError && (
                <div style={{ padding: '12px', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '4px', marginBottom: '12px' }}>
                    <strong>Import Error:</strong> {importError}
                </div>
            )}

            {importWarnings.length > 0 && (
                <div style={{ padding: '12px', backgroundColor: '#fff3e0', color: '#e65100', borderRadius: '4px', marginBottom: '12px' }}>
                    <strong>Import Warnings:</strong>
                    <ul style={{ marginTop: '8px', marginBottom: 0 }}>
                        {importWarnings.map((warning, index) => (
                            <li key={index}>{warning}</li>
                        ))}
                    </ul>
                </div>
            )}

            {existingPacks.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                    <h3>Load Existing Pack:</h3>
                    <select
                        className="select"
                        value=""
                        onChange={(e) => {
                            if (e.target.value) {
                                handleLoadPack(e.target.value)
                            }
                        }}
                    >
                        <option value="">Select a pack...</option>
                        {existingPacks.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                        ))}
                    </select>
                </div>
            )}

            <div className="pack-metadata" style={{ marginBottom: '20px' }}>
                <h3>Pack Metadata</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                        <label>Pack ID:</label>
                        <input
                            type="text"
                            value={pack.id}
                            onChange={(e) => setPack({ ...pack, id: e.target.value })}
                            disabled={isEditing}
                            style={{ width: '100%', padding: '8px' }}
                        />
                    </div>
                    <div>
                        <label>Pack Name:</label>
                        <input
                            type="text"
                            value={pack.name}
                            onChange={(e) => setPack({ ...pack, name: e.target.value })}
                            style={{ width: '100%', padding: '8px' }}
                        />
                    </div>
                    <div>
                        <label>Author:</label>
                        <input
                            type="text"
                            value={pack.author}
                            onChange={(e) => setPack({ ...pack, author: e.target.value })}
                            style={{ width: '100%', padding: '8px' }}
                        />
                    </div>
                    <div>
                        <label>Version:</label>
                        <input
                            type="text"
                            value={pack.version}
                            onChange={(e) => setPack({ ...pack, version: e.target.value })}
                            style={{ width: '100%', padding: '8px' }}
                        />
                    </div>
                </div>
                <div style={{ marginTop: '12px' }}>
                    <label>Description:</label>
                    <textarea
                        value={pack.description}
                        onChange={(e) => setPack({ ...pack, description: e.target.value })}
                        style={{ width: '100%', padding: '8px', minHeight: '80px' }}
                    />
                </div>
                {showHiddenContent && isEditing && (
                    <div style={{ marginTop: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={pack.hidden === true}
                                onChange={(e) => setPack({ ...pack, hidden: e.target.checked })}
                            />
                            Hidden
                        </label>
                    </div>
                )}
            </div>

            <div className="audio-categories">
                <h3>Audio Files by Category</h3>
                {processedGroups.map((group, groupIndex) => (
                    <div key={group.heading} className="category-group">
                        <h4 className="category-group-heading">{group.heading}</h4>
                        {group.categories.map(category => {
                            const keys = category === 'Custom' ? CUSTOM_VOICE_SLOT_KEYS : Object.keys(AUDIO[category] || {})
                            return (
                                <AudioCategoryEditor
                                    key={category}
                                    packId={pack.id}
                                    category={category}
                                    keys={keys}
                                    audioFiles={pack.audioFiles}
                                    onUpdate={handleUpdateAudioFiles}
                                    {...(category === 'Custom' && {
                                        customNames: pack.customNames || {},
                                        onCustomNamesUpdate: handleUpdateCustomNames
                                    })}
                                />
                            )
                        })}
                    </div>
                ))}
            </div>
        </div>
    )
}

export default AudioPackEditor
