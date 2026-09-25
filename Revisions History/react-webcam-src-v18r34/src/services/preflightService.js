/**
 * Pre-flight Checks Service
 * Verifies system readiness and configuration validity before execution
 */

import { TaskType } from '../components/Tasks/task'
import { audioProcessingService } from './audioProcessingService'
import { getSherpaOnnxReadyPromise } from './sherpaOnnxPreloadService'
import { audioManager } from './audioManager'
import { makeInstructionWarmupKey, storeInstructionWarmup } from './instructionAudioWarmup'

export function levelHasSpeakTask(level) {
    return Array.isArray(level?.tasks) && level.tasks.some((t) => t?.type === TaskType.SPEAK)
}

/**
 * R17-style audio warm-up: speak PCM worklet, AudioContext resume, optional Sherpa when level has Speak,
 * and resolve first-task instruction URL for fast first line.
 *
 * @param {object} options
 * @param {string} options.levelId - Runtime level id
 * @param {{ id: string|number, audio?: unknown, type?: string }|null|undefined} options.firstTask - First task as in gameplay (ids must match currentLevel when play starts)
 * @param {boolean} [options.preloadSherpa=true] - When false, skip Sherpa WASM load
 */
export async function warmAudioForPlay({ levelId, firstTask, preloadSherpa = true }) {
    await audioProcessingService.preloadSpeakPcmTapWorklet().catch((err) => {
        console.warn('[preflight warm] speak PCM worklet:', err)
    })

    const ctx = await audioProcessingService.ensureAudioContext()
    try {
        await ctx.resume()
    } catch {
        /* ignore */
    }

    if (preloadSherpa) {
        await getSherpaOnnxReadyPromise().catch((err) => {
            console.warn('[preflight warm] Sherpa:', err)
        })
    }

    if (firstTask?.audio != null && firstTask.audio !== '' && levelId != null) {
        try {
            const url = await audioManager.getAudioFile(firstTask.audio)
            if (url) {
                const key = makeInstructionWarmupKey(levelId, firstTask.id, firstTask.audio)
                storeInstructionWarmup(key, url)
            }
        } catch (err) {
            console.warn('[preflight warm] first instruction audio:', err)
        }
    }
}

/**
 * Convenience for level definitions from levelManager (task ids may not match runtime until mapped).
 */
export async function warmAudioForLevelDefinition(levelDefinition) {
    if (!levelDefinition?.id) return
    const tasks = levelDefinition.tasks || []
    const first = tasks[0]
    const preloadSherpa = levelHasSpeakTask(levelDefinition)
    await warmAudioForPlay({
        levelId: levelDefinition.id,
        firstTask: first
            ? { id: first.id ?? `tmp-${levelDefinition.id}-0`, audio: first.audio, type: first.type }
            : null,
        preloadSherpa,
    })
}

/**
 * Check webcam availability
 */
export async function checkWebcamAvailability() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            return {
                available: false,
                error: 'MediaDevices API not available'
            };
        }

        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        
        // Stop the stream immediately - we just needed to check availability
        stream.getTracks().forEach(track => track.stop());
        
        return { available: true };
    } catch (error) {
        let errorMessage = 'Webcam unavailable';
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            errorMessage = 'Webcam permission denied';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            errorMessage = 'No webcam device found';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            errorMessage = 'Webcam is being used by another application';
        } else {
            errorMessage = `Webcam error: ${error.message}`;
        }
        
        return {
            available: false,
            error: errorMessage
        };
    }
}

/**
 * Check required dependencies
 */
export function checkDependencies() {
    const missing = [];
    
    // Check MediaDevices API
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        missing.push('MediaDevices API');
    }
    
    // Check IndexedDB
    if (!window.indexedDB) {
        missing.push('IndexedDB');
    }
    
    // Check localStorage
    try {
        localStorage.setItem('__test__', 'test');
        localStorage.removeItem('__test__');
    } catch (e) {
        missing.push('localStorage');
    }
    
    return {
        available: missing.length === 0,
        missing
    };
}

/**
 * Validate level structure
 */
