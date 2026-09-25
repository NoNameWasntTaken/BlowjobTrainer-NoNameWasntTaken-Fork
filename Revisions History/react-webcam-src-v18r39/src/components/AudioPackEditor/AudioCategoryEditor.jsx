import React, { useState } from 'react'
import AudioFileUploader from './AudioFileUploader'
import {
    appendAudioFile,
    playPackAudioFile,
    removeAudioFileFromPack,
} from './packAudioFileUtils'

const AudioCategoryEditor = ({ packId, category, keys, audioFiles, onUpdate, customNames, onCustomNamesUpdate }) => {
    const [expanded, setExpanded] = useState(false)

    const handleFileUploaded = (key, customContentUrl) => {
        onUpdate((prev) => appendAudioFile(prev, category, key, customContentUrl))
    }

    const handleDeleteFile = (key, filePath) => {
        onUpdate((prev) => removeAudioFileFromPack(prev, category, key, filePath))
    }

    const getFilesForKey = (key) => {
        if (!audioFiles[category] || !audioFiles[category][key]) {
            return []
        }
        const value = audioFiles[category][key]
        return Array.isArray(value) ? value : [value]
    }

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
                    {keys.map(key => {
                        const files = getFilesForKey(key)
                        return (
                            <div key={key} style={{ marginTop: '12px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                                    <strong>{key}:</strong>
                                    {customNames && onCustomNamesUpdate && (
                                        <input
                                            type="text"
                                            value={customNames[`Custom.${key}`] ?? ''}
                                            onChange={(e) => onCustomNamesUpdate({ ...customNames, [`Custom.${key}`]: e.target.value })}
                                            placeholder={`Display name for Custom.${key}`}
                                            style={{ flex: 1, minWidth: '120px', padding: '4px 8px', fontSize: '0.9em' }}
                                        />
                                    )}
                                </div>
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
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default AudioCategoryEditor
