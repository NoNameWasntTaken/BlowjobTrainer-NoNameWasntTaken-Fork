/**
 * Webcam capture: preflight, JPEG stills, MP4 via Mediabunny, SFX trigger.
 * Encoding runs in a dedicated Web Worker (src/workers/captureWorker.js); each capture creates and terminates its own worker.
 */

import { store } from '../store'
import { captureSfxAtom } from '../atoms/audioAtom'
import { normalizeRotation } from '../utils/previewToBufferCoords'
import {
    mergeLevelCaptureDefaults,
    DEFAULT_TASK_CAPTURE_FIELDS,
} from '../constants/captureLevelDefaults'

let _cachedPackaged = null
function readIsPackaged() {
    if (_cachedPackaged != null) return _cachedPackaged
    try {
        if (typeof window === 'undefined' || !window.electronAPI?.isPackagedSync) {
            _cachedPackaged = false
            return false
        }
        _cachedPackaged = window.electronAPI.isPackagedSync() === true
    } catch {
        _cachedPackaged = false
    }
    return _cachedPackaged
}

export function isElectronPackaged() {
    return readIsPackaged()
}

function normalizeTaskCapture(task) {
    if (!task || typeof task !== 'object') return { ...DEFAULT_TASK_CAPTURE_FIELDS }
    return { ...DEFAULT_TASK_CAPTURE_FIELDS, ...task }
}

/**
 * Whether the level + profile could ever take visible photo / video captures (ignores current task).
 */
export function getLevelCaptureChannelAvailability(profile, level) {
    const lvl = mergeLevelCaptureDefaults(level || {})
    if (!profile || profile.allowsCaptures !== true) {
        return { photoPossible: false, videoPossible: false }
    }
    if (lvl.allowsCaptures !== true) {
        return { photoPossible: false, videoPossible: false }
    }
    const tasks = Array.isArray(lvl.tasks) ? lvl.tasks : []
    const photoPossible =
        (Number(lvl.photoCaptureLimit) || 0) >= 1 &&
        tasks.some((t) => normalizeTaskCapture(t).allowPhotos === true)
    const videoPossible =
        (Number(lvl.videoCaptureLimit) || 0) >= 1 &&
        tasks.some((t) => normalizeTaskCapture(t).allowVideos === true)
    return { photoPossible, videoPossible }
}

export function runCapturesPreflight(profile, level) {
    const { photoPossible, videoPossible } = getLevelCaptureChannelAvailability(profile, level)
    if (!photoPossible && !videoPossible) return { allowed: false }
    return { allowed: true }
}

export function runHiddenNotificationsPreflight(profile, level) {
    const lvl = mergeLevelCaptureDefaults(level || {})
    if (!profile || profile.allowsHiddenCaptures !== true) return { allowed: false }
    if (lvl.allowsHiddenCaptures !== true) return { allowed: false }
    const tasks = Array.isArray(lvl.tasks) ? lvl.tasks : []
    const hasHiddenCapable = tasks.some(
        (t) => (normalizeTaskCapture(t).captureNotificationVisibilityBias ?? 100) < 100
    )
    return { allowed: hasHiddenCapable }
}

