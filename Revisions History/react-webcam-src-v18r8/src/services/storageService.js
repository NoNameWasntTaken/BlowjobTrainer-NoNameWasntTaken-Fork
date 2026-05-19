/**
 * Storage Service - Abstracts storage for web (IndexedDB/localStorage) and Electron (file system)
 * For now, implements web storage. Electron-specific implementation can be added later.
 */

const STORAGE_KEYS = {
    AUDIO_PACKS: 'custom_audio_packs',
    LEVELS: 'custom_levels',
    ACTIVE_AUDIO_PACK: 'active_audio_pack_id'
}

// IndexedDB setup for audio file storage
const DB_NAME = 'react-webcam-content'
const DB_VERSION = 1
const STORE_AUDIO_FILES = 'audioFiles'

let db = null

const initDB = () => {
    return new Promise((resolve, reject) => {
        if (db) {
            resolve(db)
            return
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION)

        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
            db = request.result
            resolve(db)
        }

        request.onupgradeneeded = (event) => {
            const database = event.target.result
            if (!database.objectStoreNames.contains(STORE_AUDIO_FILES)) {
                database.createObjectStore(STORE_AUDIO_FILES, { keyPath: 'id' })
            }
        }
    })
}

/**
 * Storage for audio pack metadata and level data (uses localStorage)
 */
export const storageService = {
    // Audio Packs
    saveAudioPack: (packData) => {
        const packs = storageService.getAllAudioPacks()
        packs[packData.id] = packData
        localStorage.setItem(STORAGE_KEYS.AUDIO_PACKS, JSON.stringify(packs))
        return packData
    },

    loadAudioPack: (packId) => {
        const packs = storageService.getAllAudioPacks()
        return packs[packId] || null
    },

    getAllAudioPacks: () => {
        const data = localStorage.getItem(STORAGE_KEYS.AUDIO_PACKS)
        return data ? JSON.parse(data) : {}
    },

    deleteAudioPack: (packId) => {
        const packs = storageService.getAllAudioPacks()
        delete packs[packId]
        localStorage.setItem(STORAGE_KEYS.AUDIO_PACKS, JSON.stringify(packs))
    },

    // Levels
    saveLevel: (levelData) => {
        const levels = storageService.getAllLevels()
        levels[levelData.id] = levelData
        localStorage.setItem(STORAGE_KEYS.LEVELS, JSON.stringify(levels))
        return levelData
    },

    loadLevel: (levelId) => {
        const levels = storageService.getAllLevels()
        return levels[levelId] || null
    },

    getAllLevels: () => {
        const data = localStorage.getItem(STORAGE_KEYS.LEVELS)
        return data ? JSON.parse(data) : {}
    },

    deleteLevel: (levelId) => {
        const levels = storageService.getAllLevels()
        delete levels[levelId]
        localStorage.setItem(STORAGE_KEYS.LEVELS, JSON.stringify(levels))
    },

    // Active audio pack
    setActiveAudioPack: (packId) => {
        if (packId) {
            localStorage.setItem(STORAGE_KEYS.ACTIVE_AUDIO_PACK, packId)
        } else {
            localStorage.removeItem(STORAGE_KEYS.ACTIVE_AUDIO_PACK)
        }
    },

    getActiveAudioPack: () => {
        return localStorage.getItem(STORAGE_KEYS.ACTIVE_AUDIO_PACK) || null
    },

    // Calibration Profiles
    saveCalibrationProfile: (profileId, data) => {
        const profiles = storageService.getAllCalibrationProfiles();
        profiles[profileId] = {
            ...data,
            profileId,
            savedAt: new Date().toISOString()
        };
        localStorage.setItem('calibration_profiles', JSON.stringify(profiles));
        return profiles[profileId];
    },

    loadCalibrationProfile: (profileId) => {
        const profiles = storageService.getAllCalibrationProfiles();
        return profiles[profileId] || null;
    },

    getAllCalibrationProfiles: () => {
        const data = localStorage.getItem('calibration_profiles');
        return data ? JSON.parse(data) : {};
    },

    deleteCalibrationProfile: (profileId) => {
        const profiles = storageService.getAllCalibrationProfiles();
        delete profiles[profileId];
        localStorage.setItem('calibration_profiles', JSON.stringify(profiles));
    }
}

/**
 * Helper function to normalize audio paths
 * Preserves original case for storage with validation
 */
const normalizeAudioPath = (category, filename) => {
    // Validate inputs
    if (!category || typeof category !== 'string') {
        throw new Error('Category must be a non-empty string')
    }
    if (!filename || typeof filename !== 'string') {
        throw new Error('Filename must be a non-empty string')
    }
    
    // Sanitize category - remove leading/trailing whitespace, remove invalid characters
    const cleanCategory = category.trim().replace(/[^a-zA-Z0-9_]/g, '_')
    if (!cleanCategory) {
        throw new Error('Category cannot be empty after sanitization')
    }
    
    // Extract just filename (remove path components)
    // eslint-disable-next-line no-useless-escape -- [\\/] matches both path separators
    const cleanFilename = filename.replace(/^.*[\\/]/, '').trim()
    if (!cleanFilename) {
        throw new Error('Filename cannot be empty')
    }
    
    // Validate filename doesn't contain path traversal
    if (cleanFilename.includes('..') || cleanFilename.includes('/') || cleanFilename.includes('\\')) {
        throw new Error('Filename cannot contain path traversal characters')
    }
    
    return `audio/${cleanCategory}/${cleanFilename}`
}

