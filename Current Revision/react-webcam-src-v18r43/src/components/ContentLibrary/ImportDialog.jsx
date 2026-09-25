import React, { useState } from 'react'
import { audioManager } from '../../services/audioManager'
import { PackIdConflictError } from '../../services/audioManager'
import { X } from 'react-feather'

const ImportDialog = ({ onClose, onSuccess }) => {
    const [importing, setImporting] = useState(false)
    const [error, setError] = useState(null)
    const [warnings, setWarnings] = useState([])
    const [conflictInfo, setConflictInfo] = useState(null)
    const [newPackId, setNewPackId] = useState('')
    const [selectedFile, setSelectedFile] = useState(null)

    const handleImport = async (file, options = {}) => {
        setImporting(true)
        setError(null)
        setWarnings([])
        setConflictInfo(null)

        try {
            const result = await audioManager.importPack(file, options)
            
            if (result.warnings && result.warnings.length > 0) {
                setWarnings(result.warnings)
            }
            
            onSuccess()
        } catch (err) {
            if (err instanceof PackIdConflictError) {
                setConflictInfo({
                    existingId: err.existingId,
                    existingName: err.existingName
                })
            } else {
                setError(err.message)
            }
        } finally {
            setImporting(false)
        }
    }

    const handleFileChange = (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        setSelectedFile(file)
        handleImport(file)
        e.target.value = ''
    }

    const handleOverwrite = () => {
        if (conflictInfo && selectedFile) {
            handleImport(selectedFile, { overwrite: true })
        }
    }

    const handleRename = () => {
        if (conflictInfo && newPackId.trim() && selectedFile) {
            handleImport(selectedFile, { newId: newPackId.trim() })
        }
    }

    return (
        <div className="import-dialog-overlay" onClick={onClose}>
            <div className="import-dialog" onClick={(e) => e.stopPropagation()}>
                <div className="dialog-header">
                    <h3>Import Voice Pack</h3>
                    <button className="button-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="dialog-content">
                    {!conflictInfo ? (
                        <>
                            <p>Select a ZIP file to import:</p>
                            <input
                                type="file"
                                accept=".zip"
                                onChange={handleFileChange}
                                disabled={importing}
                            />
                            {importing && <p>Importing...</p>}
                        </>
                    ) : (
                        <div>
                            <p>
                                Pack "{conflictInfo.existingName}" (ID: {conflictInfo.existingId}) already exists.
                            </p>
                            <div style={{ marginTop: '16px' }}>
                                <button className="button" onClick={handleOverwrite} disabled={importing}>
                                    Overwrite
                                </button>
                                <div style={{ marginTop: '12px' }}>
                                    <label>Or enter a new Pack ID:</label>
                                    <input
                                        type="text"
                                        value={newPackId}
                                        onChange={(e) => setNewPackId(e.target.value)}
                                        style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                                    />
                                    <button
                                        className="button"
                                        onClick={handleRename}
                                        disabled={importing || !newPackId.trim()}
                                        style={{ marginTop: '8px' }}
                                    >
                                        Import with New ID
                                    </button>
                                </div>
                                <button className="button" onClick={onClose} style={{ marginTop: '12px' }}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div style={{ padding: '12px', backgroundColor: 'color-mix(in srgb, var(--danger) 14%, var(--surface))', color: 'var(--danger)', borderRadius: '4px', marginTop: '12px' }}>
                            <strong>Error:</strong> {error}
                        </div>
                    )}

                    {warnings.length > 0 && (
                        <div style={{ padding: '12px', backgroundColor: 'color-mix(in srgb, var(--danger) 14%, var(--surface))', color: 'var(--danger)', borderRadius: '4px', marginTop: '12px' }}>
                            <strong>Warnings:</strong>
                            <ul style={{ marginTop: '8px', marginBottom: 0 }}>
                                {warnings.map((warning, index) => (
                                    <li key={index}>{warning}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ImportDialog
