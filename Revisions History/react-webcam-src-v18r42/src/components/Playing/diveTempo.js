/** Plausible measured BPM for skip-feedback handoff (rejects 0, Infinity, and startup spikes). */
export function isPlausibleBpm(bpm) {
    return Number.isFinite(bpm) && bpm >= 10 && bpm <= 200
}

/** Average of last up/down stroke tempos. Returns null when there is no recorded motion. */
export function getAverageMotionBpm(motion) {
    if (!motion) return null
    let bpm = Number(motion.upTempo) + Number(motion.downTempo)
    if (motion.upTempo !== 0) bpm /= 2
    return Number.isFinite(bpm) && bpm > 0 ? bpm : null
}

/** Stroke tempo in BPM from last durations at each depth. Null when the sample is empty. */
export function calculateTempo(minDepth, maxDepth, previousDurations) {
    let sumTempo = 0
    for (let i = minDepth; i <= maxDepth; i++) {
        if (previousDurations?.[i]) {
            sumTempo += previousDurations[i]
        }
    }
    if (!(sumTempo > 0)) return null
    return 60000 / sumTempo
}
