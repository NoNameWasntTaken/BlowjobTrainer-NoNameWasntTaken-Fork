import React, { useState } from 'react'
import AudioFileUploader from './AudioFileUploader'

const AudioCategoryEditor = ({ packId, category, keys, audioFiles, onUpdate }) => {
    const [expanded, setExpanded] = useState(false)

    const handleFileUploaded = (key, customContentUrl, filePath) => {
        // Update audioFiles structure
        const updatedAudioFiles = { ...audioFiles }
        if (!updatedAudioFiles[category]) {
            updatedAudioFiles[category] = {}
        }
        
        // Add to the specified key (subcategory)
        if (!updatedAudioFiles[category][key]) {
            updatedAudioFiles[category][key] = customContentUrl
        } else {
            // Convert to array if needed
            const existing = updatedAudioFiles[category][key]
            if (Array.isArray(existing)) {
                updatedAudioFiles[category][key] = [...existing, customContentUrl]
            } else {
                updatedAudioFiles[category][key] = [existing, customContentUrl]
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

    const handlePlayAudio = async (filePath) => {
        try {
            let audioUrl = filePath
            
            // Handle custom content URLs
            if (filePath && filePath.startsWith('custom-content://')) {
                const { audioFileService } = await import('../../services/storageService')
                const resolvedUrl = await audioFileService.getAudioFile(filePath)
                if (resolvedUrl) {
                    audioUrl = resolvedUrl
                } else {
                    alert('Could not load audio file')
                    return
                }
            }
            
            const audio = new Audio(audioUrl)
            audio.play().catch(err => {
                console.error('Error playing audio:', err)
                alert('Error playing audio: ' + err.message)
            })
        } catch (error) {
            console.error('Error loading audio:', error)
            alert('Error loading audio: ' + error.message)
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
                    {keys.map(key => {
                        const files = getFilesForKey(key)
                        return (
                            <div key={key} style={{ marginTop: '12px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                                <strong>{key}:</strong>
                                <AudioFileUploader
                                    packId={packId}
                                    category={category}
                                    subcategory={key}
                                    onFileUploaded={(customContentUrl, filePath) => handleFileUploaded(key, customContentUrl, filePath)}
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
                                                        onClick={() => handlePlayAudio(filePath)}
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
