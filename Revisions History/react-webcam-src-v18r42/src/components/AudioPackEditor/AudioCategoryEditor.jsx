import React, { useState } from 'react'
import AudioFileUploader from './AudioFileUploader'
import {
    appendAudioFile,
    playPackAudioFile,
    removeAudioFileFromPack,
} from './packAudioFileUtils'

const AudioCategoryEditor = ({
    packId,
    category,
    keys,
    audioFiles,
    onUpdate,
    dynamicCues = false,
    onAddCue,
    onRenameCue,
    onDeleteCue,
}) => {
    const [expanded, setExpanded] = useState(false)
    const [openFileSections, setOpenFileSections] = useState({})
    const [newCueName, setNewCueName] = useState('')
    const [addError, setAddError] = useState('')
    const [renameDrafts, setRenameDrafts] = useState({})
    const [renameErrors, setRenameErrors] = useState({})

    const handleFileUploaded = (key, customContentUrl) => {
        onUpdate((prev) => appendAudioFile(prev, category, key, customContentUrl))
    }

    const handleDeleteFile = (key, filePath) => {
        onUpdate((prev) => {
            const next = removeAudioFileFromPack(prev, category, key, filePath)
            if (!dynamicCues || !next[category]) return next
            const value = next[category][key]
            const emptied = value === undefined || (Array.isArray(value) && value.length === 0)
            if (!emptied) return next
            return { ...next, [category]: { ...next[category], [key]: '' } }
        })
    }

    const handleAddCue = (event) => {
        event.preventDefault()
        if (!onAddCue) return
        const error = onAddCue(newCueName)
        if (error) {
            setAddError(error)
            return
        }
        setAddError('')
        setNewCueName('')
    }

    const handleRename = (key) => {
        if (!onRenameCue) return
        const error = onRenameCue(key, renameDrafts[key] ?? key)
        setRenameErrors((prev) => ({ ...prev, [key]: error || '' }))
        if (!error) {
            setRenameDrafts((prev) => {
                const next = { ...prev }
                delete next[key]
                return next
            })
        }
    }

    const handleDeleteCue = (key) => {
        if (!onDeleteCue) return
        if (!window.confirm(`Delete key "${key}" and its audio?`)) return
        onDeleteCue(key)
    }

    const getFilesForKey = (key) => {
        if (!audioFiles[category] || !audioFiles[category][key]) {
            return []
        }
        const value = audioFiles[category][key]
        return Array.isArray(value) ? value : [value]
    }

    const toggleFileSection = (key) => {
        setOpenFileSections((prev) => ({ ...prev, [key]: !prev[key] }))
    }

    const fileSectionId = (key) => `audio-files-${category}-${key}`.replace(/[^A-Za-z0-9_-]/g, '_')

    return (
        <div className="audio-category-editor" style={{ marginBottom: '16px', border: '1px solid #ddd', padding: '12px', borderRadius: '4px' }}>
            <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setExpanded(!expanded)}
            >
                <h3>{category}</h3>
                <span>{expanded ? '▼' : '▶'}</span>
            </div>
            {expanded && (
                <div style={{ marginTop: '12px' }}>
                    {keys.length === 0 && (
                        <div style={{ color: '#666', fontStyle: 'italic' }}>
                            {dynamicCues ? 'No custom voice lines yet.' : 'No lines in this category.'}
                        </div>
                    )}
                    {keys.map(key => {
                        const files = getFilesForKey(key)
                        const filesOpen = openFileSections[key] === true
                        return (
                            <div key={key} style={{ marginTop: '12px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                                <button
                                    type="button"
                                    className="audio-line-toggle"
                                    aria-expanded={filesOpen}
                                    aria-controls={fileSectionId(key)}
                                    onClick={() => toggleFileSection(key)}
                                >
                                    <span>{key}</span>
                                    <span aria-hidden="true">{filesOpen ? '▼' : '▶'}</span>
                                </button>
                                {filesOpen && (
                                    <div id={fileSectionId(key)} className="audio-files-panel">
                                        {dynamicCues && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                                                <input
                                                    type="text"
                                                    value={renameDrafts[key] ?? key}
                                                    onChange={(e) => {
                                                        const value = e.target.value
                                                        setRenameDrafts((prev) => ({ ...prev, [key]: value }))
                                                        setRenameErrors((prev) => ({ ...prev, [key]: '' }))
                                                    }}
                                                    aria-label={`Voice key for ${key}`}
                                                    style={{ flex: 1, minWidth: '120px', padding: '4px 8px', fontSize: '0.9em' }}
                                                />
                                                <button
                                                    type="button"
                                                    className="button"
                                                    onClick={() => handleRename(key)}
                                                    style={{ padding: '4px 8px', fontSize: '0.8em' }}
                                                >
                                                    Rename key
                                                </button>
                                                <button
                                                    type="button"
                                                    className="button"
                                                    onClick={() => handleDeleteCue(key)}
                                                    style={{ padding: '4px 8px', fontSize: '0.8em' }}
                                                >
                                                    Delete Key
                                                </button>
                                                {renameErrors[key] && (
                                                    <span style={{ color: '#c62828', fontSize: '0.85em' }}>{renameErrors[key]}</span>
                                                )}
                                            </div>
                                        )}
                                        <AudioFileUploader
                                            packId={packId}
                                            category={category}
                                            subcategory={key}
                                            onFileUploaded={(customContentUrl) => handleFileUploaded(key, customContentUrl)}
                                            onError={(error) => alert(error)}
                                        />
                                        {files.length === 0 ? (
                                            <div style={{ color: '#666', fontStyle: 'italic', marginTop: '8px' }}>No files uploaded</div>
                                        ) : (
                                            <div style={{ marginTop: '8px' }}>
                                                {files.map((filePath, index) => (
                                                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                                        <span style={{ fontSize: '0.9em' }}>{filePath.replace('custom-content://', '').split(':').slice(1).join(':')}</span>
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button
                                                                className="button"
                                                                onClick={() => playPackAudioFile(filePath)}
                                                                style={{ padding: '4px 8px', fontSize: '0.8em' }}
                                                            >
                                                                ▶ Play
                                                            </button>
                                                            <button
                                                                className="button"
                                                                onClick={() => handleDeleteFile(key, filePath)}
                                                                style={{ padding: '4px 8px', fontSize: '0.8em' }}
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                    {dynamicCues && (
                        <form onSubmit={handleAddCue} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginTop: '16px' }}>
                            <input
                                type="text"
                                value={newCueName}
                                onChange={(e) => {
                                    setNewCueName(e.target.value)
                                    setAddError('')
                                }}
                                placeholder="New voice key"
                                aria-label="New voice key"
                                style={{ flex: 1, minWidth: '160px', padding: '4px 8px' }}
                            />
                            <button type="submit" className="button">Add Custom Key</button>
                            {addError && <span style={{ color: '#c62828', fontSize: '0.85em' }}>{addError}</span>}
                        </form>
                    )}
                </div>
            )}
        </div>
    )
}

export default AudioCategoryEditor
