import React, { useState } from 'react'
import { musicTrackManager } from '../../services/musicTrackManager'
import { X } from 'react-feather'

const MusicTrackImportDialog = ({ onClose, onSuccess }) => {
    const [importing, setImporting] = useState(false)
    const [error, setError] = useState(null)

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return

        setImporting(true)
        setError(null)
        try {
            await musicTrackManager.importTrack(file)
            onSuccess()
        } catch (err) {
            setError(err.message || 'Import failed')
        } finally {
            setImporting(false)
        }
    }

    return (
        <div className="import-dialog-overlay" onClick={onClose}>
            <div className="import-dialog" onClick={(ev) => ev.stopPropagation()}>
                <div className="dialog-header">
                    <h3>Import Background Track</h3>
                    <button type="button" className="button-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <div className="dialog-content">
                    <p>Select an audio file (MP3, WAV, OGG, M4A):</p>
                    <input type="file" accept=".mp3,.wav,.ogg,.m4a,audio/*" onChange={handleFileChange} disabled={importing} />
                    {importing && <p>Importing…</p>}
                    {error && <p style={{ color: '#c00' }}>{error}</p>}
                </div>
            </div>
        </div>
    )
}

export default MusicTrackImportDialog
