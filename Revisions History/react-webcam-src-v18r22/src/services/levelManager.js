/**
 * Level Manager - Manages default and custom levels
 * Provides unified API for accessing levels
 */

import { levels as defaultLevels } from '../components/Training/levels'
import { storageService } from './storageService'

/**
 * Level Manager API
 */
export const levelManager = {
    /**
     * Get all levels (default + custom)
     * @param {object} options - Options for filtering/sorting
     * @returns {array} - Combined array of levels
     */
    getAllLevels: (options = {}) => {
        const customLevels = storageService.getAllLevels()
        const customLevelsArray = Object.values(customLevels)
        
        // Combine default and custom levels
        const allLevels = [...defaultLevels, ...customLevelsArray]
        
        // Sort by order
        allLevels.sort((a, b) => {
            const orderA = a.order || 999
            const orderB = b.order || 999
            return orderA - orderB
        })
        
        // Filter if needed
        if (options.includeCustom !== undefined) {
            // Mark custom levels
            const defaultIds = new Set(defaultLevels.map(l => l.id))
            return allLevels.filter(level => {
                const isCustom = !defaultIds.has(level.id)
                return options.includeCustom ? isCustom : !isCustom
            })
        }
        
        return allLevels
    },

    /**
     * Get a level by ID
     * @param {string} levelId - Level ID
     * @returns {object|null} - Level object or null
     */
    getLevel: (levelId) => {
        // Check default levels first
        const defaultLevel = defaultLevels.find(l => l.id === levelId)
        if (defaultLevel) {
            return defaultLevel
        }
        
        // Check custom levels
        return storageService.loadLevel(levelId)
    },

    /**
     * Save a custom level
     * @param {object} levelData - Level data
     */
    saveLevel: (levelData) => {
        // Validate level structure
        if (!levelData.id || !levelData.title || !Array.isArray(levelData.tasks)) {
            throw new Error('Invalid level data: missing id, title, or tasks')
        }

        return storageService.saveLevel({
            ...levelData,
            hidden: levelData.hidden === true,
        })
    },

    /**
     * Delete a custom level
     * @param {string} levelId - Level ID
     */
    deleteLevel: (levelId) => {
        // Don't allow deleting default levels
        const defaultLevel = defaultLevels.find(l => l.id === levelId)
        if (defaultLevel) {
            throw new Error('Cannot delete default level')
        }
        
        storageService.deleteLevel(levelId)
    },

    /**
     * Get default levels only
     */
    getDefaultLevels: () => {
        return defaultLevels
    },

    /**
     * Get custom levels only
     */
    getCustomLevels: () => {
        const customLevels = storageService.getAllLevels()
        return Object.values(customLevels)
    },

    /**
     * Check if a level is a default level
     * @param {string} levelId - Level ID
     * @returns {boolean} - True if level is a default level
     */
    isDefaultLevel: (levelId) => {
        return defaultLevels.some(l => l.id === levelId)
    }
}

