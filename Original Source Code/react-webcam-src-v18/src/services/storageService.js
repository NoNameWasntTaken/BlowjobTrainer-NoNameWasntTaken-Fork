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
    }
}

/**
 * Audio file storage (uses IndexedDB for blobs)
 */
export const audioFileService = {
    // Store audio file blob
    storeAudioFile: async (packId, filePath, blob) => {
        const database = await initDB()
        const transaction = database.transaction([STORE_AUDIO_FILES], 'readwrite')
        const store = transaction.objectStore(STORE_AUDIO_FILES)
        
        const id = `${packId}:${filePath}`
        await store.put({ id, packId, filePath, blob })
        
        // Return a URL that can be used to access the file
        return `custom-content://${id}`
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
                    resolve(objectUrl)
                } else {
                    resolve(null)
                }
            }
            request.onerror = () => reject(request.error)
        })
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
    }
}

