import React from 'react'
import { Check, Trash2 } from 'react-feather'

const MusicTrackCard = ({ track, isActive, onSetActive, onDelete }) => {
    const showMetadata = !track.isSystemOption && (track.fileName || track.importedAt)
    return (
        <div className={`audio-pack-card ${isActive ? 'active' : ''}`}>
            <div className="pack-header">
                <h3>{track.name || track.id}</h3>
            </div>
            {showMetadata && (
                <div className="pack-metadata">
                    {track.fileName && <div><strong>File:</strong> {track.fileName}</div>}
                    {track.importedAt && <div><strong>Imported:</strong> {new Date(track.importedAt).toLocaleString()}</div>}
                </div>
            )}
            <div className="pack-actions">
                {isActive ? (
                    <span className="active-badge">
                        <Check size={16} /> Active
                    </span>
                ) : (
                    <button type="button" className="button" onClick={onSetActive}>
                        Set Active
                    </button>
                )}
                {onDelete && (
                    <button
                        type="button"
                        className="button"
                        onClick={onDelete}
                        style={{ backgroundColor: '#d32f2f', color: 'white' }}
                    >
                        <Trash2 size={16} /> Delete
                    </button>
                )}
            </div>
        </div>
    )
}

export default MusicTrackCard
