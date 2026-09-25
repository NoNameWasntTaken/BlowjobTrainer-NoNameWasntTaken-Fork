import React, { useState } from 'react';
import { exportCalibration } from './calibrationExportService';

function CalibrationExport() {
    const [exporting, setExporting] = useState(false);
    const [exportSuccess, setExportSuccess] = useState(false);
    const [exportError, setExportError] = useState(null);

    const handleExport = async () => {
        setExporting(true);
        setExportSuccess(false);
        setExportError(null);

        try {
            const result = await exportCalibration();

            if (result.success) {
                if (result.data) {
                    // Browser mode: trigger blob download
                    const dataStr = JSON.stringify(result.data, null, 2);
                    const dataBlob = new Blob([dataStr], { type: 'application/json' });
                    const url = URL.createObjectURL(dataBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'calibration_data.json';
                    link.click();
                    URL.revokeObjectURL(url);
                }
                setExportSuccess(true);
                setTimeout(() => setExportSuccess(false), 3000);
            } else if (result.canceled) {
                // User canceled save dialog - no feedback needed
            } else {
                setExportError(result.error || 'Export failed');
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
