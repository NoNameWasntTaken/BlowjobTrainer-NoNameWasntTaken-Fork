import { getSherpaAsrAssetBaseUrl, getSherpaAsrScriptUrl } from '../utils/asrAssetUrls'

const SHERPA_PRELOAD_LOG = '[sherpaPreload]'

let worker = null
let loadPromise = null
let loaded = null // { ready: true }
let loadError = null
let readyResolve = null
let readyReject = null

/** @type {Array<{ resolve: (streamId: number) => void, reject: (err: Error) => void }>} */
let acquireWaiters = []

/** @type {Map<number, (msg: { text: string, isEndpoint: boolean }) => void>} */
const resultHandlers = new Map()

function failPreload(message) {
    const err = message instanceof Error ? message : new Error(message || 'Sherpa preload failed')
    loadError = err
    console.error('sherpaOnnxPreloadService: preload failed', err)
    const reject = readyReject
    readyResolve = null
    readyReject = null
    if (reject) reject(err)
    const waiters = acquireWaiters
    acquireWaiters = []
    waiters.forEach((waiter) => waiter.reject(err))
}

function onWorkerMessage(event) {
    const msg = event.data
    if (!msg || typeof msg.type !== 'string') return

    if (msg.type === 'ready') {
        loaded = { ready: true }
        loadError = null
        const resolve = readyResolve
        readyResolve = null
        readyReject = null
        if (resolve) resolve(loaded)
        return
    }

    if (msg.type === 'failed') {
        failPreload(msg.message || 'Sherpa worker failed')
        return
    }

    if (msg.type === 'acquired') {
        const waiter = acquireWaiters.shift()
        if (waiter) waiter.resolve(msg.streamId)
        return
    }

    if (msg.type === 'acquireFailed') {
        const waiter = acquireWaiters.shift()
        if (waiter) waiter.reject(new Error(msg.message || 'acquireOnlineStream failed'))
        return
    }

    if (msg.type === 'result') {
        const handler = resultHandlers.get(msg.streamId)
        if (handler) {
            handler({ text: msg.text ?? '', isEndpoint: Boolean(msg.isEndpoint) })
        }
    }
}

function ensureWorker() {
    if (worker) return worker
    worker = new Worker(new URL('../workers/sherpaPreloadWorker.js', import.meta.url))
    worker.onmessage = onWorkerMessage
    worker.onerror = (event) => {
        if (loaded) return
        failPreload(event?.message || 'Sherpa worker error')
    }
    return worker
}

export function preloadSherpaOnnx() {
    if (loaded) return Promise.resolve(loaded)
    if (loadError) return Promise.reject(loadError)
    if (loadPromise) return loadPromise

    const t0 = typeof performance !== 'undefined' ? performance.now() : 0
    console.log(`${SHERPA_PRELOAD_LOG} preload started (performance.now=${t0.toFixed(1)}ms)`)

    loadPromise = new Promise((resolve, reject) => {
        readyResolve = (value) => {
            const elapsedMs = typeof performance !== 'undefined' ? performance.now() - t0 : 0
            console.log(
                `${SHERPA_PRELOAD_LOG} preload resolved in ${elapsedMs.toFixed(0)}ms (${(elapsedMs / 1000).toFixed(2)}s)`
            )
            resolve(value)
        }
        readyReject = (err) => {
            const elapsedMs = typeof performance !== 'undefined' ? performance.now() - t0 : 0
            console.log(
                `${SHERPA_PRELOAD_LOG} preload rejected after ${elapsedMs.toFixed(0)}ms (${(elapsedMs / 1000).toFixed(2)}s)`
            )
            loadPromise = null
            reject(err)
        }
    })

    ensureWorker().postMessage({
        type: 'init',
        asrScriptUrl: getSherpaAsrScriptUrl('sherpa-onnx-asr.js'),
        wasmScriptUrl: getSherpaAsrScriptUrl('sherpa-onnx-wasm-main-asr.js'),
        assetBaseUrl: getSherpaAsrAssetBaseUrl(),
    })

    return loadPromise
}

export function getSherpaOnnxReadyPromise() {
    if (loaded) return Promise.resolve(loaded)
    if (loadError) return Promise.reject(loadError)
    if (loadPromise) return loadPromise
    return preloadSherpaOnnx()
}

export function isSherpaOnnxReady() {
    return Boolean(loaded?.ready)
}

function requestAcquire() {
    return new Promise((resolve, reject) => {
        acquireWaiters.push({ resolve, reject })
        ensureWorker().postMessage({ type: 'acquire' })
    })
}

/**
 * A decode session owned by the Sherpa worker. feed() transfers a copy of the
 * samples. reset() and release() are ordered behind audio already posted.
 */
export async function acquireOnlineStream() {
    await getSherpaOnnxReadyPromise()
    if (loadError || !loaded?.ready) {
        throw new Error('acquireOnlineStream: recognizer not available')
    }

    const streamId = await requestAcquire()
    let released = false
    /** @type {((result: { text: string, isEndpoint: boolean }) => void) | null} */
    let resultHandler = null

    resultHandlers.set(streamId, (result) => {
        if (released || !resultHandler) return
        resultHandler(result)
    })

    return {
        streamId,
        feed(pcm) {
            if (released || !pcm?.length) return
            const copy = new Float32Array(pcm.length)
            copy.set(pcm)
            ensureWorker().postMessage(
                { type: 'feed', streamId, pcm: copy },
                [copy.buffer]
            )
        },
        reset() {
            if (released) return
            ensureWorker().postMessage({ type: 'reset', streamId })
        },
        setResultHandler(handler) {
            resultHandler = typeof handler === 'function' ? handler : null
        },
        release() {
            if (released) return
            released = true
            resultHandler = null
            resultHandlers.delete(streamId)
            ensureWorker().postMessage({ type: 'release', streamId })
        },
    }
}

/**
 * @param {{ release?: () => void } | null | undefined} session
 */
export function releaseOnlineStream(session) {
    session?.release?.()
}
