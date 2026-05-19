import { store } from '../store'
import { activeBackgroundTrackIdAtom } from '../atoms/audioAtom'
import { musicTrackManager } from '../services/musicTrackManager'
import { levelManager } from '../services/levelManager'

/**
 * Active Content Library background track → object URL or null.
 */
async function resolveLibraryActive() {
    const id = store.get(activeBackgroundTrackIdAtom)
    if (!id) return null
    const t = musicTrackManager.getTrack(id)
    if (!t) return null
    return musicTrackManager.resolveTrackUrl(id)
}

/**
 * Resolve background music URL for a level start (Begin / headless play start).
 *
 * Default levels:
 * - CLI --background-music with an existing track id → that track; otherwise → null (no music).
 * - Normal launch → Content Library active track only (including "No Background Music" → null).
 *
 * Custom levels:
 * - CLI with an existing track → that track (overrides level).
 * - CLI id invalid/missing → use level.backgroundMusicId (concrete id, use_selected, or none).
 * - Concrete id → that import; use_selected → library; none / omitted → null.
 *
 * @param {object} level - level definition + runtime fields
 * @param {{ cliTrackId?: string | null }} opts
 * @returns {Promise<string | null>}
 */
export async function resolveBackgroundMusicTrack(level, { cliTrackId }) {
    const bgId = level?.backgroundMusicId
    const levelId = level?.id
    const isDefault = Boolean(levelId && levelManager.isDefaultLevel(levelId))

    if (isDefault) {
        if (cliTrackId) {
            const t = musicTrackManager.getTrack(cliTrackId)
            if (t) return musicTrackManager.resolveTrackUrl(cliTrackId)
            return null
        }
        return resolveLibraryActive()
    }

    // Custom level
    if (cliTrackId) {
        const t = musicTrackManager.getTrack(cliTrackId)
        if (t) return musicTrackManager.resolveTrackUrl(cliTrackId)
    }

    if (bgId && bgId !== '' && bgId !== 'use_selected') {
        const t = musicTrackManager.getTrack(bgId)
        if (t) return musicTrackManager.resolveTrackUrl(bgId)
    }

    if (bgId === 'use_selected') {
        return resolveLibraryActive()
    }

    return null
}
