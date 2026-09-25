/* eslint-env worker */
/* global createOnlineRecognizer, globalThis */

/**
 * Sherpa ONNX preload and decode. The wasm glue and recognizer stay on this
 * thread so the page can lay out during startup.
 *
 * Main → worker:
 *   { type: 'init', asrScriptUrl, wasmScriptUrl, assetBaseUrl }
 *   { type: 'acquire' }
 *   { type: 'feed', streamId, pcm: Float32Array }   [pcm transferred]
 *   { type: 'reset', streamId }
 *   { type: 'release', streamId }
 *
 * Worker → main:
 *   { type: 'ready' }
 *   { type: 'failed', message }
 *   { type: 'acquired', streamId }
 *   { type: 'acquireFailed', message }
 *   { type: 'result', streamId, text, isEndpoint }
 */

const SAMPLE_RATE = 16000

let recognizer = null
let warmStream = null
let activeStream = null
let activeStreamId = 0
let nextStreamId = 1
let loadError = null
let initStarted = false

function tryCreateWarmOnlineStream() {
    if (loadError || !recognizer || warmStream) return
    try {
        warmStream = recognizer.createStream()
    } catch (e) {
        console.warn('[sherpaPreload] warm OnlineStream create failed', e)
    }
}

function freeStream(stream) {
    if (!stream) return
    try {
        stream.free()
    } catch (e) {
        /* ignore */
    }
}

function fail(message) {
    loadError = new Error(message)
    globalThis.postMessage({ type: 'failed', message })
}

function startInit({ asrScriptUrl, wasmScriptUrl, assetBaseUrl }) {
    if (initStarted) return
    initStarted = true

    const base = typeof assetBaseUrl === 'string' && assetBaseUrl.endsWith('/')
        ? assetBaseUrl
        : `${assetBaseUrl || ''}/`

    const Module = (globalThis.Module = globalThis.Module || {})
    Module.locateFile = function locateFile(path) {
        return `${base}${path}`
    }
    Module.onRuntimeInitialized = function onRuntimeInitialized() {
        try {
            recognizer = createOnlineRecognizer(globalThis.Module)
            tryCreateWarmOnlineStream()
            globalThis.postMessage({ type: 'ready' })
        } catch (e) {
            fail(e?.message || 'createOnlineRecognizer failed')
        }
    }

    try {
        importScripts(asrScriptUrl)
        importScripts(wasmScriptUrl)
    } catch (e) {
        fail(e?.message || 'Failed to load Sherpa scripts')
    }
}

function acquire() {
    if (loadError || !recognizer) {
        globalThis.postMessage({
            type: 'acquireFailed',
            message: 'acquire: recognizer not available',
        })
        return
    }
    freeStream(activeStream)
    activeStream = null
    activeStreamId = 0

    let stream = warmStream
    warmStream = null
    if (!stream) {
        try {
            stream = recognizer.createStream()
        } catch (e) {
            globalThis.postMessage({
                type: 'acquireFailed',
                message: e?.message || 'createStream failed',
            })
            return
        }
    }
    tryCreateWarmOnlineStream()
    const streamId = nextStreamId
    nextStreamId += 1
    activeStream = stream
    activeStreamId = streamId
    globalThis.postMessage({ type: 'acquired', streamId })
}

function feed({ streamId, pcm }) {
    if (streamId !== activeStreamId || !activeStream || !recognizer || !pcm?.length) return
    try {
        activeStream.acceptWaveform(SAMPLE_RATE, pcm)
        while (recognizer.isReady(activeStream)) {
            recognizer.decode(activeStream)
        }
        const text = recognizer.getResult(activeStream)?.text ?? ''
        const isEndpoint = Boolean(recognizer.isEndpoint(activeStream))
        if (isEndpoint) {
            recognizer.reset(activeStream)
        }
        globalThis.postMessage({
            type: 'result',
            streamId: activeStreamId,
            text,
            isEndpoint,
        })
    } catch (e) {
        /* same as the main-thread handler: drop this chunk */
    }
}

function reset({ streamId }) {
    if (streamId !== activeStreamId || !activeStream || !recognizer) return
    try {
        recognizer.reset(activeStream)
    } catch (e) {
        /* ignore */
    }
}

function release({ streamId }) {
    if (streamId !== activeStreamId) return
    freeStream(activeStream)
    activeStream = null
    activeStreamId = 0
    tryCreateWarmOnlineStream()
}

globalThis.onmessage = (event) => {
    const msg = event.data
    if (!msg || typeof msg.type !== 'string') return
    switch (msg.type) {
        case 'init':
            startInit(msg)
            break
        case 'acquire':
            acquire()
            break
        case 'feed':
            feed(msg)
            break
        case 'reset':
            reset(msg)
            break
        case 'release':
            release(msg)
            break
        default:
            break
    }
}
