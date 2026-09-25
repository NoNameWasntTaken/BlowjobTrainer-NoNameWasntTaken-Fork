import { audioManager } from '../services/audioManager'

/**
 * Resolve voice pack id for external (CLI) runs. Precedence matches --background-music:
 * CLI --audio-pack when the pack exists → level audioPackId when that pack exists → null (default voice).
 * If the CLI id is invalid or missing, the level's pack is used when present.
 *
 * @param {object} level - Level definition
 * @param {string|null|undefined} cliPackId - From --audio-pack
 * @returns {string|null}
 */
export function resolveExternalAudioPackId(level, cliPackId) {
    if (cliPackId && audioManager.loadPack(cliPackId)) {
        return cliPackId
    }
    if (level?.audioPackId && audioManager.loadPack(level.audioPackId)) {
        return level.audioPackId
    }
    return null
}
