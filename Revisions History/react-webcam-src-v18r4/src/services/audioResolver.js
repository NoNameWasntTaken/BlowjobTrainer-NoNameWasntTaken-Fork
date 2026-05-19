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
 * Find which category.key in default AUDIO contains a given path or array
 * @param {string|string[]} audioRef - Path or array of paths to find
 * @returns {object|null} - {category, key} or null if not found
 */
const findKeyInDefaultAudio = (audioRef) => {
    if (!audioRef) return null
    
    const searchPaths = Array.isArray(audioRef) ? audioRef : [audioRef]
    
    for (const category in AUDIO) {
        if (typeof AUDIO[category] === 'object') {
            for (const key in AUDIO[category]) {
                const value = AUDIO[category][key]
                
                if (Array.isArray(audioRef)) {
                    // For arrays, check if this key's value matches the array structure
                    if (Array.isArray(value)) {
                        // Check if arrays match (same length and all paths present)
                        if (value.length === audioRef.length && 
                            audioRef.every(path => value.includes(path))) {
                            return { category, key }
                        }
                    }
                } else {
                    // For single paths, check exact match or if in array
                    if (value === audioRef || (Array.isArray(value) && value.includes(audioRef))) {
                        return { category, key }
                    }
                }
            }
        }
    }
    
    return null
}

/**
 * Find a direct path in an audio pack structure (reverse lookup)
 * Returns the pack's value for that path if found, or null
 * @param {string} audioPath - Direct audio path to look up
 * @param {object} audioPack - Audio pack object to search in
 * @returns {string|string[]|null} - The pack's value for this path, or null if not found
 */
const findPathInPack = (audioPath, audioPack) => {
    if (!audioPack || !audioPack.audioFiles || !audioPath || typeof audioPath !== 'string') {
        return null
    }
    
    // First, try to find which category.key this path belongs to in default AUDIO
    const defaultKey = findKeyInDefaultAudio(audioPath)
    if (defaultKey) {
        // Check if the pack has a replacement for this category.key
        const actualCategory = findCategoryCaseInsensitive(defaultKey.category, audioPack.audioFiles)
        if (actualCategory) {
            const packValue = audioPack.audioFiles[actualCategory]?.[defaultKey.key]
            if (packValue !== undefined) {
                return packValue
            }
        }
    }
    
    // Fallback: direct search (for custom paths not in default AUDIO)
    for (const category in audioPack.audioFiles) {
        for (const key in audioPack.audioFiles[category]) {
            const value = audioPack.audioFiles[category][key]
            
            if (value === audioPath || (Array.isArray(value) && value.includes(audioPath))) {
                return value
            }
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

    // Handle direct path (string with '/'): check custom packs first via reverse lookup
    if (typeof audioRef === 'string' && audioRef.includes('/')) {
        // Try custom pack first
        const customMatch = findPathInPack(audioRef, customAudioPack)
        if (customMatch !== null) {
            return customMatch
        }
        
        // Try fallback pack
        const fallbackMatch = findPathInPack(audioRef, fallbackPack)
        if (fallbackMatch !== null) {
            return fallbackMatch
        }
        
        // Not found in any pack, return original path (backward compatibility)
        return audioRef
    }
    
    // Handle array of direct paths: check if entire array maps to a single key in custom packs
    if (Array.isArray(audioRef) && audioRef.length > 0 && typeof audioRef[0] === 'string' && audioRef[0].includes('/')) {
        // First, find which category.key this array belongs to in default AUDIO
        const defaultKey = findKeyInDefaultAudio(audioRef)
        
        if (defaultKey) {
            // Check if custom pack has a replacement for this category.key
            if (customAudioPack && customAudioPack.audioFiles) {
                const actualCategory = findCategoryCaseInsensitive(defaultKey.category, customAudioPack.audioFiles)
                if (actualCategory) {
                    const packValue = customAudioPack.audioFiles[actualCategory]?.[defaultKey.key]
                    if (packValue !== undefined) {
                        // Pack has a replacement for this key - return it
                        return packValue
                    }
                }
            }
            
            // Check fallback pack
            if (fallbackPack && fallbackPack.audioFiles) {
                const actualCategory = findCategoryCaseInsensitive(defaultKey.category, fallbackPack.audioFiles)
                if (actualCategory) {
                    const packValue = fallbackPack.audioFiles[actualCategory]?.[defaultKey.key]
                    if (packValue !== undefined) {
                        return packValue
                    }
                }
            }
        }
        
        // No category.key match found - process each path individually
        const resolvedArray = audioRef.map(path => {
            const customMatch = findPathInPack(path, customAudioPack)
            if (customMatch !== null) {
                // Return the match (could be string or array, but for individual paths we'll take first if array)
                return Array.isArray(customMatch) ? customMatch[0] : customMatch
            }
            
            const fallbackMatch = findPathInPack(path, fallbackPack)
            if (fallbackMatch !== null) {
                return Array.isArray(fallbackMatch) ? fallbackMatch[0] : fallbackMatch
            }
            
            return path
        })
        
        return resolvedArray
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

