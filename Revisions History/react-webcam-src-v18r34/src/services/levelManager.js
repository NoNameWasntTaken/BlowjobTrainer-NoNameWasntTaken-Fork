/**
 * Level Manager - Manages default and custom levels
 * Provides unified API for accessing levels
 */

import { levels as defaultLevels } from '../components/Training/levels'
import { storageService } from './storageService'
import { normalizeCustomSubfolder } from '../constants/customLevelFolders'
import {
    normalizePrerequisiteRules,
    validateCustomPrerequisiteDAG,
} from '../utils/levelPrerequisitesUtils'

function levelIdExistsInProject(levelId) {
    return (
        defaultLevels.some((l) => l.id === levelId) ||
        !!storageService.loadLevel(levelId)
    )
}

function isDefaultLevelId(levelId) {
    return defaultLevels.some((l) => l.id === levelId)
}

/**
 * Remove prerequisites pointing at deletedId from all other custom levels.
 * @param {string} deletedId
 */
function scrubPrerequisiteReferencesToDeletedId(deletedId) {
    const ids = Object.keys(storageService.getAllLevels())
    for (const lid of ids) {
        if (lid === deletedId) continue
        const lvl = storageService.loadLevel(lid)
        if (!lvl) continue
        const pr = Array.isArray(lvl.prerequisites) ? lvl.prerequisites : []
        const next = pr.filter((p) => p && p.levelId !== deletedId)
        if (next.length !== pr.length) {
            storageService.saveLevel({ ...lvl, prerequisites: next })
        }
    }
}

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

        const rawPrereqs = Array.isArray(levelData.prerequisites)
            ? levelData.prerequisites
            : []
        const prerequisites = normalizePrerequisiteRules(
            levelData.id,
            rawPrereqs,
            levelIdExistsInProject
        )

        const proposed = {
            ...levelData,
            prerequisites,
            hidden: levelData.hidden === true,
            customSubfolder: normalizeCustomSubfolder(levelData.customSubfolder),
        }

        const resolveLevel = (id) => {
            if (id === proposed.id) return proposed
            const def = defaultLevels.find((l) => l.id === id)
            if (def) return def
            return storageService.loadLevel(id)
        }

        const dag = validateCustomPrerequisiteDAG(
            proposed,
            resolveLevel,
            isDefaultLevelId
        )
        if (!dag.ok) {
            throw new Error(dag.error)
        }

        return storageService.saveLevel({
            ...proposed,
            prerequisites: prerequisites.map(({ levelId, minRank }) => ({
                levelId,
                minRank,
            })),
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

        scrubPrerequisiteReferencesToDeletedId(levelId)
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

