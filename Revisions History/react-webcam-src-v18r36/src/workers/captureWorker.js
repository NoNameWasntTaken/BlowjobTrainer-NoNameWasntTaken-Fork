/* eslint-env worker */
/**
 * Capture worker: runs Mediabunny MP4 encoding and JPEG encoding off the main thread.
 *
 * Message protocol (main → worker):
 *   { type: 'videoStart',    sourceW, sourceH, outW, outH, rotation, fps }
 *   { type: 'videoFrame',    bitmap: ImageBitmap, index: number }   [bitmap transferred]
 *   { type: 'videoDuplicateFrame', index: number }  — encode again without a new bitmap (canvas unchanged)
 *   { type: 'videoFinalize' }
 *   { type: 'photoEncode',   bitmap: ImageBitmap, sourceW, sourceH, outW, outH, rotation }  [bitmap transferred]
 *   { type: 'abort' }
 *
 * Message protocol (worker → main):
 *   { type: 'videoReady' }
 *   { type: 'videoFrameAck', index: number }
 *   { type: 'videoResult',   buffer: ArrayBuffer }                  [buffer transferred]
 *   { type: 'photoResult',   buffer: ArrayBuffer }                  [buffer transferred]
 *   { type: 'error',         message: string }
 */

import { Output, BufferTarget, Mp4OutputFormat, CanvasSource } from 'mediabunny'

let videoState = null

/** Release encoder / canvas GPU resources for the current video encode session. */
async function disposeVideoSession(state, { cancelOutput = false } = {}) {
    if (!state) return
    const { output, videoSource, canvas } = state
    try {
        videoSource.close()
    } catch {
        /* ignore */
    }
    try {
        canvas.width = 0
        canvas.height = 0
    } catch {
        /* ignore */
    }
    if (
        cancelOutput &&
        output &&
        output.state !== 'finalized' &&
        output.state !== 'canceled'
    ) {
        try {
            await output.cancel()
        } catch {
            /* ignore */
        }
    }
}

async function handleMessage(data) {
    switch (data.type) {
        case 'videoStart': {
            const { sourceW, sourceH, outW, outH, rotation, fps } = data
            const canvas = new OffscreenCanvas(outW, outH)
            const ctx = canvas.getContext('2d')
            const output = new Output({
                format: new Mp4OutputFormat(),
                target: new BufferTarget(),
            })
            const videoSource = new CanvasSource(canvas, {
                codec: 'avc',
                bitrate: 2_000_000,
            })
            output.addVideoTrack(videoSource, { frameRate: fps })
            await output.start()
            videoState = {
                output,
                videoSource,
                canvas,
                ctx,
                sourceW,
                sourceH,
                outW,
                outH,
                rotation,
                frameDuration: 1 / fps,
            }
            postMessage({ type: 'videoReady' })
            break
        }

        case 'videoFrame': {
            const { bitmap, index } = data
            if (!videoState) {
                bitmap.close()
                break
            }
            const { ctx, videoSource, frameDuration, sourceW, sourceH, outW, outH, rotation } =
                videoState
            ctx.save()
            ctx.setTransform(1, 0, 0, 1, 0, 0)
            ctx.clearRect(0, 0, outW, outH)
            ctx.translate(outW / 2, outH / 2)
            ctx.rotate((rotation * Math.PI) / 180)
            ctx.drawImage(bitmap, -sourceW / 2, -sourceH / 2)
            ctx.restore()
            bitmap.close()
            await videoSource.add(index * frameDuration, frameDuration)
            postMessage({ type: 'videoFrameAck', index })
            break
        }

        case 'videoDuplicateFrame': {
            if (!videoState) break
            const { videoSource, frameDuration } = videoState
            const { index } = data
            await videoSource.add(index * frameDuration, frameDuration)
            postMessage({ type: 'videoFrameAck', index })
            break
        }

        case 'videoFinalize': {
            if (!videoState) break
            const vs = videoState
            await vs.output.finalize()
            const buf = vs.output.target.buffer
            videoState = null
            await disposeVideoSession(vs, { cancelOutput: false })
            postMessage({ type: 'videoResult', buffer: buf }, [buf])
            break
        }

        case 'photoEncode': {
            const { bitmap, sourceW, sourceH, outW, outH, rotation } = data
            const canvas = new OffscreenCanvas(outW, outH)
            const ctx = canvas.getContext('2d')
            ctx.translate(outW / 2, outH / 2)
            ctx.rotate((rotation * Math.PI) / 180)
            ctx.drawImage(bitmap, -sourceW / 2, -sourceH / 2)
            bitmap.close()
            const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 })
            const buffer = await blob.arrayBuffer()
            try {
                canvas.width = 0
                canvas.height = 0
            } catch {
                /* ignore */
            }
            postMessage({ type: 'photoResult', buffer }, [buffer])
            break
        }

        case 'abort': {
            const vs = videoState
            videoState = null
            await disposeVideoSession(vs, { cancelOutput: true })
            break
        }

        default:
            break
    }
}

onmessage = ({ data }) => {
    void handleMessage(data).catch(async (e) => {
        const vs = videoState
        videoState = null
        await disposeVideoSession(vs, { cancelOutput: true })
        postMessage({ type: 'error', message: e?.message ?? String(e) })
    })
}
