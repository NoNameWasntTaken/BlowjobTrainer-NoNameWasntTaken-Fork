/**
 * Calibration Service
 * Manages calibration data import/export, validation, and application
 */

import { store } from '../store';
import {
    gridSquaresAtom,
    gridBaseColorAtom,
    gridSensitivityAtom,
    gridDepthPercentAtom,
    percentHysterisisAtom
} from '../atoms/gridAtoms';
import { clapSensitivityAtom } from '../atoms/markersAtoms';

/**
 * Export current calibration data
 */
export function exportCalibration() {
    const gridSquares = store.get(gridSquaresAtom);
    const baseColor = store.get(gridBaseColorAtom);
    const sensitivity = store.get(gridSensitivityAtom);
    const depthPercentages = store.get(gridDepthPercentAtom);
    const hysteresis = store.get(percentHysterisisAtom);
    const clapSensitivity = store.get(clapSensitivityAtom);

    return {
        version: "1.0",
        timestamp: new Date().toISOString(),
        gridSquares: gridSquares.map(sq => ({ x: sq.x, y: sq.y })),
        baseColor: { r: baseColor.r, g: baseColor.g, b: baseColor.b },
        sensitivity: { r: sensitivity.r, g: sensitivity.g, b: sensitivity.b },
        depthPercentages: {
            "1": depthPercentages[1],
            "2": depthPercentages[2],
            "3": depthPercentages[3],
            "4": depthPercentages[4]
        },
        hysteresis: hysteresis,
        clapSensitivity: clapSensitivity
    };
}

/**
 * Validate calibration data structure and values
 */
export function validateCalibration(data) {
    const errors = [];

    if (!data) {
        errors.push('Calibration data is required');
        return { valid: false, errors };
    }

    // Check required fields
    if (!Array.isArray(data.gridSquares)) {
        errors.push('gridSquares must be an array');
    } else {
        data.gridSquares.forEach((sq, idx) => {
            if (typeof sq.x !== 'number' || typeof sq.y !== 'number') {
                errors.push(`gridSquares[${idx}] must have numeric x and y properties`);
            }
        });
    }

    if (!data.baseColor || typeof data.baseColor !== 'object') {
        errors.push('baseColor is required and must be an object');
    } else {
        ['r', 'g', 'b'].forEach(component => {
            const value = data.baseColor[component];
            if (typeof value !== 'number' || value < 0 || value > 255) {
                errors.push(`baseColor.${component} must be a number between 0 and 255`);
            }
        });
    }

    if (!data.sensitivity || typeof data.sensitivity !== 'object') {
        errors.push('sensitivity is required and must be an object');
    } else {
        ['r', 'g', 'b'].forEach(component => {
            const value = data.sensitivity[component];
            if (typeof value !== 'number' || value < 0 || value > 255) {
                errors.push(`sensitivity.${component} must be a number between 0 and 255`);
            }
        });
    }

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

    if (typeof data.hysteresis !== 'number' || data.hysteresis < 0) {
        errors.push('hysteresis must be a non-negative number');
    }

    // Check that depthPercentages.4 - hysteresis >= 0
    if (data.depthPercentages && data.hysteresis !== undefined) {
        if (data.depthPercentages['4'] - data.hysteresis < 0) {
            errors.push('depthPercentages.4 minus hysteresis cannot be negative');
        }
    }

    // Validate clapSensitivity (optional for backward compatibility)
    if (data.clapSensitivity !== undefined) {
        if (typeof data.clapSensitivity !== 'number' || data.clapSensitivity < 0 || data.clapSensitivity > 1) {
            errors.push('clapSensitivity must be a number between 0 and 1');
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Import calibration data (with validation)
 */
export function importCalibration(data) {
    const validation = validateCalibration(data);
    if (!validation.valid) {
        return { success: false, errors: validation.errors };
    }

    try {
        applyCalibration(data);
        return { success: true, errors: [] };
    } catch (error) {
        return { success: false, errors: [error.message] };
    }
}

/**
 * Apply calibration data to atoms
 */
export function applyCalibration(data) {
    if (data.gridSquares) {
        store.set(gridSquaresAtom, data.gridSquares.map(sq => ({ x: sq.x, y: sq.y })));
    }

    if (data.baseColor) {
        store.set(gridBaseColorAtom, {
            r: data.baseColor.r,
            g: data.baseColor.g,
            b: data.baseColor.b
        });
    }

    if (data.sensitivity) {
        store.set(gridSensitivityAtom, {
            r: data.sensitivity.r,
            g: data.sensitivity.g,
            b: data.sensitivity.b
        });
    }

    if (data.depthPercentages) {
        store.set(gridDepthPercentAtom, {
            1: data.depthPercentages['1'] ?? data.depthPercentages[1],
            2: data.depthPercentages['2'] ?? data.depthPercentages[2],
            3: data.depthPercentages['3'] ?? data.depthPercentages[3],
            4: data.depthPercentages['4'] ?? data.depthPercentages[4]
        });
    }

    if (data.hysteresis !== undefined) {
        store.set(percentHysterisisAtom, data.hysteresis);
    }

    if (data.clapSensitivity !== undefined) {
        store.set(clapSensitivityAtom, data.clapSensitivity);
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
    saveCalibrationProfile,
    loadCalibrationProfile,
    getAllCalibrationProfiles,
    deleteCalibrationProfile
};
