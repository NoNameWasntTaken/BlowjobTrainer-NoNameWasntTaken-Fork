/**
 * Audio Manager - Manages default and custom voice packs
 * Provides unified API for accessing audio files
 */

import { AUDIO } from '../components/Tasks/audio'
import { storageService, audioFileService } from './storageService'
import { resolveAudioReference, getAudioFile as resolveAudioFile, getAudioKey as resolveAudioKey } from './audioResolver'
import { activePackIdAtom } from '../atoms/audioAtom'
import { store } from '../store'
import JSZip from 'jszip'

let activeCustomPack = null
let fallbackPack = null // Fallback pack for when primary pack doesn't have a file

/**
 * Custom error class for pack ID conflicts
 */
class PackIdConflictError extends Error {
    constructor(existingId, existingName) {
        super(`Pack ID conflict: Pack "${existingName}" (ID: ${existingId}) already exists`)
        this.name = 'PackIdConflictError'
        this.existingId = existingId
        this.existingName = existingName
    }
}

/**
 * Load active custom voice pack from storage
 */
const loadActivePack = () => {
    const activePackId = storageService.getActiveAudioPack()
    if (activePackId) {
        activeCustomPack = storageService.loadAudioPack(activePackId)
        // Initialize the atom with the loaded pack ID
        try {
            store.set(activePackIdAtom, activePackId)
        } catch (error) {
            console.error('Failed to initialize active pack atom:', error)
        }
    } else {
        activeCustomPack = null
        // Ensure atom is null if no pack is active
        try {
            store.set(activePackIdAtom, null)
        } catch (error) {
            console.error('Failed to initialize active pack atom:', error)
        }
    }
}

// Initialize on module load
loadActivePack()

/**
 * Internal: resolve with current pack context (activeCustomPack + fallbackPack from closure).
 * All resolver calls go through these wrappers so pack context is never passed from external callers.
 */
const resolveWithContext = (audioRef) =>
    resolveAudioReference(audioRef, activeCustomPack, fallbackPack)

const getAudioFileWithContext = (audioRef) =>
    resolveAudioFile(audioRef, activeCustomPack, fallbackPack)

const getAudioFileWithPacks = (audioRef, primaryPack, fallback) =>
    resolveAudioFile(audioRef, primaryPack, fallback)

const getAudioKeyWithContext = (audioPath, customPackOverride = null) =>
    resolveAudioKey(audioPath, customPackOverride ?? activeCustomPack)

/**
 * Internal: resolve custom-content URLs to playable blob URLs.
 * Shared by getAudioFile and getAudioFileForPack.
 */
const resolveCustomContentUrls = async (resolved) => {
    if (Array.isArray(resolved)) {
        const resolvedArray = await Promise.all(
            resolved.map(async (item) => {
                if (item && typeof item === 'string' && item.startsWith('custom-content://')) {
                    const url = await audioFileService.getAudioFile(item)
                    return url || item
                }
                return item
            })
        )
        return resolvedArray[Math.floor(Math.random() * resolvedArray.length)]
    }
    if (resolved && typeof resolved === 'string') {
        if (resolved.startsWith('custom-content://')) {
            const url = await audioFileService.getAudioFile(resolved)
            return url || resolved
        }
        return resolved
    }
    return resolved
}

/**
 * Audio Manager API
 */
