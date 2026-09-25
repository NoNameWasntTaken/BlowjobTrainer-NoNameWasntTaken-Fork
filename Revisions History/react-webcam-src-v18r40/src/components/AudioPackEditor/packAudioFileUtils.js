/**
 * Shared helpers for playing and mutating audio file entries in a pack's audioFiles map.
 */

export function appendAudioFile(prev, category, key, customContentUrl) {
    const prevCat = prev[category] || {}
    const nextCat = { ...prevCat }
    const existing = nextCat[key]
    if (!existing) {
        nextCat[key] = customContentUrl
    } else if (Array.isArray(existing)) {
        nextCat[key] = [...existing, customContentUrl]
    } else {
        nextCat[key] = [existing, customContentUrl]
    }
    return { ...prev, [category]: nextCat }
}

export function removeAudioFileFromPack(prev, category, key, customContentUrl) {
    if (!prev[category] || !prev[category][key]) return prev

    const value = prev[category][key]
    const nextCat = { ...prev[category] }

    if (Array.isArray(value)) {
        nextCat[key] = value.filter((p) => p !== customContentUrl)
    } else {
        delete nextCat[key]
    }

    return { ...prev, [category]: nextCat }
}

export async function playPackAudioFile(filePath) {
    try {
        let audioUrl = filePath

        if (filePath && filePath.startsWith('custom-content://')) {
            const { audioFileService } = await import('../../services/storageService')
            const resolvedUrl = await audioFileService.getAudioFile(filePath)
            if (resolvedUrl) {
                audioUrl = resolvedUrl
            } else {
                alert('Could not load audio file')
                return
            }
        }

        const audio = new Audio(audioUrl)
        audio.play().catch((err) => {
            console.error('Error playing audio:', err)
            alert('Error playing audio: ' + err.message)
        })
    } catch (error) {
        console.error('Error loading audio:', error)
        alert('Error loading audio: ' + error.message)
    }
}
