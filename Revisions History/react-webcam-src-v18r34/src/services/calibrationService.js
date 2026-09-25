/**
 * Calibration Service
 * Manages calibration data import/export, validation, and application
 * Uses multi-grid format (v2.0)
 */

import { store } from '../store';
import {
    gridsAtom,
    selectedGridIdAtom,
    gridDepthPercentAtom,
    ballsDepthPercentAtom,
    percentHysterisisAtom
} from '../atoms/gridAtoms';
import { clapSensitivityAtom } from '../atoms/markersAtoms';
import {
    sfxVolumeAtom,
    voiceVolumeAtom,
    musicVolumeAtom,
    micInputDeviceIdAtom
} from '../atoms/audioAtom';
import { cameraRotationAtom } from '../atoms/cameraRotationAtom';
import {
    cameraVideoDeviceIdAtom,
    cameraViewportHeightCapAtom,
    clampCameraViewportHeightCap,
    CAMERA_VIEWPORT_HEIGHT_CAP_MIN,
    CAMERA_VIEWPORT_HEIGHT_CAP_MAX
} from '../atoms/cameraAtom';
import { normalizeRotation } from '../utils/previewToBufferCoords';
import { listVideoInputDeviceIdSet, listAudioInputDeviceIdSet } from '../utils/mediaDeviceEnumeration';

/**
 * Validate that grids don't have overlapping squares
 */
