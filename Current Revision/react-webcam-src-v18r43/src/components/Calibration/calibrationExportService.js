/**
 * Calibration Export Service
 * Shared logic for exporting calibration data in Electron (with save dialog or CLI path)
 * and browser (blob download fallback).
 */

import { calibrationService } from '../../services/calibrationService';
import { externalIntegrationService } from '../../services/externalIntegrationService';

const isElectron = () =>
    typeof window !== 'undefined' &&
    window.electronAPI &&
    typeof window.electronAPI.writeSessionResults === 'function';

/**
 * Export calibration data.
 * In Electron: uses --output path if set, otherwise shows save dialog. Default directory is app run directory.
 * In browser: returns data for component to trigger blob download.
 *
 * @returns {Promise<{ success: boolean, canceled?: boolean, error?: string, data?: object }>}
 */
export async function exportCalibration(sections) {
    const calibrationData = calibrationService.exportCalibration(sections);
    const cliOutputPath = externalIntegrationService.getOutputPath();

    if (isElectron()) {
        let outputPath = cliOutputPath;

        if (!outputPath && window.electronAPI.showCalibrationSaveDialog) {
            outputPath = await window.electronAPI.showCalibrationSaveDialog();
            if (!outputPath) {
                return { success: false, canceled: true };
            }
        }

        if (!outputPath) {
            return { success: false, error: 'No output path available' };
        }

        const result = await window.electronAPI.writeSessionResults(outputPath, calibrationData);
        if (result.success) {
            return { success: true };
        }
        return { success: false, error: result.error || 'Export failed' };
    }

    // Browser fallback: return data for component to trigger blob download
    return { success: true, data: calibrationData };
}
