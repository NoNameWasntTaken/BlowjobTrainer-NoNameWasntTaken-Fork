import React, { useState } from 'react'
import { audioFileService } from '../../services/storageService'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const AudioFileUploader = ({ packId, category, onFileUploaded, onError }) => {
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

    const generateUniquePath = async (packId, category, filename) => {
        const { normalizeAudioPath } = audioFileService
        const basePath = normalizeAudioPath(category, filename)
        let finalPath = basePath
        
        // Check if exists
        const exists = await audioFileService.checkFileExists(packId, finalPath)
        if (!exists) return finalPath
        
        // Extract name and extension
        const match = filename.match(/^(.+?)(\.[^.]+)?$/)
        const baseName = match[1]
        const ext = match[2] || '.mp3'
        
        // Try a, b, c, etc.
        for (let letter of 'abcdefghijklmnopqrstuvwxyz'.split('')) {
            const newFilename = `${baseName} ${letter}${ext}`
            finalPath = normalizeAudioPath(category, newFilename)
            const exists = await audioFileService.checkFileExists(packId, finalPath)
            if (!exists) return finalPath
        }
        
        // Fallback to timestamp
        const timestamp = Date.now()
        const newFilename = `${baseName} ${timestamp}${ext}`
        return normalizeAudioPath(category, newFilename)
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
                const uniquePath = await generateUniquePath(packId, category, file.name)
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
                id={`file-input-${category}`}
            />
            <label
                htmlFor={`file-input-${category}`}
                className={`button ${uploading ? 'button-disabled' : ''}`}
                style={{ cursor: uploading ? 'not-allowed' : 'pointer' }}
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
