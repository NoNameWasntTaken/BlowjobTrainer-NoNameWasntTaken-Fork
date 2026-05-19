import React, { useState } from 'react';
import { calibrationService } from '../../services/calibrationService';
import { externalIntegrationService } from '../../services/externalIntegrationService';

function CalibrationExport() {
    const [exporting, setExporting] = useState(false);
    const [exportSuccess, setExportSuccess] = useState(false);
    const [exportError, setExportError] = useState(null);

    const handleExport = async () => {
        setExporting(true);
        setExportSuccess(false);
        setExportError(null);

        try {
            const calibrationData = calibrationService.exportCalibration();
            
            // Determine output path
            let outputPath = 'calibration_data.json';
            const cliOutputPath = externalIntegrationService.getOutputPath();
            if (cliOutputPath) {
                outputPath = cliOutputPath;
            }

            // Export via IPC
            if (window.electronAPI && window.electronAPI.writeSessionResults) {
                const result = await window.electronAPI.writeSessionResults(outputPath, calibrationData);
                if (result.success) {
                    setExportSuccess(true);
                    setTimeout(() => setExportSuccess(false), 3000);
                } else {
                    setExportError(result.error || 'Export failed');
                }
            } else {
                // Fallback: download as JSON file (browser mode)
                const dataStr = JSON.stringify(calibrationData, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'calibration_data.json';
                link.click();
                URL.revokeObjectURL(url);
                setExportSuccess(true);
                setTimeout(() => setExportSuccess(false), 3000);
            }
        } catch (error) {
            setExportError(error.message || 'Export failed');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="row-centered margin-y">
            <button
                className="button padding-x"
                onClick={handleExport}
                disabled={exporting}
            >
                {exporting ? 'Exporting...' : 'Export Calibration'}
            </button>
            {exportSuccess && (
                <span className="margin-x" style={{ color: 'green' }}>
                    Calibration exported successfully!
                </span>
            )}
            {exportError && (
                <span className="margin-x" style={{ color: 'red' }}>
                    Error: {exportError}
                </span>
            )}
        </div>
    );
}

export default CalibrationExport;
