/**
 * Viewport pointer → processing-buffer (sensor-native) pixel coordinates.
 *
 * Inverts the single leaf transform applied to the preview video:
 *   transform: [scaleX(-1)?] rotate(rotationDeg)
 * and the object-fit: contain letterboxing inside the video's CSS box.
 *
 * Rotation is limited to {0, 90, 180, 270} so the inverse uses a closed form
 * (no DOMMatrix, no dependency on getComputedStyle). Processing pipeline stays
 * sensor-native — callers must not rotate stored grid geometry.
 */

/**
 * @param {number} deg
 * @returns {0 | 90 | 180 | 270}
 */
export function normalizeRotation(deg) {
    const n = ((((Number(deg) || 0) % 360) + 360) % 360)
    if (n === 90 || n === 180 || n === 270) return n
    return 0
}

/**
 * @param {number} clientX
 * @param {number} clientY
 * @param {HTMLVideoElement | null | undefined} videoEl
 * @param {number} bufferW Sensor-native buffer width in pixels.
 * @param {number} bufferH Sensor-native buffer height in pixels.
 * @param {number} rotationDeg Preview rotation (CSS) applied to the video element.
 * @param {boolean} mirrored true when preview applies `scaleX(-1)` to the video element.
 * @returns {{ x: number, y: number }} Buffer coords. NaN when element isn't ready.
 */
export function previewToBufferCoords(clientX, clientY, videoEl, bufferW, bufferH, rotationDeg, mirrored) {
    if (!videoEl || bufferW <= 0 || bufferH <= 0) return { x: NaN, y: NaN }

    const rect = videoEl.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return { x: NaN, y: NaN }

    const W = videoEl.clientWidth
    const H = videoEl.clientHeight
    if (W <= 0 || H <= 0) return { x: NaN, y: NaN }

    const r = normalizeRotation(rotationDeg)

    let u = clientX - rect.left - rect.width / 2
    let v = clientY - rect.top - rect.height / 2

    if (mirrored) u = -u

    let x, y
    switch (r) {
        case 90:  x = v;  y = -u; break
        case 180: x = -u; y = -v; break
        case 270: x = -v; y = u;  break
        default:  x = u;  y = v
    }

    const xBox = x + W / 2
    const yBox = y + H / 2

    const ar = bufferW / bufferH
    const car = W / H
    let actualW, actualH, offX, offY
    if (car > ar) {
        actualH = H
        actualW = actualH * ar
        offX = (W - actualW) / 2
        offY = 0
    } else {
        actualW = W
        actualH = actualW / ar
        offX = 0
        offY = (H - actualH) / 2
    }

    const bx = (xBox - offX) * (bufferW / actualW)
    const by = (yBox - offY) * (bufferH / actualH)

    // Reject points outside the sensor buffer so callers (brush / click) can't
    // pollute grid state with coordinates that correspond to off-preview pixels.
    if (bx < 0 || bx > bufferW || by < 0 || by > bufferH) {
        return { x: NaN, y: NaN }
    }

    return { x: bx, y: by }
}