/**
 * Helper function to extract packId from custom-content URL
 */
const extractPackId = (url) => {
    if (!url.startsWith('custom-content://')) return null
    const withoutPrefix = url.replace('custom-content://', '')
    return withoutPrefix.split(':')[0]
}

/**
 * Helper function to extract filePath from custom-content:// URL
 */
const extractFilePath = (customContentUrl) => {
    if (!customContentUrl.startsWith('custom-content://')) {
        return null
    }
    const withoutPrefix = customContentUrl.replace('custom-content://', '')
    const parts = withoutPrefix.split(':')
    if (parts.length >= 2) {
        // Join all parts after the first (packId) in case filePath contains ':'
        return parts.slice(1).join(':')
    }
    return withoutPrefix
}

/**
 * Audio file storage (uses IndexedDB for blobs)
 */
const urlCache = new Map() // packId -> Set<objectUrl>

export const audioFileService = {
    // Store audio file blob
    storeAudioFile: async (packId, filePath, blob) => {
        try {
            // Check quota before storing
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate()
                const available = estimate.quota - estimate.usage
                if (available < blob.size) {
                    throw new Error(`Insufficient storage. Need ${blob.size} bytes, have ${available} bytes available.`)
                }
            }
            
            const database = await initDB()
            const transaction = database.transaction([STORE_AUDIO_FILES], 'readwrite')
            const store = transaction.objectStore(STORE_AUDIO_FILES)
            
            const id = `${packId}:${filePath}`
            await store.put({ id, packId, filePath, blob })
            
            // Return a URL that can be used to access the file
            return `custom-content://${id}`
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                throw new Error('Storage quota exceeded. Please free up space or delete unused packs.')
            } else if (error.name === 'InvalidStateError') {
                throw new Error('Database is locked. Please try again.')
            } else {
                throw new Error(`Failed to store audio file: ${error.message}`)
            }
        }
    },

    // Get audio file blob
    getAudioFile: async (url) => {
        if (!url.startsWith('custom-content://')) {
            return null // Not a custom content file
        }
        
        const id = url.replace('custom-content://', '')
        const database = await initDB()
        const transaction = database.transaction([STORE_AUDIO_FILES], 'readonly')
        const store = transaction.objectStore(STORE_AUDIO_FILES)
        
        return new Promise((resolve, reject) => {
            const request = store.get(id)
            request.onsuccess = () => {
                const result = request.result
                if (result && result.blob) {
                    // Create object URL from blob
                    const objectUrl = URL.createObjectURL(result.blob)
                    // Cache the URL
                    const packId = extractPackId(url)
                    if (packId) {
                        if (!urlCache.has(packId)) urlCache.set(packId, new Set())
                        urlCache.get(packId).add(objectUrl)
                    }
                    resolve(objectUrl)
                } else {
                    resolve(null)
                }
            }
            request.onerror = () => reject(request.error)
        })
    },

    // Check if file exists
    checkFileExists: async (packId, filePath) => {
        const id = `${packId}:${filePath}`
        const database = await initDB()
        const transaction = database.transaction([STORE_AUDIO_FILES], 'readonly')
        const store = transaction.objectStore(STORE_AUDIO_FILES)
        
        return new Promise((resolve) => {
            const request = store.get(id)
            request.onsuccess = () => {
                resolve(!!request.result) // Return true if file exists
            }
            request.onerror = () => {
                resolve(false) // Return false on error
            }
        })
    },

    // Revoke all object URLs for a pack
    revokePackUrls: (packId) => {
        const urls = urlCache.get(packId)
        if (urls) {
            urls.forEach(url => URL.revokeObjectURL(url))
            urlCache.delete(packId)
        }
    },

    // Delete all audio files for a pack
    deletePackFiles: async (packId) => {
        const database = await initDB()
        const transaction = database.transaction([STORE_AUDIO_FILES], 'readwrite')
        const store = transaction.objectStore(STORE_AUDIO_FILES)
        
        // Iterate through all entries and delete matching packId
        const request = store.openCursor()
        return new Promise((resolve, reject) => {
            request.onsuccess = (event) => {
                const cursor = event.target.result
                if (cursor) {
                    if (cursor.value.packId === packId) {
                        cursor.delete()
                    }
                    cursor.continue()
                } else {
                    resolve()
                }
            }
            request.onerror = () => reject(request.error)
        })
    },

    // Export helper functions
    normalizeAudioPath,
    extractPackId,
    extractFilePath
}

