/**
 * Long-lived Web Audio graph: one AudioContext, LMS worklet, mic + music reference.
 * Never call context.close() from feature hooks — only disconnectMic / disconnectMusicReference.
 */

import { getSpeakPcmTapWorkletUrl } from '../utils/asrAssetUrls'

let audioContext = null
let workletLoaded = false
let lmsNode = null
let analyserNode = null
let silentGain = null
let micSource = null
let micStream = null
let musicConnections = []

let speakPcmTapNode = null
let speakPcmTapGain = null
let speakPcmTapWorkletLoaded = false

/** Single in-flight init so concurrent ensureAudioContext() callers share one chain (no double addModule / duplicate LMS node). */
let initPromise = null

/**
 * Absolute URL for public/lms-processor.js so addModule never hits SPA fallback HTML.
 * - file:// (packaged Electron): same directory as index.html.
 * - http(s): anchored to origin + PUBLIC_URL (deep client routes must not use ./lms-processor.js).
 */
function getWorkletUrl() {
    const publicUrl =
        typeof process !== 'undefined' &&
        process.env &&
        typeof process.env.PUBLIC_URL === 'string'
            ? process.env.PUBLIC_URL
            : ''

    if (typeof window !== 'undefined' && window.location?.protocol === 'file:') {
        return new URL('lms-processor.js', window.location.href).href
    }

    if (typeof window === 'undefined') {
        return '/lms-processor.js'
    }

    if (publicUrl.startsWith('http://') || publicUrl.startsWith('https://')) {
        const base = publicUrl.replace(/\/$/, '')
        return `${base}/lms-processor.js`
    }

    const origin = window.location.origin
    const trimmed = publicUrl.replace(/\/$/, '')

    if (!trimmed || trimmed === '.' || trimmed === './') {
        return `${origin}/lms-processor.js`
    }

    const pathPrefix = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
    return `${origin}${pathPrefix}/lms-processor.js`
}

async function ensureWorkletNode(ctx) {
    if (lmsNode) return lmsNode

    if (!workletLoaded) {
        await ctx.audioWorklet.addModule(getWorkletUrl())
        workletLoaded = true
    }

    lmsNode = new AudioWorkletNode(ctx, 'lms-processor', {
        numberOfInputs: 2,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        channelCount: 1,
        channelCountMode: 'explicit'
    })

    analyserNode = ctx.createAnalyser()
    analyserNode.fftSize = 256

    lmsNode.connect(analyserNode)

    // Keep graph alive so processing runs (inaudible tap)
    silentGain = ctx.createGain()
    silentGain.gain.value = 0.0001
    analyserNode.connect(silentGain)
    silentGain.connect(ctx.destination)

    return lmsNode
}

async function ensureAudioContextInternal() {
    if (!audioContext) {
        const Ctx = window.AudioContext || window.webkitAudioContext
        audioContext = new Ctx()
    }
    await ensureWorkletNode(audioContext)
    return audioContext
}

export const audioProcessingService = {
    async ensureAudioContext() {
        if (audioContext && lmsNode) {
            return audioContext
        }
        if (!initPromise) {
            initPromise = ensureAudioContextInternal().finally(() => {
                initPromise = null
            })
        }
        return initPromise
    },

    getAnalyserNode() {
        return analyserNode
    },

    getLmsOutputNode() {
        return lmsNode
    },

    /**
     * True when mic graph has an attached MediaStreamSource and stream with a live audio track.
     * Call after connectMic to verify the no-op path did not run.
     */
    getMicConnected() {
        if (!micSource || !micStream) return false
        const tracks = micStream.getAudioTracks()
        return tracks.some((t) => t.readyState === 'live')
    },

    /**
     * Mic → LMS input 0
     * @throws {Error} if audio context / LMS node are not ready (call ensureAudioContext first)
     */
    connectMic(mediaStream) {
        if (!audioContext || !lmsNode) {
            throw new Error('audioProcessingService.connectMic: ensureAudioContext must be called before connectMic')
        }
        audioProcessingService.disconnectMic()

        micStream = mediaStream
        micSource = audioContext.createMediaStreamSource(mediaStream)
        micSource.connect(lmsNode, 0, 0)
    },

    disconnectMic() {
        if (micSource) {
            try {
                micSource.disconnect()
            } catch (e) {
                /* ignore */
            }
            micSource = null
        }
        if (micStream) {
            micStream.getTracks().forEach((t) => t.stop())
            micStream = null
        }
    },

    /**
     * HTMLMediaElement → MediaElementSource → external gainNode (music volume) → speakers + LMS ref input 1
     * Caller owns gainNode (AudioPlayer applies fades on gain param).
     */
    connectMusicReference(audioElement, gainNode) {
        audioProcessingService.disconnectMusicReference()
        if (!audioContext || !lmsNode || !gainNode) return

        const src = audioContext.createMediaElementSource(audioElement)
        src.connect(gainNode)
        gainNode.connect(audioContext.destination)
        gainNode.connect(lmsNode, 0, 1)
        musicConnections.push({ src, gainNode })
    },

    disconnectMusicReference() {
        musicConnections.forEach(({ src, gainNode }) => {
            try {
                src.disconnect()
            } catch (e) {
                /* ignore */
            }
            try {
                gainNode.disconnect()
            } catch (e) {
                /* ignore */
            }
        })
        musicConnections = []
    },

    /**
     * Mic (pre-LMS) → PCM tap worklet → silent gain. ASR sees raw mic; clap path stays mic → LMS → analyser.
     * @param {(data: { pcm: Float32Array, rms: number }) => void} onChunk
     */
    async connectSpeakPcmTap(onChunk) {
        if (!audioContext || !lmsNode) {
            throw new Error('audioProcessingService.connectSpeakPcmTap: ensureAudioContext must be called first')
        }
        if (!audioProcessingService.getMicConnected()) {
            throw new Error(
                'audioProcessingService.connectSpeakPcmTap: connectMic must be called with a live stream before the ASR tap'
            )
        }
        audioProcessingService.disconnectSpeakPcmTap()

        if (!speakPcmTapWorkletLoaded) {
            await audioContext.audioWorklet.addModule(getSpeakPcmTapWorkletUrl())
            speakPcmTapWorkletLoaded = true
        }

        const tap = new AudioWorkletNode(audioContext, 'speak-pcm-tap', {
            numberOfInputs: 1,
            numberOfOutputs: 1,
            outputChannelCount: [1],
            processorOptions: { inputSampleRate: audioContext.sampleRate },
        })
        tap.port.onmessage = (ev) => {
            if (ev.data?.pcm && typeof ev.data.rms === 'number') {
                onChunk(ev.data)
            }
        }

        const g = audioContext.createGain()
        g.gain.value = 0.0001
        tap.connect(g)
        g.connect(audioContext.destination)

        micSource.connect(tap)
        speakPcmTapNode = tap
        speakPcmTapGain = g
    },

    disconnectSpeakPcmTap() {
        if (speakPcmTapNode) {
            try {
                speakPcmTapNode.port.onmessage = null
                if (micSource) {
                    try {
                        micSource.disconnect(speakPcmTapNode)
                    } catch (e) {
                        /* ignore */
                    }
                }
                speakPcmTapNode.disconnect()
            } catch (e) {
                /* ignore */
            }
            speakPcmTapNode = null
        }
        if (speakPcmTapGain) {
            try {
                speakPcmTapGain.disconnect()
            } catch (e) {
                /* ignore */
            }
            speakPcmTapGain = null
        }
    },
}
