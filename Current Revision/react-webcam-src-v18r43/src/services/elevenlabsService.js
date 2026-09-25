export const ELEVENLABS_CONCURRENCY = 3

/**
 * Generate speech audio via ElevenLabs text-to-speech API.
 * @returns {Promise<Blob>} MP3 audio blob
 */
export async function generateSpeech(text, { apiKey, voiceId, speed, stability, similarity, style }) {
    if (!apiKey || !voiceId || !text?.trim()) {
        throw new Error('API Key, Voice ID, and text are required')
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
            Accept: 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
        },
        body: JSON.stringify({
            text: text.trim(),
            model_id: 'eleven_multilingual_v2',
            output_format: 'mp3_44100_128',
            voice_settings: {
                stability: stability / 100,
                similarity_boost: similarity / 100,
                speed,
                style: style / 100,
            },
        }),
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: { message: 'Unknown error' } }))
        throw new Error(errorData.detail?.message || `HTTP error! status: ${response.status}`)
    }

    return response.blob()
}
