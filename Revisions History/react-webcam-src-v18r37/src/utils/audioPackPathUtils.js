import { audioFileService } from '../services/storageService'

const storeLocks = new Map()

function withStoreLock(lockKey, fn) {
    const tail = storeLocks.get(lockKey) ?? Promise.resolve()
    const run = tail.then(fn, fn)
    storeLocks.set(
        lockKey,
        run.finally(() => {
            if (storeLocks.get(lockKey) === run) storeLocks.delete(lockKey)
        })
    )
    return run
}

/**
 * Generate a unique audio file path within a pack (appends a, b, c suffixes like upload).
 */
export async function generateUniqueAudioPath(packId, category, filename) {
    const { normalizeAudioPath } = audioFileService
    const basePath = normalizeAudioPath(category, filename)
    let finalPath = basePath

    const exists = await audioFileService.checkFileExists(packId, finalPath)
    if (!exists) return finalPath

    const match = filename.match(/^(.+?)(\.[^.]+)?$/)
    const baseName = match[1]
    const ext = match[2] || '.mp3'

    for (const letter of 'abcdefghijklmnopqrstuvwxyz'.split('')) {
        const newFilename = `${baseName} ${letter}${ext}`
        finalPath = normalizeAudioPath(category, newFilename)
        const letterExists = await audioFileService.checkFileExists(packId, finalPath)
        if (!letterExists) return finalPath
    }

    const timestamp = Date.now()
    const newFilename = `${baseName} ${timestamp}${ext}`
    return normalizeAudioPath(category, newFilename)
}

/**
 * Store a generated audio blob in IndexedDB and return the custom-content URL.
 */
export async function storeGeneratedAudio(packId, category, key, blob) {
    return withStoreLock(`${packId}:${category}:${key}`, async () => {
        const filePath = await generateUniqueAudioPath(packId, category, `${key}.mp3`)
        const customContentUrl = await audioFileService.storeAudioFile(packId, filePath, blob)
        return { customContentUrl, filePath }
    })
}
