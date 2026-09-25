import React, { useState, useRef } from 'react';
import { calibrationService } from '../../services/calibrationService';

function CalibrationImport() {
    const [importing, setImporting] = useState(false);
    const [importSuccess, setImportSuccess] = useState(false);
    const [importError, setImportError] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileSelect = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImporting(true);
        setImportSuccess(false);
        setImportError(null);

        try {
            const fileContent = await file.text();
            const calibrationData = JSON.parse(fileContent);

            const result = await calibrationService.importCalibration(calibrationData);
            
            if (result.success) {
                setImportSuccess(true);
                setTimeout(() => setImportSuccess(false), 3000);
            } else {
                setImportError(result.errors.join(', ') || 'Import failed');
            }
        } catch (error) {
            setImportError(error.message || 'Failed to parse calibration file');
        } finally {
            setImporting(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="row-centered margin-y">
            <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
            />
            <button
                className="button padding-x"
                onClick={handleImportClick}
                disabled={importing}
            >
                {importing ? 'Importing...' : 'Import Calibration'}
            </button>
            {importSuccess && (
                <span className="margin-x" style={{ color: 'green' }}>
                    Calibration imported successfully!
                </span>
            )}
            {importError && (
                <span className="margin-x" style={{ color: 'red' }}>
                    Error: {importError}
                </span>
            )}
        </div>
    );
}

export default CalibrationImport;
