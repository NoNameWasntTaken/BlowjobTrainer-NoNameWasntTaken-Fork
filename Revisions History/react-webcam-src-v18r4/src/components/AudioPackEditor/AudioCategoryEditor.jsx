import React, { useState } from 'react'
import AudioFileUploader from './AudioFileUploader'
import { audioManager } from '../../services/audioManager'

const AudioCategoryEditor = ({ packId, category, keys, audioFiles, onUpdate }) => {
    const [expanded, setExpanded] = useState(false)

    const handleFileUploaded = (customContentUrl, filePath) => {
        // Update audioFiles structure
        const updatedAudioFiles = { ...audioFiles }
        if (!updatedAudioFiles[category]) {
            updatedAudioFiles[category] = {}
        }
        
        // For now, add to first key or create a new entry
        // In a full implementation, user would select which key to add to
        const firstKey = keys[0]
        if (firstKey) {
            if (!updatedAudioFiles[category][firstKey]) {
                updatedAudioFiles[category][firstKey] = customContentUrl
            } else {
                // Convert to array if needed
                const existing = updatedAudioFiles[category][firstKey]
                if (Array.isArray(existing)) {
                    updatedAudioFiles[category][firstKey] = [...existing, customContentUrl]
                } else {
                    updatedAudioFiles[category][firstKey] = [existing, customContentUrl]
                }
            }
        }
        
        onUpdate(updatedAudioFiles)
    }

    const handleDeleteFile = (key, filePath) => {
        const updatedAudioFiles = { ...audioFiles }
        if (updatedAudioFiles[category] && updatedAudioFiles[category][key]) {
            const value = updatedAudioFiles[category][key]
            if (Array.isArray(value)) {
                updatedAudioFiles[category][key] = value.filter(p => p !== filePath)
            } else {
                delete updatedAudioFiles[category][key]
            }
            onUpdate(updatedAudioFiles)
        }
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
                    <AudioFileUploader
                        packId={packId}
                        category={category}
                        onFileUploaded={handleFileUploaded}
                        onError={(error) => alert(error)}
                    />
                    {keys.map(key => {
                        const files = getFilesForKey(key)
                        return (
                            <div key={key} style={{ marginTop: '12px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                                <strong>{key}:</strong>
                                {files.length === 0 ? (
                                    <div style={{ color: '#666', fontStyle: 'italic' }}>No files uploaded</div>
                                ) : (
                                    <div>
                                        {files.map((filePath, index) => (
                                            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                                <span style={{ fontSize: '0.9em' }}>{filePath.replace('custom-content://', '').split(':').slice(1).join(':')}</span>
                                                <button
                                                    className="button"
                                                    onClick={() => handleDeleteFile(key, filePath)}
                                                    style={{ padding: '4px 8px', fontSize: '0.8em' }}
                                                >
                                                    Delete
                                                </button>
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
