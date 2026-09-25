import React, { useState, useEffect, useCallback } from 'react'
import { useAtomValue } from 'jotai'
import { audioManager } from '../../services/audioManager'
import { exportAudioPackToFile } from '../../services/audioPackExportService'
import { AUDIO } from '../Tasks/audio'
import { CUSTOM_VOICE_SLOT_KEYS } from '../../constants/customVoiceCategories'
import AudioCategoryEditor from './AudioCategoryEditor'
import GenerateLines from './GenerateLines'
import { PackIdConflictError } from '../../services/audioManager'
import './AudioPackEditor.css'
import { showHiddenContentAtom } from '../../atoms/hiddenContentAtom'
import { voiceIdAtom } from '../../atoms/elevenlabsAtom'
import { withEditorSelectInjection } from '../../utils/hiddenContentVisibility'
import { getProcessedCategoryGroups } from '../../constants/audioCategoryGroups'

const AudioPackEditor = () => {
    const showHiddenContent = useAtomValue(showHiddenContentAtom)
    const voiceId = useAtomValue(voiceIdAtom)
    const [activeSubtab, setActiveSubtab] = useState('categories')
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
        
        const packToSave = {
            ...pack,
            elevenLabsVoiceId: voiceId || pack.elevenLabsVoiceId || undefined,
        }
        audioManager.savePack(packToSave)
        setPack(packToSave)
        setIsEditing(true)
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

    const processedGroups = getProcessedCategoryGroups(true)
    const selectedPackId =
        isEditing && existingPacks.some((p) => p.id === pack.id)
            ? pack.id
            : ''

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
                        value={selectedPackId}
                        onChange={(e) => {
                            if (e.target.value) {
                                handleLoadPack(e.target.value)
                            }
                        }}
                    >
                        <option value="" disabled={isEditing}>
                            Select a pack...
                        </option>
                        {existingPacks.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name} ({p.id})
                            </option>
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

            <div className="editor-subtabs">
                <button
                    type="button"
                    className={`button${activeSubtab === 'categories' ? ' button-primary' : ''}`}
                    onClick={() => setActiveSubtab('categories')}
                >
                    Categories
                </button>
                <button
                    type="button"
                    className={`button${activeSubtab === 'generate' ? ' button-primary' : ''}`}
                    onClick={() => setActiveSubtab('generate')}
                >
                    Generate Voice
                </button>
            </div>

            <div className="editor-subtab-panel">
                <div
                    className="editor-subtab-content"
                    hidden={activeSubtab !== 'categories'}
                >
                    <div className="audio-categories">
                        <h3>Audio Files by Category</h3>
                        {processedGroups.map((group) => (
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

                <div
                    className="editor-subtab-content"
                    hidden={activeSubtab !== 'generate'}
                >
                    <GenerateLines
                        key={pack.id}
                        pack={pack}
                        isEditing={isEditing}
                        customNames={pack.customNames || {}}
                        onUpdateAudioFiles={handleUpdateAudioFiles}
                    />
                </div>
            </div>
        </div>
    )
}

export default AudioPackEditor
