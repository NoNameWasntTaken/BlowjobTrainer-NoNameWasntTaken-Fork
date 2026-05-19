/**
 * Audio Resolver - Resolves string references like "Category.KEY" to actual audio paths
 * Supports both default AUDIO object and custom audio packs
 */

import { AUDIO } from '../components/Tasks/audio'

/**
 * Case-insensitive category matching helper
 * NOTE: Matching is case-insensitive. Custom audio packs should not use both "Sfx" and "SFX" 
 * as categories, as only the first match will be returned.
 */
const findCategoryCaseInsensitive = (category, audioObject) => {
    if (!category || typeof category !== 'string') {
        return null
    }
    
    const lowerCategory = category.toLowerCase()
    for (const key in audioObject) {
        if (key.toLowerCase() === lowerCategory) {
            return key // Return original case key
        }
    }
    return null
}

/**
 * Resolves an audio reference to a file path or array of paths
 * @param {string|string[]|object} audioRef - Can be:
 *   - String: "Category.KEY" (e.g., "Feedback.PERFECT")
 *   - String: Direct path (e.g., "audio/feedback/perfect.mp3")
 *   - Array: ["Category.KEY1", "Category.KEY2"]
 *   - Object: Direct audio object (backward compatibility)
 * @param {object} customAudioPack - Optional custom audio pack object (primary pack)
 * @param {object} fallbackPack - Optional fallback audio pack object (used if primary pack doesn't have the file)
 * @returns {string|string[]|null} - Resolved audio path(s) or null if not found
 */
export const resolveAudioReference = (audioRef, customAudioPack = null, fallbackPack = null) => {
    // Handle null/undefined
    if (!audioRef) {
        return null
    }

    // Backward compatibility: if it's already a path or array of paths, return as-is
    if (typeof audioRef === 'string' && audioRef.includes('/')) {
        return audioRef
    }
    if (Array.isArray(audioRef) && audioRef.length > 0 && typeof audioRef[0] === 'string' && audioRef[0].includes('/')) {
        return audioRef
    }

    // Handle string reference like "Category.KEY"
    if (typeof audioRef === 'string' && audioRef.includes('.')) {
        const [category, key] = audioRef.split('.')
        
        // Try custom pack first with case-insensitive matching
        if (customAudioPack && customAudioPack.audioFiles) {
            const actualCategory = findCategoryCaseInsensitive(category, customAudioPack.audioFiles)
            if (actualCategory) {
                const customValue = customAudioPack.audioFiles[actualCategory]?.[key]
                if (customValue !== undefined) {
                    return customValue
                }
            }
        }
        
        // Try fallback pack if provided
        if (fallbackPack && fallbackPack.audioFiles) {
            const actualCategory = findCategoryCaseInsensitive(category, fallbackPack.audioFiles)
            if (actualCategory) {
                const fallbackValue = fallbackPack.audioFiles[actualCategory]?.[key]
                if (fallbackValue !== undefined) {
                    return fallbackValue
                }
            }
        }
        
        // Fallback to default AUDIO with case-insensitive matching
        const actualCategory = findCategoryCaseInsensitive(category, AUDIO)
        if (actualCategory) {
            const defaultValue = AUDIO[actualCategory]?.[key]
            if (defaultValue !== undefined) {
                return defaultValue
            }
        }
        
        console.warn(`Audio reference not found: ${audioRef}`)
        return null
    }

    // Handle array of string references
    if (Array.isArray(audioRef)) {
        return audioRef.map(ref => resolveAudioReference(ref, customAudioPack, fallbackPack)).filter(Boolean)
    }

    // Backward compatibility: return object as-is (direct audio object)
    return audioRef
}

/**
 * Gets a random audio file from a reference (handles arrays)
 * @param {string|string[]|object} audioRef - Audio reference
 * @param {object} customAudioPack - Optional custom audio pack (primary)
 * @param {object} fallbackPack - Optional fallback audio pack
 * @returns {string|null} - Single audio file path or null
 */
export const getAudioFile = (audioRef, customAudioPack = null, fallbackPack = null) => {
    const resolved = resolveAudioReference(audioRef, customAudioPack, fallbackPack)
    
    if (!resolved) {
        return null
    }
    
    // Handle arrays - pick random
    if (Array.isArray(resolved)) {
        return resolved[Math.floor(Math.random() * resolved.length)]
    }
    
    return resolved
}

/**
 * Gets the string key for an audio path (reverse lookup)
 * @param {string} audioPath - Audio file path
 * @param {object} customAudioPack - Optional custom audio pack
 * @returns {string|null} - String reference like "Category.KEY" or null
 */
export const getAudioKey = (audioPath, customAudioPack = null) => {
    // Check custom pack first
    if (customAudioPack && customAudioPack.audioFiles) {
        for (const category in customAudioPack.audioFiles) {
            for (const key in customAudioPack.audioFiles[category]) {
                const value = customAudioPack.audioFiles[category][key]
                if (value === audioPath || (Array.isArray(value) && value.includes(audioPath))) {
                    return `${category}.${key}`
                }
            }
        }
    }
    
    // Check default AUDIO
    for (const category in AUDIO) {
        if (typeof AUDIO[category] === 'object') {
            for (const key in AUDIO[category]) {
                const value = AUDIO[category][key]
                if (value === audioPath || (Array.isArray(value) && value.includes(audioPath))) {
                    return `${category}.${key}`
                }
            }
        }
    }
    
    return null
}

