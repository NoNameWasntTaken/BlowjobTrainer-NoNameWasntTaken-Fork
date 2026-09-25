/**
 * Speech-only PCM tap policy: clap / gameplay mic paths never arm this, so connectMic does not
 * attach the speak worklet unless a speech consumer has requested it.
 */

let speechWantsTap = false

/**
 * When true, {@link audioProcessingService.connectMic} / ensureSpeakPcmTapIfWanted may attach
 * mic → speak-pcm-tap. Clap calibration and non-speak tasks leave this false.
 * @param {boolean} wanted
 */
export function setSpeechWantsTap(wanted) {
    speechWantsTap = Boolean(wanted)
}

export function isSpeechTapWanted() {
    return speechWantsTap
}

/**
 * Invoked from the speak-pcm-tap worklet port; decode logic is installed by useSherpaMicTap.
 * @type {{ current: ((data: { pcm: Float32Array, rms: number }) => void) | null }}
 */
export const speakPcmChunkHandlerRef = { current: null }

/**
 * @param {((data: { pcm: Float32Array, rms: number }) => void) | null} fn
 */
export function setSpeakPcmChunkHandler(fn) {
    speakPcmChunkHandlerRef.current = typeof fn === 'function' ? fn : null
}
