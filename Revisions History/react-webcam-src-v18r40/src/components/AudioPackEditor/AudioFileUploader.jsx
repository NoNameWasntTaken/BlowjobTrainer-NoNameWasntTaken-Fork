import React, { useState } from 'react'
import { audioFileService } from '../../services/storageService'
import { generateUniqueAudioPath } from '../../utils/audioPackPathUtils'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const AudioFileUploader = ({ packId, category, subcategory, onFileUploaded, onError }) => {
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)

    const validateFile = (file) => {
        if (file.size > MAX_FILE_SIZE) {
            throw new Error(`File ${file.name} exceeds 10MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
        }
        if (!file.type.match(/audio\/(mp3|wav|mpeg)/)) {
            throw new Error(`File ${file.name} is not a valid audio format (MP3/WAV only)`)
        }
    }

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files || [])
        if (files.length === 0) return

        setUploading(true)
        setProgress(0)

        try {
            // Check quota before upload
            let totalSize = 0
            for (const file of files) {
                validateFile(file)
                totalSize += file.size
            }

            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate()
                const available = estimate.quota - estimate.usage
                if (available < totalSize) {
                    throw new Error(`Insufficient storage. Need ${totalSize} bytes, have ${available} bytes available.`)
                }
            }

            // Upload files
            for (let i = 0; i < files.length; i++) {
                const file = files[i]
                const uniquePath = await generateUniqueAudioPath(packId, category, file.name)
                const blob = file
                const customContentUrl = await audioFileService.storeAudioFile(packId, uniquePath, blob)
                
                setProgress(((i + 1) / files.length) * 100)
                onFileUploaded(customContentUrl, uniquePath)
            }

            setProgress(100)
        } catch (error) {
            onError(error.message)
        } finally {
            setUploading(false)
            setProgress(0)
            // Reset file input
            e.target.value = ''
        }
    }

    return (
        <div className="audio-file-uploader">
            <input
                type="file"
                accept="audio/mp3,audio/wav,audio/mpeg"
                multiple
                onChange={handleFileChange}
                disabled={uploading}
                style={{ display: 'none' }}
                id={`file-input-${category}-${subcategory}`}
            />
            <label
                htmlFor={`file-input-${category}-${subcategory}`}
                className={`button ${uploading ? 'button-disabled' : ''}`}
                style={{ cursor: uploading ? 'not-allowed' : 'pointer', marginTop: '8px', display: 'inline-block' }}
            >
                {uploading ? `Uploading... ${Math.round(progress)}%` : 'Upload Audio Files'}
            </label>
            {uploading && (
                <div style={{ width: '100%', height: '4px', backgroundColor: '#ddd', marginTop: '8px' }}>
                    <div
                        style={{
                            width: `${progress}%`,
                            height: '100%',
                            backgroundColor: '#4CAF50',
                            transition: 'width 0.3s'
                        }}
                    />
                </div>
            )}
        </div>
    )
}

export default AudioFileUploader
