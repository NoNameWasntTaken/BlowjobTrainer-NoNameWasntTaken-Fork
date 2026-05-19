/**
 * Background music tracks (stored under packId bg-music in IndexedDB)
 */
import { storageService, audioFileService } from './storageService'
import { store } from '../store'
import { activeBackgroundTrackIdAtom } from '../atoms/audioAtom'

const MAX_FILE_BYTES = 80 * 1024 * 1024
const BG_PACK_ID = 'bg-music'

function safeFileName(name) {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export const musicTrackManager = {
    getAllTracks() {
        return storageService.getAllBackgroundTracks()
    },

    getTrack(trackId) {
        const tracks = storageService.getAllBackgroundTracks()
        return tracks[trackId] || null
    },

    /** Active track id: single source of truth is activeBackgroundTrackIdAtom (atomWithStorage). Do not duplicate via storageService — avoids conflicting serialization on the same localStorage key. */
    getActiveTrackId() {
        return store.get(activeBackgroundTrackIdAtom)
    },

    setActiveTrack(id) {
        store.set(activeBackgroundTrackIdAtom, id)
    },

    /**
     * Resolve stored custom-content URL to a temporary object URL for playback.
     */
    async resolveTrackUrl(trackId) {
        const meta = musicTrackManager.getTrack(trackId)
        if (!meta?.customContentUrl) return null
        return audioFileService.getAudioFile(meta.customContentUrl)
    },

    async importTrack(file) {
        if (!file || !file.size) throw new Error('No file')
        if (file.size > MAX_FILE_BYTES) {
            throw new Error(`File too large (max ${MAX_FILE_BYTES / 1024 / 1024}MB)`)
        }
        const ext = (file.name.split('.').pop() || '').toLowerCase()
        if (!['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
            throw new Error('Unsupported format (use mp3, wav, ogg, or m4a)')
        }

        const id =
            typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : `track_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

        const filePath = `${id}/${safeFileName(file.name)}`
        const blob = file instanceof Blob ? file : new Blob([await file.arrayBuffer()], { type: file.type })
        const customContentUrl = await audioFileService.storeAudioFile(BG_PACK_ID, filePath, blob)

        const meta = {
            id,
            name: file.name.replace(/\.[^/.]+$/, '') || file.name,
            fileName: file.name,
            customContentUrl,
            fileSize: file.size,
            importedAt: new Date().toISOString()
        }
        storageService.saveBackgroundTrack(meta)
        return meta
    },

    async deleteTrack(trackId) {
        storageService.deleteBackgroundTrackMeta(trackId)
        await audioFileService.deleteBackgroundMusicTrackFiles(trackId)
        if (musicTrackManager.getActiveTrackId() === trackId) {
            musicTrackManager.setActiveTrack(null)
        }
    }
}
