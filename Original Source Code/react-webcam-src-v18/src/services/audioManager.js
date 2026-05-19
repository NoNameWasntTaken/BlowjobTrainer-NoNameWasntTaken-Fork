/**
 * Audio Manager - Manages default and custom audio packs
 * Provides unified API for accessing audio files
 */

import { AUDIO } from '../components/Tasks/audio'
import { storageService, audioFileService } from './storageService'
import { resolveAudioReference, getAudioFile as resolveAudioFile, getAudioKey as resolveAudioKey } from './audioResolver'

let activeCustomPack = null

/**
 * Load active custom audio pack from storage
 */
const loadActivePack = () => {
    const activePackId = storageService.getActiveAudioPack()
    if (activePackId) {
        activeCustomPack = storageService.loadAudioPack(activePackId)
    } else {
        activeCustomPack = null
    }
}

// Initialize on module load
loadActivePack()

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
        return resolveAudioReference(audioRef, activeCustomPack)
    },

    /**
     * Get a single random audio file from a reference (synchronous version for backward compatibility)
     * Note: This doesn't resolve custom content URLs - use getAudioFile() for that
     * @param {string|string[]|object} audioRef - Audio reference
     * @returns {string|null} - Single audio file path
     */
    getAudioFileSync: (audioRef) => {
        return resolveAudioFile(audioRef, activeCustomPack)
    },

    /**
     * Get a single random audio file from a reference
     * @param {string|string[]|object} audioRef - Audio reference
     * @returns {Promise<string|null>} - Single audio file path/URL (async for custom content)
     */
    getAudioFile: async (audioRef) => {
        const resolved = resolveAudioFile(audioRef, activeCustomPack)
        
        // If it's a custom content URL, resolve it from IndexedDB
        if (resolved && resolved.startsWith('custom-content://')) {
            const url = await audioFileService.getAudioFile(resolved)
            return url || resolved // Fallback to original if not found
        }
        
        return resolved
    },

    /**
     * Get the string key for an audio path (reverse lookup)
     * @param {string} audioPath - Audio file path
     * @returns {string|null} - String reference like "Category.KEY" or null
     */
    getAudioKey: (audioPath) => {
        return resolveAudioKey(audioPath, activeCustomPack)
    },

    /**
     * Get the default AUDIO object (for backward compatibility)
     */
    getDefaultAudio: () => {
        return AUDIO
    },

    /**
     * Get active custom audio pack
     */
    getActiveCustomPack: () => {
        return activeCustomPack
    },

    /**
     * Set active custom audio pack
     * @param {string|null} packId - Pack ID or null to use default
     */
    setActiveCustomPack: (packId) => {
        if (packId) {
            activeCustomPack = storageService.loadAudioPack(packId)
            storageService.setActiveAudioPack(packId)
        } else {
            activeCustomPack = null
            storageService.setActiveAudioPack(null)
        }
    },

    /**
     * Get all available audio packs (default + custom)
     */
    getAllPacks: () => {
        const customPacks = storageService.getAllAudioPacks()
        return {
            default: {
                id: 'default',
                name: 'Default Audio Pack',
                isDefault: true
            },
            ...customPacks
        }
    },

    /**
     * Save a custom audio pack
     * @param {object} packData - Pack data with id, name, audioFiles, etc.
     */
    savePack: (packData) => {
        return storageService.saveAudioPack(packData)
    },

    /**
     * Load a custom audio pack
     * @param {string} packId - Pack ID
     */
    loadPack: (packId) => {
        return storageService.loadAudioPack(packId)
    },

    /**
     * Delete a custom audio pack
     * @param {string} packId - Pack ID
     */
    deletePack: async (packId) => {
        // Delete audio files
        await audioFileService.deletePackFiles(packId)
        
        // Delete pack metadata
        storageService.deleteAudioPack(packId)
        
        // If this was the active pack, clear it
        if (activeCustomPack && activeCustomPack.id === packId) {
            audioManager.setActiveCustomPack(null)
        }
    }
}

