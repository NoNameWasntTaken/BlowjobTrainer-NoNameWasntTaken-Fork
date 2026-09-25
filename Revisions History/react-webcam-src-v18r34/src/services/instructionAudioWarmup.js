/**
 * One-slot cache: first-task instruction URL resolved during preflight / Training warm-up.
 * Consumed on first play so later tasks always resolve normally.
 */

let entry = null // { cacheKey: string, url: string } | null

/**
 * @param {string|number} levelId
 * @param {string|number} firstTaskId
 * @param {unknown} audioRef - task.audio (string or array; stringify for key stability)
 */
export function makeInstructionWarmupKey(levelId, firstTaskId, audioRef) {
    const ref =
        Array.isArray(audioRef) ? JSON.stringify(audioRef) : String(audioRef ?? '')
    return `${levelId}|${firstTaskId}|${ref}`
}

export function storeInstructionWarmup(cacheKey, url) {
    if (!cacheKey || !url) return
    entry = { cacheKey, url }
}

/** @returns {string|null} */
export function consumeInstructionWarmup(cacheKey) {
    if (!entry || entry.cacheKey !== cacheKey) return null
    const { url } = entry
    entry = null
    return url
}

export function clearInstructionWarmup() {
    entry = null
}