export function formatCaptureName(levelTitle, captureIndex) {
    const safe = String(levelTitle || 'level').replace(/[/\\?%*:|"<>]/g, '_')
    const idx = Number(captureIndex) || 0
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    return `${safe}_${idx}_${ts}`
}

// ---------------------------------------------------------------------------
// Capture worker — fresh instance per capture; terminated after save completes.
// ---------------------------------------------------------------------------

function createCaptureWorker() {
    return new Worker(new URL('../workers/captureWorker.js', import.meta.url))
}

function terminateCaptureWorker(worker) {
    try {
        worker.terminate()
    } catch {
        /* ignore */
    }
}

/**
 * Returns a Promise that resolves with the first worker message whose `type`
 * matches `expectedType`, or rejects on a `{ type: 'error' }` message or a
 * worker-level error event (script load failure, uncaught exception, etc.).
 * Both listeners are removed as soon as either condition is met.
 */
function waitForWorkerMessage(worker, expectedType) {
    return new Promise((resolve, reject) => {
        const cleanup = () => {
            worker.removeEventListener('message', messageHandler)
            worker.removeEventListener('error', errorHandler)
        }
        const messageHandler = ({ data }) => {
            if (data.type === 'error') {
                cleanup()
                reject(new Error(data.message))
            } else if (data.type === expectedType) {
                cleanup()
                resolve(data)
            }
        }
        const errorHandler = (event) => {
            cleanup()
            reject(new Error(event.message || 'Capture worker error'))
        }
        worker.addEventListener('message', messageHandler)
        worker.addEventListener('error', errorHandler)
    })
}

// ---------------------------------------------------------------------------
// Frame pacing — stays on the main thread because requestAnimationFrame is
// unavailable inside workers.
// ---------------------------------------------------------------------------

const VIDEO_SECONDS = 5
const VIDEO_FPS = 30
const VIDEO_FRAME_INTERVAL_MS = 1000 / VIDEO_FPS
/** If `createImageBitmap` exceeds this × frame interval, re-encode the last drawn worker canvas (GPU backlog). */
const VIDEO_BITMAP_BACKLOG_FACTOR = 1.75

function waitForNextFrame(lastFrameTime) {
    return new Promise((r) => {
        const wait = () => {
            const now = performance.now()
            if (now - lastFrameTime >= VIDEO_FRAME_INTERVAL_MS) {
                r(lastFrameTime + VIDEO_FRAME_INTERVAL_MS)
            } else {
                requestAnimationFrame(wait)
            }
        }
        requestAnimationFrame(wait)
    })
}

// ---------------------------------------------------------------------------
// Photo capture
// ---------------------------------------------------------------------------

/**
 * @param {import('react').MutableRefObject<HTMLCanvasElement | null>} canvasRef
 * @param {number} cameraRotationDeg
 * @param {string} filename base without extension
 * @param {string} outputDir resolved directory
 */
export async function savePhoto(canvasRef, cameraRotationDeg, filename, outputDir) {
    const api = window.electronAPI
    if (!api?.saveCapturePhoto) throw new Error('Capture IPC unavailable')

    const sourceCanvas = canvasRef?.current
    if (!sourceCanvas) throw new Error('No capture canvas')

    const N = normalizeRotation(cameraRotationDeg)
    const W = sourceCanvas.width
    const H = sourceCanvas.height
    const isSideways = N === 90 || N === 270
    const offW = isSideways ? H : W
    const offH = isSideways ? W : H

    // Snapshot the canvas as a transferable — the worker handles rotation and
    // JPEG encoding via OffscreenCanvas.convertToBlob().
    const bitmap = await createImageBitmap(sourceCanvas)
    const worker = createCaptureWorker()
    try {
        const resultPromise = waitForWorkerMessage(worker, 'photoResult')
        worker.postMessage(
            {
                type: 'photoEncode',
                bitmap,
                sourceW: W,
                sourceH: H,
                outW: offW,
                outH: offH,
                rotation: N,
            },
            [bitmap]
        )
        const { buffer } = await resultPromise

        const uint8Array = new Uint8Array(buffer)
        const result = await api.saveCapturePhoto(uint8Array, `${filename}.jpg`, outputDir)
        if (!result?.success) {
            throw new Error(result?.error || 'saveCapturePhoto failed')
        }
        return result
    } finally {
        terminateCaptureWorker(worker)
    }
}

// ---------------------------------------------------------------------------
// Video capture
// ---------------------------------------------------------------------------

/**
 * @param {import('react').MutableRefObject<any>} webcamRef
 * @param {import('react').MutableRefObject<HTMLCanvasElement | null>} canvasRef
 * @param {number} cameraRotationDeg
 * @param {(name: string) => void} onComplete
 * @param {string} filename base without extension
 * @param {string} outputDir resolved directory
 */
export async function saveVideo(webcamRef, canvasRef, cameraRotationDeg, onComplete, filename, outputDir) {
    const api = window.electronAPI
    if (!api?.saveCaptureVideo) throw new Error('Capture IPC unavailable')

    const videoEl = webcamRef?.current?.video
    const dimCanvas = canvasRef?.current
    if (!videoEl || !dimCanvas) throw new Error('No video for capture')

    const N = normalizeRotation(cameraRotationDeg)
    const W = dimCanvas.width
    const H = dimCanvas.height
    const isSideways = N === 90 || N === 270
    const outW = isSideways ? H : W
    const outH = isSideways ? W : H

    const worker = createCaptureWorker()
    try {
        // Initialise the worker's Mediabunny pipeline for this clip.
        const readyPromise = waitForWorkerMessage(worker, 'videoReady')
        worker.postMessage({
            type: 'videoStart',
            sourceW: W,
            sourceH: H,
            outW,
            outH,
            rotation: N,
            fps: VIDEO_FPS,
        })
        await readyPromise

        const totalFrames = Math.floor(VIDEO_SECONDS * VIDEO_FPS)
        let lastFrameTime = performance.now()
        const backlogMs = VIDEO_FRAME_INTERVAL_MS * VIDEO_BITMAP_BACKLOG_FACTOR

        for (let i = 0; i < totalFrames; i++) {
            lastFrameTime = await waitForNextFrame(lastFrameTime)

            if (!videoEl.videoWidth) throw new Error('Video not ready')

            const bmpStart = performance.now()
            const bitmap = await createImageBitmap(videoEl)
            const bmpElapsed = performance.now() - bmpStart

            if (bmpElapsed > backlogMs && i > 0) {
                bitmap.close()
                const dupAck = waitForWorkerMessage(worker, 'videoFrameAck')
                worker.postMessage({ type: 'videoDuplicateFrame', index: i })
                await dupAck
                continue
            }

            const ackPromise = waitForWorkerMessage(worker, 'videoFrameAck')
            worker.postMessage({ type: 'videoFrame', bitmap, index: i }, [bitmap])
            await ackPromise
        }

        const resultPromise = waitForWorkerMessage(worker, 'videoResult')
        worker.postMessage({ type: 'videoFinalize' })
        const { buffer } = await resultPromise

        const uint8Array = new Uint8Array(buffer)
        const result = await api.saveCaptureVideo(uint8Array, `${filename}.mp4`, outputDir)
        if (!result?.success) {
            throw new Error(result?.error || 'saveCaptureVideo failed')
        }
        onComplete?.(filename)
    } finally {
        terminateCaptureWorker(worker)
    }
}

/**
 * @param {'photo' | 'video'} type
 */
export function playCaptureSfx(type) {
    const key = type === 'photo' ? 'Sfx.PICTURE' : 'Sfx.VIDEO'
    store.set(captureSfxAtom, key)
}

/** Resolve output directory via main process (call once per session when possible). */
export async function getResolvedCaptureOutputDir(levelCaptureOutputField) {
    const api = window.electronAPI
    if (!api?.getCaptureOutputPath) return null
    try {
        return await api.getCaptureOutputPath(levelCaptureOutputField || '')
    } catch {
        return null
    }
}
