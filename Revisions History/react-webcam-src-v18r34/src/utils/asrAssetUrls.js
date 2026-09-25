/**
 * Absolute URLs for static ASR assets under `public/` (sherpa-onnx WASM, Speak PCM worklet).
 * Resolution mirrors `audioProcessingService` LMS worklet rules (file://, CRA PUBLIC_URL, deep routes).
 */

/** Absolute base URL for `public/asr/` (trailing slash). Used for sherpa-onnx WASM assets. */
export function getSherpaAsrAssetBaseUrl() {
    return getPublicBaseUrlWithPath('asr/')
}

/** Absolute URL for a script under `public/asr/` (e.g. sherpa-onnx-asr.js). */
export function getSherpaAsrScriptUrl(filename) {
    const base = getSherpaAsrAssetBaseUrl().replace(/\/$/, '')
    return `${base}/${filename}`
}

/** Absolute URL for `public/speak-pcm-tap.js` (same resolution rules as LMS worklet). */
export function getSpeakPcmTapWorkletUrl() {
    const publicUrl =
        typeof process !== 'undefined' &&
        process.env &&
        typeof process.env.PUBLIC_URL === 'string'
            ? process.env.PUBLIC_URL
            : ''

    if (typeof window !== 'undefined' && window.location?.protocol === 'file:') {
        return new URL('speak-pcm-tap.js', window.location.href).href
    }

    if (typeof window === 'undefined') {
        return '/speak-pcm-tap.js'
    }

    if (publicUrl.startsWith('http://') || publicUrl.startsWith('https://')) {
        const base = publicUrl.replace(/\/$/, '')
        return `${base}/speak-pcm-tap.js`
    }

    const origin = window.location.origin
    const trimmed = publicUrl.replace(/\/$/, '')

    if (!trimmed || trimmed === '.' || trimmed === './') {
        return `${origin}/speak-pcm-tap.js`
    }

    const pathPrefix = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
    return `${origin}${pathPrefix}/speak-pcm-tap.js`
}

function getPublicBaseUrlWithPath(pathWithTrailingSlash) {
    const publicUrl =
        typeof process !== 'undefined' &&
        process.env &&
        typeof process.env.PUBLIC_URL === 'string'
            ? process.env.PUBLIC_URL
            : ''

    if (typeof window !== 'undefined' && window.location?.protocol === 'file:') {
        return new URL(pathWithTrailingSlash, window.location.href).href
    }

    if (typeof window === 'undefined') {
        return `/${pathWithTrailingSlash}`
    }

    if (publicUrl.startsWith('http://') || publicUrl.startsWith('https://')) {
        const base = publicUrl.replace(/\/$/, '')
        return `${base}/${pathWithTrailingSlash}`
    }

    const origin = window.location.origin
    const trimmed = publicUrl.replace(/\/$/, '')

    if (!trimmed || trimmed === '.' || trimmed === './') {
        return `${origin}/${pathWithTrailingSlash}`
    }

    const pathPrefix = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
    return `${origin}${pathPrefix}/${pathWithTrailingSlash}`
}
