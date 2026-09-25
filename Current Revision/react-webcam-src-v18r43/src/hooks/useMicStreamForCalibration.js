import { useEffect, useState } from 'react'
import { useAtomValue } from 'jotai'
import { micInputDeviceIdAtom } from '../atoms/audioAtom'
import { audioProcessingService } from '../services/audioProcessingService'
import { buildMicAudioConstraints } from '../utils/micCaptureConstraints'

/**
 * Opens the default / selected mic for Mic-tab calibration (same graph as useClapDetection own lifecycle).
 * Call useSherpaMicTap({ enabled: micReady, pcmFeedAllowedRef }) after this returns true.
 */
export function useMicStreamForCalibration() {
    const micInputDeviceId = useAtomValue(micInputDeviceIdAtom)
    const [micReady, setMicReady] = useState(false)

    useEffect(() => {
        let cancelled = false
        const abortController = new AbortController()

        const init = async () => {
            try {
                const ctx = await audioProcessingService.ensureAudioContext()
                await ctx.resume()
                if (cancelled) return

                let stream
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        audio: buildMicAudioConstraints(micInputDeviceId),
                        signal: abortController.signal,
                    })
                } catch (err) {
                    if (err.name === 'AbortError') return
                    throw err
                }
                if (cancelled) {
                    stream.getTracks().forEach((t) => t.stop())
                    return
                }

                audioProcessingService.connectMic(stream)
                if (!audioProcessingService.getMicConnected()) {
                    throw new Error('Microphone could not be connected to the audio graph')
                }
                if (cancelled) {
                    audioProcessingService.disconnectMic()
                    return
                }
                setMicReady(true)
            } catch (error) {
                if (error.name === 'AbortError') return
                console.error('useMicStreamForCalibration:', error)
                setMicReady(false)
            }
        }

        setMicReady(false)
        void init()

        return () => {
            cancelled = true
            abortController.abort()
            setMicReady(false)
            audioProcessingService.disconnectMic()
        }
    }, [micInputDeviceId])

    return micReady
}