export const audioManager = {
    /**
     * Get audio file path(s) for a reference
     * @param {string|string[]|object} audioRef - Audio reference
     * @returns {string|string[]|null} - Resolved audio path(s)
     */
    getAudio: (audioRef) => {
        return resolveWithContext(audioRef)
    },

    /**
     * Get a single random audio file from a reference (synchronous version for backward compatibility)
     * Note: This doesn't resolve custom content URLs - use getAudioFile() for that
     * @param {string|string[]|object} audioRef - Audio reference
     * @returns {string|null} - Single audio file path
     */
    getAudioFileSync: (audioRef) => {
        return getAudioFileWithContext(audioRef)
    },

    /**
     * Get a single random audio file from a reference
     * @param {string|string[]|object} audioRef - Audio reference
     * @returns {Promise<string|null>} - Single audio file path/URL (async for custom content)
     */
    getAudioFile: async (audioRef) => {
        const resolved = getAudioFileWithContext(audioRef)
        return resolveCustomContentUrls(resolved)
    },

    /**
     * Get a single audio file for a reference using a specific pack (e.g. level preview in editor).
     * Primary = specified pack; fallback = activeCustomPack (Content Library), then default AUDIO.
     * @param {string|string[]|object} audioRef - Audio reference
     * @param {string|null} packId - Pack ID to use as primary, or null to use active pack
     * @returns {Promise<string|null>} - Single audio file path/URL (async for custom content)
     */
    getAudioFileForPack: async (audioRef, packId) => {
        const primaryPack = packId ? storageService.loadAudioPack(packId) : null
        const primary = primaryPack ?? activeCustomPack
        const fallback = primaryPack ? activeCustomPack : fallbackPack
        const resolved = getAudioFileWithPacks(audioRef, primary, fallback)
        return resolveCustomContentUrls(resolved)
    },

    /**
     * Get the string key for an audio path (reverse lookup)
     * @param {string} audioPath - Audio file path
     * @returns {string|null} - String reference like "Category.KEY" or null
     */
    getAudioKey: (audioPath) => {
        return getAudioKeyWithContext(audioPath)
    },

    /**
     * Get the default AUDIO object (for backward compatibility)
     */
    getDefaultAudio: () => {
        return AUDIO
    },

    /**
     * Get active custom voice pack
     */
    getActiveCustomPack: () => {
        return activeCustomPack
    },

    /**
     * Get active pack ID from storage (fresh read, not in-memory cache)
     */
    getActivePackId: () => {
        return storageService.getActiveAudioPack()
    },

    /**
     * Get fallback voice pack
     */
    getFallbackPack: () => {
        return fallbackPack
    },

    /**
     * Set fallback voice pack (used when primary pack doesn't have a file)
     * @param {string|null} packId - Pack ID or null to clear fallback
     */
    setFallbackPack: (packId) => {
        if (packId) {
            fallbackPack = storageService.loadAudioPack(packId)
        } else {
            fallbackPack = null
        }
    },

    /**
     * Set active custom voice pack
     * @param {string|null} packId - Pack ID or null to use default
     */
    setActiveCustomPack: (packId) => {
        // Revoke URLs for previously active pack
        if (activeCustomPack && activeCustomPack.id) {
            audioFileService.revokePackUrls(activeCustomPack.id)
        }
        
        // Update atom for React reactivity using store API with error handling
        try {
            store.set(activePackIdAtom, packId)
        } catch (error) {
            console.error('Failed to update active pack atom:', error)
            // Continue with module variable update even if atom update fails
        }
        
        // Update module variable for backward compatibility
        if (packId) {
            activeCustomPack = storageService.loadAudioPack(packId)
            storageService.setActiveAudioPack(packId)
        } else {
            activeCustomPack = null
            storageService.setActiveAudioPack(null)
        }
    },

    /**
     * Get all available voice packs (default + custom)
     */
    getAllPacks: () => {
        const customPacks = storageService.getAllAudioPacks()
        return {
            default: {
                id: 'default',
                name: 'Default Voice Pack',
                isDefault: true
            },
            ...customPacks
        }
    },

    /**
     * Save a custom voice pack
     * @param {object} packData - Pack data with id, name, audioFiles, etc.
     */
    savePack: (packData) => {
        return storageService.saveAudioPack(packData)
    },

    /**
     * Load a custom voice pack
     * @param {string} packId - Pack ID
     */
    loadPack: (packId) => {
        return storageService.loadAudioPack(packId)
    },

    /**
     * Delete a custom voice pack
     * @param {string} packId - Pack ID
     */
    deletePack: async (packId) => {
        // Revoke URLs before deleting
        audioFileService.revokePackUrls(packId)
        
        // Delete audio files
        await audioFileService.deletePackFiles(packId)
        
        // Delete pack metadata
        storageService.deleteAudioPack(packId)
        
        // If this was the active pack, clear it
        if (activeCustomPack && activeCustomPack.id === packId) {
            audioManager.setActiveCustomPack(null)
        }
    },

    /**
     * Validate active pack exists and clear if missing
     */
    validateActivePack: () => {
        const activePackId = storageService.getActiveAudioPack()
        if (activePackId) {
            const pack = storageService.loadAudioPack(activePackId)
            if (!pack) {
                console.warn(`Active pack ${activePackId} not found, clearing`)
                storageService.setActiveAudioPack(null)
                activeCustomPack = null
                // Also update atom via store with error handling
                try {
                    store.set(activePackIdAtom, null)
                } catch (error) {
                    console.error('Failed to update active pack atom:', error)
                }
            }
        }
    },

    /**
     * Drop in-memory pack caches (e.g. after factory reset clears localStorage / IndexedDB).
     */
    clearCustomContentCache: () => {
        if (activeCustomPack?.id) {
            audioFileService.revokePackUrls(activeCustomPack.id)
        }
        activeCustomPack = null
        fallbackPack = null
        try {
            store.set(activePackIdAtom, null)
        } catch (error) {
            console.error('Failed to clear active pack atom:', error)
        }
    },

    /**
     * Export a custom voice pack as a ZIP file
     * @param {string} packId - Pack ID to export
     * @returns {Promise<Blob>} - ZIP file blob
     */
    exportPack: async (packId) => {
        const pack = storageService.loadAudioPack(packId)
        if (!pack) {
            throw new Error(`Pack ${packId} not found`)
        }
        
        // Only allow exporting custom packs
        if (packId === 'default' || pack.isDefault) {
            throw new Error('Default voice pack cannot be exported')
        }
        
        const zip = new JSZip()
        
        // Prepare manifest with normalized paths (audio/category/filename.mp3 format)
        const manifestAudioFiles = {}
        
        // Add audio files to ZIP at root level, and build manifest
        for (const [category, keys] of Object.entries(pack.audioFiles || {})) {
            manifestAudioFiles[category] = {}
            
            for (const [key, paths] of Object.entries(keys)) {
                const filePaths = Array.isArray(paths) ? paths : [paths]
                const manifestPaths = []
                
                // Export all files in array (preserve array structure)
                for (const filePath of filePaths) {
                    if (filePath && typeof filePath === 'string' && filePath.startsWith('custom-content://')) {
                        // Get blob from IndexedDB
                        const objectUrl = await audioFileService.getAudioFile(filePath)
                        if (objectUrl) {
                            const response = await fetch(objectUrl)
                            const blob = await response.blob()
                            
                            // Extract filePath properly
                            const extractedPath = audioFileService.extractFilePath(filePath)
                            if (extractedPath) {
                                // Store in ZIP as: audio/category/filename.mp3 (at root level)
                                const zipPath = extractedPath
                                zip.file(zipPath, blob)
                                
                                // Add normalized path to manifest (audio/category/filename.mp3)
                                manifestPaths.push(extractedPath)
                            }
                        }
                    }
                }
                
                // Preserve array structure in manifest (single value or array)
                manifestAudioFiles[category][key] = filePaths.length === 1 ? manifestPaths[0] : manifestPaths
            }
        }
        
        // Add manifest with normalized paths
        const manifest = {
            format: 'audio-pack-v1',
            pack: {
                id: pack.id,
                name: pack.name,
                author: pack.author || '',
                version: pack.version || '1.0.0',
                description: pack.description || '',
                createdAt: pack.createdAt || new Date().toISOString(),
                customNames: pack.customNames || {}
            },
            audioFiles: manifestAudioFiles
        }
        zip.file('audio-pack.json', JSON.stringify(manifest, null, 2))
        
        // Generate ZIP blob
        const zipBlob = await zip.generateAsync({ type: 'blob' })
        
        // Clean up any temporary object URLs created during export
        // (URLs are cached per pack, so they'll be cleaned up when pack is deactivated/deleted)
        
        return zipBlob
    },

    /**
     * Import an voice pack from a ZIP file
     * @param {File} zipFile - ZIP file to import
     * @param {object} options - Import options (overwrite, newId)
     * @returns {Promise<object>} - Imported pack data with warnings
     */
    importPack: async (zipFile, options = {}) => {
        const zip = new JSZip()
        const zipData = await zip.loadAsync(zipFile)
        
        // Validate structure (must contain audio-pack.json)
        const manifestFile = zipData.file('audio-pack.json')
        if (!manifestFile) {
            throw new Error('Invalid voice pack: missing audio-pack.json manifest')
        }
        
        // Parse manifest JSON
        const manifestText = await manifestFile.async('string')
        let manifest
        try {
            manifest = JSON.parse(manifestText)
        } catch (error) {
            throw new Error(`Invalid voice pack: malformed JSON in manifest - ${error.message}`)
        }
        
        // Validate manifest format
        if (manifest.format !== 'audio-pack-v1') {
            throw new Error(`Unsupported voice pack format: ${manifest.format}`)
        }
        
        if (!manifest.pack || !manifest.pack.id) {
            throw new Error('Invalid voice pack: missing pack ID in manifest')
        }
        
        // Check for pack ID conflicts
        const existingPack = storageService.loadAudioPack(manifest.pack.id)
        if (existingPack) {
            if (options.overwrite === true) {
                // User confirmed overwrite
            } else if (options.newId) {
                // User provided new ID
                manifest.pack.id = options.newId
            } else {
                // Throw custom error for UI component to handle
                throw new PackIdConflictError(manifest.pack.id, existingPack.name)
            }
        }
        
        // Check IndexedDB quota before import
        let totalSize = 0
        for (const [, keys] of Object.entries(manifest.audioFiles || {})) {
            for (const [, paths] of Object.entries(keys)) {
                const filePaths = Array.isArray(paths) ? paths : [paths]
                for (const filePath of filePaths) {
                    // Try both paths
                    const zipPath1 = `${manifest.pack.id}/${filePath}`
                    const zipPath2 = filePath
                    const file = zipData.file(zipPath1) || zipData.file(zipPath2)
                    if (file) {
                        totalSize += file._data ? file._data.uncompressedSize : 0
                    }
                }
            }
        }
        
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate()
            const available = estimate.quota - estimate.usage
            if (available < totalSize) {
                throw new Error(`Insufficient storage. Need ${totalSize} bytes, have ${available} bytes available.`)
            }
        }
        
        // Process audio files - handle both {packId}/audio/ and audio/ structures
        const processedAudioFiles = {}
        for (const [category, keys] of Object.entries(manifest.audioFiles || {})) {
            processedAudioFiles[category] = {}
            
            for (const [key, paths] of Object.entries(keys)) {
                // Preserve array structure
                const filePaths = Array.isArray(paths) ? paths : [paths]
                const storedPaths = []
                
                for (const filePath of filePaths) {
                    // Skip empty/null/undefined paths (they mean "no audio")
                    if (!filePath || typeof filePath !== 'string' || filePath.trim() === '') {
                        continue
                    }
                    
                    // Normalize path (remove packId prefix if present, ensure audio/ prefix)
                    let normalizedPath = filePath
                    if (normalizedPath.startsWith(`${manifest.pack.id}/audio/`)) {
                        normalizedPath = normalizedPath.replace(`${manifest.pack.id}/audio/`, 'audio/')
                    } else if (!normalizedPath.startsWith('audio/')) {
                        normalizedPath = `audio/${normalizedPath}`
                    }
                    
                    // Extract file from ZIP (try both paths)
                    let blob = null
                    const zipPath1 = `${manifest.pack.id}/${normalizedPath}`
                    const zipPath2 = normalizedPath
                    
                    const file = zipData.file(zipPath1) || zipData.file(zipPath2)
                    if (file) {
                        blob = await file.async('blob')
                        
                        // Validate file size (10MB max)
                        const MAX_FILE_SIZE = 10 * 1024 * 1024
                        if (blob.size > MAX_FILE_SIZE) {
                            throw new Error(`File ${normalizedPath} exceeds 10MB limit (${(blob.size / 1024 / 1024).toFixed(2)}MB)`)
                        }
                        
                        // Validate file format - check extension since ZIP blobs don't preserve MIME types
                        const fileExtension = normalizedPath.toLowerCase().match(/\.([^.]+)$/)?.[1]
                        if (!fileExtension || !['mp3', 'wav'].includes(fileExtension)) {
                            // Fallback: check MIME type if available (for direct file uploads)
                            if (!blob.type || !blob.type.match(/audio\/(mp3|wav|mpeg)/)) {
                                throw new Error(`File ${normalizedPath} is not a valid audio format (MP3/WAV only)`)
                            }
                        }
                    } else {
                        throw new Error(`Audio file not found in ZIP: ${filePath}`)
                    }
                    
                    // Store file and get custom-content URL
                    const customContentUrl = await audioFileService.storeAudioFile(
                        manifest.pack.id,
                        normalizedPath,
                        blob
                    )
                    storedPaths.push(customContentUrl)
                }
                
                // Preserve array structure in pack metadata
                processedAudioFiles[category][key] = filePaths.length === 1 
                    ? storedPaths[0] 
                    : storedPaths
            }
        }
        
        // Validate pack structure against default AUDIO
        const warnings = []
        const defaultCategories = Object.keys(AUDIO).filter(key => typeof AUDIO[key] === 'object' && AUDIO[key] !== null)
        const allowedCategories = [...defaultCategories, 'Custom']
        const packCategories = Object.keys(processedAudioFiles)
        const CUSTOM_ALLOWED_KEYS = new Set(Array.from({ length: 20 }, (_, i) => `Custom${i + 1}`))

        // Check for extra categories (use allowedCategories so Custom is allowed)
        packCategories.forEach(cat => {
            if (!allowedCategories.includes(cat)) {
                warnings.push(`Custom category "${cat}" found (not in default structure)`)
            }
        })

        // Check for missing categories (use defaultCategories only - do not require Custom)
        defaultCategories.forEach(cat => {
            if (!packCategories.includes(cat)) {
                warnings.push(`Expected category "${cat}" is missing`)
            }
        })

        // Check for extra keys within categories
        packCategories.forEach(cat => {
            if (cat === 'Custom') {
                const packKeys = Object.keys(processedAudioFiles[cat] || {})
                packKeys.forEach(key => {
                    if (!CUSTOM_ALLOWED_KEYS.has(key)) {
                        warnings.push(`Invalid Custom key "${key}" (allowed: Custom1–Custom20)`)
                    }
                })
            } else if (AUDIO[cat]) {
                const defaultKeys = Object.keys(AUDIO[cat])
                const packKeys = Object.keys(processedAudioFiles[cat] || {})
                packKeys.forEach(key => {
                    if (!defaultKeys.includes(key)) {
                        warnings.push(`Extra key "${cat}.${key}" found (not in default structure)`)
                    }
                })
            }
        })
        
        // Save pack with processed audio files (preserving array structure)
        const packData = {
            ...manifest.pack,
            audioFiles: processedAudioFiles,
            customNames: manifest.pack?.customNames ?? {}
        }
        
        storageService.saveAudioPack(packData)
        
        return {
            pack: packData,
            warnings
        }
    }
}

// Export PackIdConflictError for UI components
export { PackIdConflictError }

