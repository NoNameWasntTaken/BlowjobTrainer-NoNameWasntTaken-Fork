/**
 * External Integration Service
 * Manages CLI configuration and mode detection for external program control
 */

let cliConfigCache = null;

/**
 * Get CLI configuration using hybrid approach (immediate check + fallback polling)
 */
async function getCLIConfig() {
    // Check Electron environment
    if (typeof window === 'undefined' || !window.electronAPI) {
        return null;
    }
    
    if (typeof window.electronAPI.getCLIConfig !== 'function') {
        return null;
    }
    
    // Fast path: Try immediate call
    try {
        const config = await window.electronAPI.getCLIConfig();
        if (config !== null && config !== undefined) {
            cliConfigCache = config;
            return config;
        }
    } catch (error) {
        // IPC not ready yet, continue to polling
    }
    
    // Fallback: Poll with short intervals (max 1 second)
    const maxAttempts = 10;
    const pollInterval = 100;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
        try {
            const config = await window.electronAPI.getCLIConfig();
            if (config !== null && config !== undefined) {
                cliConfigCache = config;
                return config;
            }
        } catch (error) {
            // Continue polling
            continue;
        }
    }
    
    // No config found - running in normal mode
    return null;
}

/**
 * Check if external mode is active (any CLI parameter that changes behavior)
 */
function isExternalMode() {
    if (!cliConfigCache) return false;
    return !!(
        cliConfigCache.level ||
        cliConfigCache.calibrateOnly ||
        cliConfigCache.validateLevel ||
        cliConfigCache.skipCalibration ||
        cliConfigCache.autoStart ||
        cliConfigCache.calibrationTime !== -1 ||
        cliConfigCache.pauseTime !== -1 ||
        cliConfigCache.output
    );
}

/**
 * Check if mirror mode is enabled via CLI
 */
function getMirrorMode() {
    return cliConfigCache?.mirror === true;
}

/**
 * Check if CLI auto-start mode is active (minimal chrome: hide nav, begin session automatically).
 */
function isAutoStartMode() {
    return cliConfigCache?.autoStart === true;
}

/**
 * Check if calibration-only mode is active
 */
function isCalibrationOnlyMode() {
    return cliConfigCache?.calibrateOnly === true;
}

/**
 * Check if validation mode is active
 */
function isValidationMode() {
    return !!cliConfigCache?.validateLevel;
}

/**
 * Get output path for results
 */
function getOutputPath() {
    return cliConfigCache?.output || null;
}

/**
 * Check if calibration should be skipped
 */
function shouldSkipCalibration() {
    return cliConfigCache?.skipCalibration === true;
}

/**
 * Get calibration time limit (-1 = infinite)
 */
function getCalibrationTimeLimit() {
    return cliConfigCache?.calibrationTime ?? null;
}

/**
 * Get pause time limit (-1 = infinite)
 */
function getPauseTimeLimit() {
    return cliConfigCache?.pauseTime ?? null;
}

/**
 * Get level ID from CLI
 */
function getLevelId() {
    return cliConfigCache?.level || null;
}

/**
 * Get calibration data file path
 */
function getCalibrationDataPath() {
    return cliConfigCache?.calibrationData || null;
}

/**
 * Get audio pack ID from CLI
 */
function getAudioPackId() {
    return cliConfigCache?.audioPack || null;
}

/**
 * CLI --background-music track id (override when running with --level)
 */
function getBackgroundMusicId() {
    return cliConfigCache?.backgroundMusic || null;
}

/**
 * Get validation level ID
 */
function getValidationLevelId() {
    return cliConfigCache?.validateLevel || null;
}

/**
 * CLI --profile id (Electron). Does not imply external mode.
 */
function getProfileId() {
    return cliConfigCache?.profile ?? null;
}

/**
 * CLI --show-hidden (Electron). Cached after getCLIConfig(); initial UI uses sync preload + atom.
 */
function getShowHiddenContent() {
    return cliConfigCache?.showHidden === true;
}

export const externalIntegrationService = {
    getCLIConfig,
    getMirrorMode,
    isExternalMode,
    isAutoStartMode,
    isCalibrationOnlyMode,
    isValidationMode,
    getOutputPath,
    shouldSkipCalibration,
    getCalibrationTimeLimit,
    getPauseTimeLimit,
    getLevelId,
    getCalibrationDataPath,
    getAudioPackId,
    getBackgroundMusicId,
    getValidationLevelId,
    getProfileId,
    getShowHiddenContent,
};
