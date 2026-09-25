import React, { useState, useEffect, useCallback } from 'react'
import { audioManager } from '../../services/audioManager'
import { musicTrackManager } from '../../services/musicTrackManager'
import { exportAudioPackToFile } from '../../services/audioPackExportService'
import { useAtomValue } from 'jotai'
import { activePackIdAtom, activeBackgroundTrackIdAtom } from '../../atoms/audioAtom'
import { showHiddenContentAtom } from '../../atoms/hiddenContentAtom'
import { isVisibleInUi } from '../../utils/hiddenContentVisibility'
import { storageService } from '../../services/storageService'
import AudioPackCard from './AudioPackCard'
import ImportDialog from './ImportDialog'
import MusicTrackCard from './MusicTrackCard'
import MusicTrackImportDialog from './MusicTrackImportDialog'
import './ContentLibrary.css'

const ContentLibrary = () => {
    const [packs, setPacks] = useState([])
    const [musicTracks, setMusicTracks] = useState([])
    const [showImportDialog, setShowImportDialog] = useState(false)
    const [showMusicImportDialog, setShowMusicImportDialog] = useState(false)
    const activePackId = useAtomValue(activePackIdAtom)
    const activeMusicTrackId = useAtomValue(activeBackgroundTrackIdAtom)
    const showHiddenContent = useAtomValue(showHiddenContentAtom)

    const loadPacks = useCallback(() => {
        const allPacks = Object.values(audioManager.getAllPacks()).filter(
            (p) => p.isDefault || isVisibleInUi(p, showHiddenContent)
        )
        setPacks(allPacks)
    }, [showHiddenContent])

    const loadMusicTracks = useCallback(() => {
        const all = Object.values(musicTrackManager.getAllTracks()).filter((t) =>
            isVisibleInUi(t, showHiddenContent)
        )
        setMusicTracks(all)
    }, [showHiddenContent])

    useEffect(() => {
        loadPacks()
    }, [activePackId, loadPacks])

    useEffect(() => {
        loadMusicTracks()
    }, [activeMusicTrackId, loadMusicTracks])

    const handlePackHiddenChange = (packId, hidden) => {
        const pack = audioManager.loadPack(packId)
        if (!pack) return
        audioManager.savePack({ ...pack, hidden })
        loadPacks()
    }

    const handleTrackHiddenChange = (trackId, hidden) => {
        const tr = musicTrackManager.getTrack(trackId)
        if (!tr) return
        storageService.saveBackgroundTrack({ ...tr, hidden })
        loadMusicTracks()
    }

    const handleActivatePack = (packId) => {
        audioManager.setActiveCustomPack(packId)
    }

    const handleExportPack = async (packId) => {
        try {
            const zipBlob = await audioManager.exportPack(packId)
            const pack = audioManager.loadPack(packId)
            const fileName = `${pack?.name || packId}.zip`

            const result = await exportAudioPackToFile(zipBlob, fileName)

            if (result.success) {
                if (result.blob) {
                    // Browser: trigger blob download
                    const url = URL.createObjectURL(result.blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = fileName
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(url)
                }
            } else if (!result.canceled) {
                alert(`Export failed: ${result.error}`)
            }
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

    const handleMusicImportSuccess = () => {
        loadMusicTracks()
        setShowMusicImportDialog(false)
    }

    const handleDeleteMusicTrack = async (trackId) => {
        if (!window.confirm('Delete this background music track?')) return
        try {
            await musicTrackManager.deleteTrack(trackId)
            loadMusicTracks()
        } catch (error) {
            alert(`Delete failed: ${error.message}`)
        }
    }

    return (
        <div className="content-library">
            <h2 className="tab-title">Content Library</h2>

            <h3 style={{ marginTop: '24px' }}>Voice Packs</h3>
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
                        showHiddenDev={showHiddenContent}
                        onHiddenChange={handlePackHiddenChange}
                    />
                ))}
            </div>

            {showImportDialog && (
                <ImportDialog
                    onClose={() => setShowImportDialog(false)}
                    onSuccess={handleImportSuccess}
                />
            )}

            <h3 style={{ marginTop: '40px' }}>Background Tracks</h3>
            <div className="library-controls" style={{ marginBottom: '20px' }}>
                <button type="button" className="button button-primary" onClick={() => setShowMusicImportDialog(true)}>
                    Import Track
                </button>
            </div>
            <div className="packs-grid">
                {[{ id: null, name: 'No Background Track', isSystemOption: true }, ...musicTracks].map((track) => (
                    <MusicTrackCard
                        key={track.id ?? 'none'}
                        track={track}
                        isActive={track.id === activeMusicTrackId || (track.id === null && activeMusicTrackId === null)}
                        onSetActive={() => musicTrackManager.setActiveTrack(track.id)}
                        onDelete={track.isSystemOption ? undefined : () => handleDeleteMusicTrack(track.id)}
                        showHiddenDev={showHiddenContent}
                        onHiddenChange={handleTrackHiddenChange}
                    />
                ))}
            </div>

            {showMusicImportDialog && (
                <MusicTrackImportDialog
                    onClose={() => setShowMusicImportDialog(false)}
                    onSuccess={handleMusicImportSuccess}
                />
            )}
        </div>
    )
}

export default ContentLibrary
