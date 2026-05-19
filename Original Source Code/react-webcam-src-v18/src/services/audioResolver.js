/**
 * Audio Resolver - Resolves string references like "Category.KEY" to actual audio paths
 * Supports both default AUDIO object and custom audio packs
 */

import { AUDIO } from '../components/Tasks/audio'

/**
 * Resolves an audio reference to a file path or array of paths
 * @param {string|string[]|object} audioRef - Can be:
 *   - String: "Category.KEY" (e.g., "Feedback.PERFECT")
 *   - String: Direct path (e.g., "audio/feedback/perfect.mp3")
 *   - Array: ["Category.KEY1", "Category.KEY2"]
 *   - Object: Direct audio object (backward compatibility)
 * @param {object} customAudioPack - Optional custom audio pack object
 * @returns {string|string[]|null} - Resolved audio path(s) or null if not found
 */
export const resolveAudioReference = (audioRef, customAudioPack = null) => {
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
        
        // Try custom pack first
        if (customAudioPack && customAudioPack.audioFiles) {
            const customValue = customAudioPack.audioFiles[category]?.[key]
            if (customValue !== undefined) {
                return customValue
            }
        }
        
        // Fallback to default AUDIO
        const defaultValue = AUDIO[category]?.[key]
        if (defaultValue !== undefined) {
            return defaultValue
        }
        
        console.warn(`Audio reference not found: ${audioRef}`)
        return null
    }

    // Handle array of string references
    if (Array.isArray(audioRef)) {
        return audioRef.map(ref => resolveAudioReference(ref, customAudioPack)).filter(Boolean)
    }

    // Backward compatibility: return object as-is (direct audio object)
    return audioRef
}

/**
 * Gets a random audio file from a reference (handles arrays)
 * @param {string|string[]|object} audioRef - Audio reference
 * @param {object} customAudioPack - Optional custom audio pack
 * @returns {string|null} - Single audio file path or null
 */
export const getAudioFile = (audioRef, customAudioPack = null) => {
    const resolved = resolveAudioReference(audioRef, customAudioPack)
    
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

