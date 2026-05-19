/**
 * Gameplay microphone session: one getUserMedia from Begin until Playing unmounts or cancel.
 *
 * Invariant: entering calibration (NAV.MIC) with a live gameplay mic must not happen without
 * unmounting Playing first — single nav stack; stopGameplayMic() before calibration connectMic otherwise.
 */

import { micInputDeviceIdAtom } from '../atoms/audioAtom'
import { store } from '../store'
import { buildMicAudioConstraints } from '../utils/micCaptureConstraints'
import { audioProcessingService } from './audioProcessingService'

let active = false
let startPromise = null
/** Incremented on stopGameplayMic and stream ended; in-flight start compares to detect abort. */
let opId = 0

/** Pending Playing-unmount mic stop; cleared when starting a level or stopping immediately. */
let deferredStopTimeoutId = null

function clearDeferredStopTimer() {
    if (deferredStopTimeoutId != null) {
        clearTimeout(deferredStopTimeoutId)
        deferredStopTimeoutId = null
    }
}

const endedListenerRefs = []

function removeEndedListeners() {
    endedListenerRefs.forEach(({ track, handler }) => {
        try {
            track.removeEventListener('ended', handler)
        } catch (e) {
            /* ignore */
        }
    })
    endedListenerRefs.length = 0
}

function bindStreamEnded(stream) {
    removeEndedListeners()
    stream.getAudioTracks().forEach((track) => {
        const handler = () => {
            active = false
            opId += 1
            removeEndedListeners()
            audioProcessingService.disconnectMic()
        }
        track.addEventListener('ended', handler)
        endedListenerRefs.push({ track, handler })
    })
}

function abortStart(stream) {
    if (stream) {
        try {
            stream.getTracks().forEach((t) => t.stop())
        } catch (e) {
            /* ignore */
        }
    }
    removeEndedListeners()
    audioProcessingService.disconnectMic()
    active = false
}

async function startGameplayMicInternal() {
    const myId = opId
    let stream = null

    try {
        const ctx = await audioProcessingService.ensureAudioContext()
        await ctx.resume()
        if (opId !== myId) return

        stream = await navigator.mediaDevices.getUserMedia({
            audio: buildMicAudioConstraints(store.get(micInputDeviceIdAtom)),
        })
        if (opId !== myId) {
            stream.getTracks().forEach((t) => t.stop())
            return
        }

        audioProcessingService.connectMic(stream)
        if (!audioProcessingService.getMicConnected()) {
            throw new Error('Microphone could not be connected to the audio graph')
        }
        if (opId !== myId) {
            abortStart(stream)
            return
        }

        bindStreamEnded(stream)
        active = true
    } catch (err) {
        abortStart(stream)
        throw err
    }
}

/**
 * Opens the gameplay mic once; concurrent callers share one in-flight promise.
 */
export async function startGameplayMic() {
    clearDeferredStopTimer()
    if (active) return
    if (startPromise) return startPromise

    startPromise = (async () => {
        try {
            await startGameplayMicInternal()
        } finally {
            startPromise = null
        }
    })()

    return startPromise
}

/**
 * Stops gameplay mic; aborts any in-flight start (invalidates opId, clears listeners, disconnects).
 * Cancels any pending {@link scheduleStopGameplayMic} timer.
 */
export function stopGameplayMic() {
    clearDeferredStopTimer()
    opId += 1
    removeEndedListeners()
    audioProcessingService.disconnectMic()
    active = false
}

/**
 * Stops gameplay mic after `delayMs`, or immediately if `delayMs <= 0`.
 * Replaces any previously scheduled deferred stop. Use after music fade-out duration when unmounting Playing.
 */
export function scheduleStopGameplayMic(delayMs) {
    clearDeferredStopTimer()
    if (!(delayMs > 0)) {
        stopGameplayMic()
        return
    }
    deferredStopTimeoutId = setTimeout(() => {
        deferredStopTimeoutId = null
        stopGameplayMic()
    }, delayMs)
}

export function isGameplayMicActive() {
    return active
}
