import React from 'react'
import { Check, Download, Trash2 } from 'react-feather'

const AudioPackCard = ({ pack, isActive, onActivate, onExport, onDelete }) => {
    const isDefault = pack.isDefault || pack.id === 'default'

    return (
        <div className={`audio-pack-card ${isActive ? 'active' : ''}`}>
            <div className="pack-header">
                <h3>{pack.name || pack.id}</h3>
            </div>
            
            <div className="pack-metadata">
                {pack.author && <div><strong>Author:</strong> {pack.author}</div>}
                {pack.version && <div><strong>Version:</strong> {pack.version}</div>}
                {pack.description && <div><strong>Description:</strong> {pack.description}</div>}
            </div>

            <div className="pack-actions">
                {isActive ? (
                    <span className="active-badge">
                        <Check size={16} /> Active
                    </span>
                ) : (
                    <button className="button" onClick={onActivate}>
                        Set Active
                    </button>
                )}
                {!isDefault && (
                    <>
                        <button className="button" onClick={onExport}>
                            <Download size={16} /> Export
                        </button>
                        <button className="button" onClick={onDelete} style={{ backgroundColor: '#d32f2f', color: 'white' }}>
                            <Trash2 size={16} /> Delete
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}

export default AudioPackCard
