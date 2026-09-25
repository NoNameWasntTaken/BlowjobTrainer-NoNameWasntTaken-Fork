/**
 * Validation Service
 * Provides methods for validating levels and audio packs
 */

import { levelManager } from './levelManager';
import { audioManager } from './audioManager';
import { preflightService } from './preflightService';

/**
 * Validate a level by ID
 */
export async function validateLevel(levelId) {
    const level = levelManager.getLevel(levelId);
    
    if (!level) {
        return {
            level: null,
            valid: false,
            errors: [`Level "${levelId}" not found`],
            warnings: []
        };
    }
    
    // Validate level structure
    const structureValidation = preflightService.validateLevelStructure(level);
    
    const errors = [...structureValidation.errors];
    const warnings = [];
    
    // Check audio references in tasks
    if (level.tasks && Array.isArray(level.tasks)) {
        level.tasks.forEach((task, idx) => {
            if (task.audio !== undefined && task.audio !== null) {
                // Basic check - audio should be a string
                if (typeof task.audio !== 'string') {
                    errors.push(`Task[${idx}].audio must be a string`);
                }
            }
        });
    }
    
    return {
        level,
        valid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Validate a level and its audio pack
 */
export async function validateLevelWithPack(levelId) {
    const levelResult = await validateLevel(levelId);
    
    if (!levelResult.valid || !levelResult.level) {
        return {
            ...levelResult,
            packExists: false,
            packErrors: []
        };
    }
    
    const level = levelResult.level;
    const packErrors = [];
    let packExists = true;
    
    // If level has audioPackId, verify pack exists
    if (level.audioPackId) {
        try {
            const pack = audioManager.loadPack(level.audioPackId);
            if (!pack) {
                packExists = false;
                packErrors.push(`Audio pack "${level.audioPackId}" not found`);
            }
        } catch (error) {
            packExists = false;
            packErrors.push(`Error checking audio pack: ${error.message}`);
        }
    }
    
    const valid = levelResult.valid && packExists;
    const errors = [...levelResult.errors, ...packErrors];
    
    return {
        level: levelResult.level,
        packExists,
        packErrors,
        valid,
        errors: errors,
        warnings: levelResult.warnings
    };
}

export const validationService = {
    validateLevel,
    validateLevelWithPack
};
