import { getSherpaAsrAssetBaseUrl, getSherpaAsrScriptUrl } from '../utils/asrAssetUrls'

const SHERPA_PRELOAD_LOG = '[sherpaPreload]'

let loadPromise = null
let loaded = null // { recognizer, Module }
let loadError = null

/** Prewarmed Sherpa OnlineStream; owned by this module — use acquire/release only. */
let warmOnlineStream = null

function disposeWarmOnlineStream() {
    if (!warmOnlineStream) return
    try {
        warmOnlineStream.free()
    } catch (e) {
        /* ignore */
    }
    warmOnlineStream = null
}

/**
 * Fills warm slot when recognizer is loaded and no warm stream exists yet.
 */
function tryCreateWarmOnlineStream() {
    if (loadError || !loaded?.recognizer) return
    if (warmOnlineStream) return
    try {
        warmOnlineStream = loaded.recognizer.createStream()
    } catch (e) {
        console.warn(`${SHERPA_PRELOAD_LOG} warm OnlineStream create failed`, e)
    }
}

function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[data-sherpa-src="${src}"]`)
        if (existing) {
            existing.addEventListener('load', () => resolve())
            existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)))
            // If it already loaded, resolve immediately
            if (existing.dataset.loaded === '1') resolve()
            return
        }

        const s = document.createElement('script')
        s.src = src
        s.async = true
        s.defer = true
        s.dataset.sherpaSrc = src
        s.addEventListener('load', () => {
            s.dataset.loaded = '1'
            resolve()
        })
        s.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)))
        document.head.appendChild(s)
    })
}

function ensureModuleWired() {
    const base = getSherpaAsrAssetBaseUrl()

    // Emscripten glue checks `typeof Module !== 'undefined' ? Module : {}`
    // so we must publish it on `window` before loading the glue.
    const Module = (window.Module = window.Module || {})

    Module.locateFile = function (path, scriptDirectory = '') {
        // Always resolve relative to public/asr/, regardless of CRA route depth.
        // `path` values include: sherpa-onnx-wasm-main-asr.wasm, sherpa-onnx-wasm-main-asr.data
        void scriptDirectory
        return `${base}${path}`
    }

    // Optional progress hook. We keep it lightweight and log-only here.
    Module.setStatus = function (status) {
        if (status) console.log(`${SHERPA_PRELOAD_LOG} ${status}`)
    }

    return Module
}

export function preloadSherpaOnnx() {
    if (loaded) return Promise.resolve(loaded)
    if (loadError) return Promise.reject(loadError)
    if (loadPromise) return loadPromise

    const t0 = typeof performance !== 'undefined' ? performance.now() : 0
    console.log(`${SHERPA_PRELOAD_LOG} preload started (performance.now=${t0.toFixed(1)}ms)`)

    loadPromise = (async () => {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            throw new Error('preloadSherpaOnnx: browser environment required')
        }

        // If already present, skip injecting sherpa-onnx-asr.js
        if (!window.createOnlineRecognizer) {
            await loadScriptOnce(getSherpaAsrScriptUrl('sherpa-onnx-asr.js'))
        }

        if (typeof window.createOnlineRecognizer !== 'function') {
            throw new Error('preloadSherpaOnnx: createOnlineRecognizer not found after loading sherpa-onnx-asr.js')
        }

        const Module = ensureModuleWired()

        const runtimeReady = new Promise((resolve, reject) => {
            const prev = Module.onRuntimeInitialized
            Module.onRuntimeInitialized = function () {
                try {
                    if (typeof prev === 'function') prev()
                } finally {
                    resolve()
                }
            }
            // Safety: if glue fails to load, we’ll reject via script error below.
            void reject
        })

        // Load Emscripten glue (idempotent: if already loaded, loadScriptOnce resolves).
        await loadScriptOnce(getSherpaAsrScriptUrl('sherpa-onnx-wasm-main-asr.js'))

        await runtimeReady

        // Create one shared recognizer instance for reuse.
        const recognizer = window.createOnlineRecognizer(Module)
        loaded = { recognizer, Module }
        tryCreateWarmOnlineStream()

        const elapsedMs = typeof performance !== 'undefined' ? performance.now() - t0 : 0
        console.log(
            `${SHERPA_PRELOAD_LOG} preload resolved in ${elapsedMs.toFixed(0)}ms (${(elapsedMs / 1000).toFixed(2)}s)`
        )

        loadError = null
        return loaded
    })()
        .catch((err) => {
            const elapsedMs = typeof performance !== 'undefined' ? performance.now() - t0 : 0
            console.log(
                `${SHERPA_PRELOAD_LOG} preload rejected after ${elapsedMs.toFixed(0)}ms (${(elapsedMs / 1000).toFixed(2)}s)`
            )
            loadError = err
            loadPromise = null
            disposeWarmOnlineStream()
            loaded = null
            console.error('sherpaOnnxPreloadService: preload failed', err)
            throw err
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
    return Boolean(loaded?.recognizer)
}

/**
 * Returns a prewarmed OnlineStream when available, else creates one. Always pair with
 * releaseOnlineStream — only this module calls free() on pooled streams.
 * Rejects when preload failed (via getSherpaOnnxReadyPromise).
 * @returns {Promise<object>} Sherpa OnlineStream
 */
export async function acquireOnlineStream() {
    const { recognizer } = await getSherpaOnnxReadyPromise()
    if (loadError || !loaded?.recognizer || !recognizer) {
        throw new Error('acquireOnlineStream: recognizer not available')
    }
    if (warmOnlineStream) {
        const s = warmOnlineStream
        warmOnlineStream = null
        tryCreateWarmOnlineStream()
        return s
    }
    return recognizer.createStream()
}

/**
 * Frees a stream from acquireOnlineStream (or an extra createStream from the same session)
 * and prewarms the next idle stream when the recognizer is loaded.
 * @param {object | null | undefined} stream
 */
export function releaseOnlineStream(stream) {
    if (!stream) return
    try {
        stream.free()
    } catch (e) {
        /* ignore */
    }
    if (!loadError && loaded?.recognizer) {
        tryCreateWarmOnlineStream()
    }
}

