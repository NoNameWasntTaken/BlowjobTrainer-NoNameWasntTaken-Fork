import React, { useState, useEffect } from 'react'
import { audioManager } from '../../services/audioManager'
import { useAtomValue } from 'jotai'
import { activePackIdAtom } from '../../atoms/audioAtom'
import AudioPackCard from './AudioPackCard'
import ImportDialog from './ImportDialog'
import './ContentLibrary.css'

const ContentLibrary = () => {
    const [packs, setPacks] = useState([])
    const [showImportDialog, setShowImportDialog] = useState(false)
    const activePackId = useAtomValue(activePackIdAtom)

    useEffect(() => {
        loadPacks()
    }, [activePackId])

    const loadPacks = () => {
        const allPacks = audioManager.getAllPacks()
        setPacks(Object.values(allPacks))
    }

    const handleActivatePack = (packId) => {
        audioManager.setActiveCustomPack(packId)
    }

    const handleExportPack = async (packId) => {
        try {
            const zipBlob = await audioManager.exportPack(packId)
            
            const pack = audioManager.loadPack(packId)
            const packName = pack?.name || packId
            
            // Create download link
            const url = URL.createObjectURL(zipBlob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${packName}.zip`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        } catch (error) {
            alert(`Export failed: ${error.message}`)
        }
    }

    const handleDeletePack = async (packId) => {
        if (!window.confirm(`Are you sure you want to delete this pack? This cannot be undone.`)) {
            return
        }

        try {
            await audioManager.deletePack(packId)
            loadPacks()
            alert('Pack deleted successfully!')
        } catch (error) {
            alert(`Delete failed: ${error.message}`)
        }
    }

    const handleImportSuccess = () => {
        loadPacks()
        setShowImportDialog(false)
    }

    return (
        <div className="content-library">
            <h2>Content Library</h2>
            
            <div className="library-controls" style={{ marginBottom: '20px' }}>
                <button className="button button-primary" onClick={() => setShowImportDialog(true)}>
                    Import Pack
                </button>
            </div>

            <div className="packs-grid">
                {packs.map(pack => (
                    <AudioPackCard
                        key={pack.id}
                        pack={pack}
                        isActive={pack.id === (activePackId || 'default')}
                        onActivate={() => handleActivatePack(pack.id)}
                        onExport={() => handleExportPack(pack.id)}
                        onDelete={() => handleDeletePack(pack.id)}
                    />
                ))}
            </div>

            {showImportDialog && (
                <ImportDialog
                    onClose={() => setShowImportDialog(false)}
                    onSuccess={handleImportSuccess}
                />
            )}
        </div>
    )
}

export default ContentLibrary