function validateGridOverlaps(grids) {
    const errors = [];
    const squareMap = new Map(); // key: "x,y", value: gridId

    for (const grid of grids) {
        if (!grid.squares || !Array.isArray(grid.squares)) continue;

        for (const square of grid.squares) {
            const key = `${square.x},${square.y}`;
            if (squareMap.has(key)) {
                const existingGridId = squareMap.get(key);
                errors.push(
                    `Square at (${square.x}, ${square.y}) is used by multiple grids: "${grid.id}" and "${existingGridId}"`
                );
            } else {
                squareMap.set(key, grid.id);
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Export current calibration data in multi-grid format (v2.0)
 */
export function exportCalibration() {
    const grids = store.get(gridsAtom);
    const depthPercentages = store.get(gridDepthPercentAtom);
    const hysteresis = store.get(percentHysterisisAtom);
    const clapSensitivity = store.get(clapSensitivityAtom);

    const ballsDepthPercentage = store.get(ballsDepthPercentAtom);

    // Export grids with their individual properties
    const exportedGrids = grids.map(grid => ({
        id: grid.id,
        name: grid.name,
        squares: grid.squares.map(sq => ({ x: sq.x, y: sq.y })),
        baseColor: {
            r: grid.baseColor?.r ?? 200,
            g: grid.baseColor?.g ?? 10,
            b: grid.baseColor?.b ?? 10
        },
        sensitivity: {
            r: grid.sensitivity?.r ?? 30,
            g: grid.sensitivity?.g ?? 30,
            b: grid.sensitivity?.b ?? 30
        },
        balls: grid.balls ?? false
    }));

    const sfxVolume = store.get(sfxVolumeAtom);
    const voiceVolume = store.get(voiceVolumeAtom);
    const musicVolume = store.get(musicVolumeAtom);
    const cameraRotation = store.get(cameraRotationAtom);
    const cameraViewportHeightCap = store.get(cameraViewportHeightCapAtom);
    const cameraDeviceId = store.get(cameraVideoDeviceIdAtom);
    const audioInputDeviceId = store.get(micInputDeviceIdAtom);

    const payload = {
        version: "2.0",
        timestamp: new Date().toISOString(),
        grids: exportedGrids,
        depthPercentages: {
            "1": depthPercentages[1],
            "2": depthPercentages[2],
            "3": depthPercentages[3],
            "4": depthPercentages[4]
        },
        ballsDepthPercentage,
        hysteresis: hysteresis,
        clapSensitivity: clapSensitivity,
        sfxVolume,
        voiceVolume,
        musicVolume,
        cameraRotation,
        cameraViewportHeightCap
    };

    if (typeof cameraDeviceId === 'string' && cameraDeviceId.length > 0) {
        payload.cameraDeviceId = cameraDeviceId;
    }
    if (typeof audioInputDeviceId === 'string' && audioInputDeviceId.length > 0) {
        payload.audioInputDeviceId = audioInputDeviceId;
    }

    return payload;
}

/**
 * Validate calibration data structure and values (v2.0 multi-grid format only)
 */
export function validateCalibration(data) {
    const errors = [];

    if (!data) {
        errors.push('Calibration data is required');
        return { valid: false, errors };
    }

    // Check version - must be 2.0 or missing (will default to 2.0)
    if (data.version && data.version !== "2.0") {
        errors.push(`Unsupported calibration format version: ${data.version}. Only version 2.0 (multi-grid) is supported.`);
        return { valid: false, errors };
    }

    // Validate grids array
    if (!Array.isArray(data.grids)) {
        errors.push('grids must be an array');
    } else {
        // Validate each grid
        data.grids.forEach((grid, gridIdx) => {
            if (!grid || typeof grid !== 'object') {
                errors.push(`grids[${gridIdx}] must be an object`);
                return;
            }

            // Validate grid id
            if (typeof grid.id !== 'string' || grid.id.trim() === '') {
                errors.push(`grids[${gridIdx}].id must be a non-empty string`);
            }

            // Validate grid name
            if (typeof grid.name !== 'string' || grid.name.trim() === '') {
                errors.push(`grids[${gridIdx}].name must be a non-empty string`);
            }

            // Validate squares array
            if (!Array.isArray(grid.squares)) {
                errors.push(`grids[${gridIdx}].squares must be an array`);
            } else {
                grid.squares.forEach((sq, sqIdx) => {
                    if (!sq || typeof sq !== 'object') {
                        errors.push(`grids[${gridIdx}].squares[${sqIdx}] must be an object`);
                        return;
                    }
                    if (typeof sq.x !== 'number' || typeof sq.y !== 'number') {
                        errors.push(`grids[${gridIdx}].squares[${sqIdx}] must have numeric x and y properties`);
                    }
                });
            }

            // Validate baseColor
            if (!grid.baseColor || typeof grid.baseColor !== 'object') {
                errors.push(`grids[${gridIdx}].baseColor is required and must be an object`);
            } else {
                ['r', 'g', 'b'].forEach(component => {
                    const value = grid.baseColor[component];
                    if (typeof value !== 'number' || value < 0 || value > 255) {
                        errors.push(`grids[${gridIdx}].baseColor.${component} must be a number between 0 and 255`);
                    }
                });
            }

            // Validate sensitivity
            if (!grid.sensitivity || typeof grid.sensitivity !== 'object') {
                errors.push(`grids[${gridIdx}].sensitivity is required and must be an object`);
            } else {
                ['r', 'g', 'b'].forEach(component => {
                    const value = grid.sensitivity[component];
                    if (typeof value !== 'number' || value < 0 || value > 255) {
                        errors.push(`grids[${gridIdx}].sensitivity.${component} must be a number between 0 and 255`);
                    }
                });
            }

            // Validate balls (optional)
            if (grid.balls !== undefined && typeof grid.balls !== 'boolean') {
                errors.push(`grids[${gridIdx}].balls must be a boolean if present`);
            }
        });

        // Check for overlapping squares between grids
        if (data.grids.length > 0) {
            const overlapValidation = validateGridOverlaps(data.grids);
            if (!overlapValidation.valid) {
                errors.push(...overlapValidation.errors);
            }
        }
    }

    // Validate global depthPercentages
    if (!data.depthPercentages || typeof data.depthPercentages !== 'object') {
        errors.push('depthPercentages is required and must be an object');
    } else {
        const percentages = data.depthPercentages;
        ['1', '2', '3', '4'].forEach(depth => {
            const value = percentages[depth];
            if (typeof value !== 'number' || value < 0 || value > 100) {
                errors.push(`depthPercentages.${depth} must be a number between 0 and 100`);
            }
        });

        // Check depth percentages are strictly decreasing
        if (percentages['1'] <= percentages['2']) {
            errors.push('depthPercentages.1 must be greater than depthPercentages.2');
        }
        if (percentages['2'] <= percentages['3']) {
            errors.push('depthPercentages.2 must be greater than depthPercentages.3');
        }
        if (percentages['3'] <= percentages['4']) {
            errors.push('depthPercentages.3 must be greater than depthPercentages.4');
        }
    }

    // Validate hysteresis
    if (typeof data.hysteresis !== 'number' || data.hysteresis < 0) {
        errors.push('hysteresis must be a non-negative number');
    }

    // Check that depthPercentages.4 - hysteresis >= 0
    if (data.depthPercentages && data.hysteresis !== undefined) {
        if (data.depthPercentages['4'] - data.hysteresis < 0) {
            errors.push('depthPercentages.4 minus hysteresis cannot be negative');
        }
    }

    // Validate clapSensitivity (optional)
    if (data.clapSensitivity !== undefined) {
        if (typeof data.clapSensitivity !== 'number' || data.clapSensitivity < 0 || data.clapSensitivity > 1) {
            errors.push('clapSensitivity must be a number between 0 and 1');
        }
    }

    // Validate ballsDepthPercentage (optional)
    if (data.ballsDepthPercentage !== undefined) {
        if (typeof data.ballsDepthPercentage !== 'number' || data.ballsDepthPercentage < 0 || data.ballsDepthPercentage > 100) {
            errors.push('ballsDepthPercentage must be a number between 0 and 100');
        }
    }

    const validateOptionalVolume = (key) => {
        const v = data[key];
        if (v === undefined || v === null) return;
        if (typeof v !== 'number' || Number.isNaN(v) || v < 0 || v > 1) {
            errors.push(`${key} must be a number between 0 and 1`);
        }
    };
    validateOptionalVolume('sfxVolume');
    validateOptionalVolume('voiceVolume');
    validateOptionalVolume('musicVolume');

    if (data.cameraRotation !== undefined && data.cameraRotation !== null) {
        if (typeof data.cameraRotation !== 'number' || Number.isNaN(data.cameraRotation)) {
            errors.push('cameraRotation must be a number');
        }
    }

    if (data.cameraViewportHeightCap !== undefined && data.cameraViewportHeightCap !== null) {
        const v = data.cameraViewportHeightCap;
        if (typeof v !== 'number' || Number.isNaN(v) || v < CAMERA_VIEWPORT_HEIGHT_CAP_MIN || v > CAMERA_VIEWPORT_HEIGHT_CAP_MAX) {
            errors.push(
                `cameraViewportHeightCap must be a number between ${CAMERA_VIEWPORT_HEIGHT_CAP_MIN} and ${CAMERA_VIEWPORT_HEIGHT_CAP_MAX}`
            );
        }
    }

    const validateOptionalDeviceId = (key) => {
        const v = data[key];
        if (v === undefined || v === null) return;
        if (typeof v !== 'string' || v.trim() === '') {
            errors.push(`${key} must be a non-empty string when provided`);
        }
    };
    validateOptionalDeviceId('cameraDeviceId');
    validateOptionalDeviceId('audioInputDeviceId');

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Strip device id fields that are not currently available (after permission + enumerate).
 * `null` in JSON means not specified — caller should omit those keys before calling this.
 *
 * @param {object} data - validated calibration payload
 * @returns {Promise<object>}
 */
export async function resolveCalibrationDevices(data) {
    const out = { ...data };
    try {
        if (typeof out.cameraDeviceId === 'string' && out.cameraDeviceId.length > 0) {
            const ids = await listVideoInputDeviceIdSet();
            if (!ids.has(out.cameraDeviceId)) {
                delete out.cameraDeviceId;
            }
        }
        if (typeof out.audioInputDeviceId === 'string' && out.audioInputDeviceId.length > 0) {
            const ids = await listAudioInputDeviceIdSet();
            if (!ids.has(out.audioInputDeviceId)) {
                delete out.audioInputDeviceId;
            }
        }
    } catch (e) {
        console.warn('Calibration device resolution skipped:', e);
        delete out.cameraDeviceId;
        delete out.audioInputDeviceId;
    }
    return out;
}

/**
 * Import calibration data (with validation and device-id resolution)
 * @returns {Promise<{ success: boolean, errors: string[] }>}
 */
export async function importCalibration(data) {
    const validation = validateCalibration(data);
    if (!validation.valid) {
        return { success: false, errors: validation.errors };
    }

    try {
        const resolved = await resolveCalibrationDevices(data);
        applyCalibration(resolved);
        return { success: true, errors: [] };
    } catch (error) {
        return { success: false, errors: [error.message] };
    }
}

/**
 * Apply calibration after resolving device ids (no validation — caller must validate if needed).
 * @returns {Promise<void>}
 */
export async function applyCalibrationWithDeviceResolution(data) {
    const resolved = await resolveCalibrationDevices(data);
    applyCalibration(resolved);
}

/**
 * Apply calibration data to atoms (v2.0 multi-grid format only)
 */
export function applyCalibration(data) {
    // Validate format first
    if (data.version && data.version !== "2.0") {
        throw new Error(`Unsupported calibration format version: ${data.version}. Only version 2.0 (multi-grid) is supported.`);
    }

    if (!Array.isArray(data.grids)) {
        throw new Error('grids array is required for v2.0 format');
    }

    // Check for overlapping squares before applying
    const overlapValidation = validateGridOverlaps(data.grids);
    if (!overlapValidation.valid) {
        throw new Error(`Invalid calibration data: ${overlapValidation.errors.join('; ')}`);
    }

    // Apply grids
    const importedGrids = data.grids.map(grid => ({
        id: grid.id,
        name: grid.name,
        squares: grid.squares.map(sq => ({ x: sq.x, y: sq.y })),
        baseColor: {
            r: grid.baseColor.r,
            g: grid.baseColor.g,
            b: grid.baseColor.b
        },
        sensitivity: {
            r: grid.sensitivity.r,
            g: grid.sensitivity.g,
            b: grid.sensitivity.b
        },
        balls: grid.balls ?? false
    }));

    store.set(gridsAtom, importedGrids);

    // Set selected grid to first grid, or null if empty
    if (importedGrids.length > 0) {
        store.set(selectedGridIdAtom, importedGrids[0].id);
    } else {
        store.set(selectedGridIdAtom, null);
    }

    // Apply global depthPercentages
    if (data.depthPercentages) {
        store.set(gridDepthPercentAtom, {
            1: data.depthPercentages['1'] ?? data.depthPercentages[1],
            2: data.depthPercentages['2'] ?? data.depthPercentages[2],
            3: data.depthPercentages['3'] ?? data.depthPercentages[3],
            4: data.depthPercentages['4'] ?? data.depthPercentages[4]
        });
    }

    // Apply ballsDepthPercentage
    if (data.ballsDepthPercentage !== undefined) {
        store.set(ballsDepthPercentAtom, data.ballsDepthPercentage);
    }

    // Apply hysteresis
    if (data.hysteresis !== undefined) {
        store.set(percentHysterisisAtom, data.hysteresis);
    }

    // Apply clapSensitivity
    if (data.clapSensitivity !== undefined) {
        store.set(clapSensitivityAtom, data.clapSensitivity);
    }

    if (typeof data.sfxVolume === 'number' && !Number.isNaN(data.sfxVolume)) {
        store.set(sfxVolumeAtom, data.sfxVolume);
    }
    if (typeof data.voiceVolume === 'number' && !Number.isNaN(data.voiceVolume)) {
        store.set(voiceVolumeAtom, data.voiceVolume);
    }
    if (typeof data.musicVolume === 'number' && !Number.isNaN(data.musicVolume)) {
        store.set(musicVolumeAtom, data.musicVolume);
    }

    if (data.cameraRotation !== undefined && data.cameraRotation !== null) {
        store.set(cameraRotationAtom, normalizeRotation(data.cameraRotation));
    }

    if (
        typeof data.cameraViewportHeightCap === 'number' &&
        !Number.isNaN(data.cameraViewportHeightCap)
    ) {
        store.set(cameraViewportHeightCapAtom, clampCameraViewportHeightCap(data.cameraViewportHeightCap));
    }

    if (typeof data.cameraDeviceId === 'string' && data.cameraDeviceId.length > 0) {
        store.set(cameraVideoDeviceIdAtom, data.cameraDeviceId);
    }
    if (typeof data.audioInputDeviceId === 'string' && data.audioInputDeviceId.length > 0) {
        store.set(micInputDeviceIdAtom, data.audioInputDeviceId);
    }
}

/**
 * Save calibration profile to storage
 */
export function saveCalibrationProfile(profileId, data) {
    const profiles = getAllCalibrationProfiles();
    profiles[profileId] = {
        ...data,
        profileId,
        savedAt: new Date().toISOString()
    };
    localStorage.setItem('calibration_profiles', JSON.stringify(profiles));
}

/**
 * Load calibration profile from storage
 */
export function loadCalibrationProfile(profileId) {
    const profiles = getAllCalibrationProfiles();
    return profiles[profileId] || null;
}

/**
 * Get all calibration profiles
 */
export function getAllCalibrationProfiles() {
    const data = localStorage.getItem('calibration_profiles');
    return data ? JSON.parse(data) : {};
}

/**
 * Delete calibration profile
 */
export function deleteCalibrationProfile(profileId) {
    const profiles = getAllCalibrationProfiles();
    delete profiles[profileId];
    localStorage.setItem('calibration_profiles', JSON.stringify(profiles));
}

export const calibrationService = {
    exportCalibration,
    importCalibration,
    validateCalibration,
    applyCalibration,
    resolveCalibrationDevices,
    applyCalibrationWithDeviceResolution,
    saveCalibrationProfile,
    loadCalibrationProfile,
    getAllCalibrationProfiles,
    deleteCalibrationProfile
};