export function validateLevelStructure(level) {
    const errors = [];
    
    if (!level) {
        errors.push('Level is required');
        return { valid: false, errors };
    }
    
    // Required fields
    if (!level.id || typeof level.id !== 'string') {
        errors.push('Level must have a valid id (string)');
    }
    
    if (!level.title || typeof level.title !== 'string') {
        errors.push('Level must have a valid title (string)');
    }
    
    if (!Array.isArray(level.tasks)) {
        errors.push('Level must have a tasks array');
    } else {
        // Validate each task
        level.tasks.forEach((task, idx) => {
            if (!task.type) {
                errors.push(`Task[${idx}] must have a type`);
            }
            
            // Check audio references are valid (string, array of strings, or null/undefined)
            if (task.audio !== undefined && task.audio !== null) {
                const isString = typeof task.audio === 'string';
                const isArray = Array.isArray(task.audio) && task.audio.every(item => typeof item === 'string');
                if (!isString && !isArray) {
                    errors.push(`Task[${idx}].audio must be a string or array of strings if provided`);
                }
            }
        });
    }
    
    // Validate audioPackId exists if specified (basic check - actual pack existence checked elsewhere)
    if (level.audioPackId !== undefined && typeof level.audioPackId !== 'string') {
        errors.push('audioPackId must be a string if provided');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validate calibration data structure
 */
export function validateCalibrationData(calibrationData) {
    const errors = [];
    
    if (!calibrationData) {
        errors.push('Calibration data is required');
        return { valid: false, errors };
    }
    
    // Check required fields
    if (!Array.isArray(calibrationData.gridSquares)) {
        errors.push('gridSquares must be an array');
    } else {
        calibrationData.gridSquares.forEach((sq, idx) => {
            if (typeof sq.x !== 'number' || typeof sq.y !== 'number') {
                errors.push(`gridSquares[${idx}] must have numeric x and y properties`);
            }
        });
    }
    
    if (!calibrationData.baseColor || typeof calibrationData.baseColor !== 'object') {
        errors.push('baseColor is required and must be an object');
    } else {
        ['r', 'g', 'b'].forEach(component => {
            const value = calibrationData.baseColor[component];
            if (typeof value !== 'number' || value < 0 || value > 255) {
                errors.push(`baseColor.${component} must be a number between 0 and 255`);
            }
        });
    }
    
    if (!calibrationData.sensitivity || typeof calibrationData.sensitivity !== 'object') {
        errors.push('sensitivity is required and must be an object');
    } else {
        ['r', 'g', 'b'].forEach(component => {
            const value = calibrationData.sensitivity[component];
            if (typeof value !== 'number' || value < 0 || value > 255) {
                errors.push(`sensitivity.${component} must be a number between 0 and 255`);
            }
        });
    }
    
    if (!calibrationData.depthPercentages || typeof calibrationData.depthPercentages !== 'object') {
        errors.push('depthPercentages is required and must be an object');
    } else {
        const percentages = calibrationData.depthPercentages;
        ['1', '2', '3', '4'].forEach(depth => {
            const value = percentages[depth] ?? percentages[parseInt(depth)];
            if (typeof value !== 'number' || value < 0 || value > 100) {
                errors.push(`depthPercentages.${depth} must be a number between 0 and 100`);
            }
        });
        
        // Check depth percentages are strictly decreasing
        const p1 = percentages['1'] ?? percentages[1];
        const p2 = percentages['2'] ?? percentages[2];
        const p3 = percentages['3'] ?? percentages[3];
        const p4 = percentages['4'] ?? percentages[4];
        
        if (p1 <= p2) {
            errors.push('depthPercentages.1 must be greater than depthPercentages.2');
        }
        if (p2 <= p3) {
            errors.push('depthPercentages.2 must be greater than depthPercentages.3');
        }
        if (p3 <= p4) {
            errors.push('depthPercentages.3 must be greater than depthPercentages.4');
        }
    }
    
    if (typeof calibrationData.hysteresis !== 'number' || calibrationData.hysteresis < 0) {
        errors.push('hysteresis must be a non-negative number');
    }

    // Validate clapSensitivity (optional for backward compatibility)
    if (calibrationData.clapSensitivity !== undefined) {
        if (typeof calibrationData.clapSensitivity !== 'number' || calibrationData.clapSensitivity < 0 || calibrationData.clapSensitivity > 1) {
            errors.push('clapSensitivity must be a number between 0 and 1');
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Run all pre-flight checks
 */
export async function runAllChecks(config) {
    const results = {
        webcam: null,
        dependencies: null,
        levelStructure: null,
        calibrationData: null
    };
    
    // Webcam check
    results.webcam = await checkWebcamAvailability();
    
    // Dependencies check
    results.dependencies = checkDependencies();
    
    // Level structure validation
    if (config.level) {
        results.levelStructure = validateLevelStructure(config.level);
    }
    
    // Calibration data validation
    if (config.calibrationData) {
        results.calibrationData = validateCalibrationData(config.calibrationData);
    }
    
    // Determine if all checks passed
    const passed = Object.values(results).every(result => 
        result === null || result.valid !== false
    );
    
    return {
        passed,
        results
    };
}

export const preflightService = {
    checkWebcamAvailability,
    checkDependencies,
    validateLevelStructure,
    validateCalibrationData,
    runAllChecks,
    warmAudioForPlay,
    warmAudioForLevelDefinition,
    levelHasSpeakTask,
};
