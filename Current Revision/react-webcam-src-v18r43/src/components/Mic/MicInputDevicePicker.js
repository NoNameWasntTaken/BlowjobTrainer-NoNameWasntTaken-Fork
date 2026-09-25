import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAtom } from 'jotai'
import { micInputDeviceIdAtom } from '../../atoms/audioAtom'
import { store } from '../../store'
import { buildMicAudioConstraints } from '../../utils/micCaptureConstraints'

/** OS/browser often labels the routed default mic as "Default - …" (e.g. Chrome on macOS). */
function isDefaultLabeledAudioInput(device) {
    return /^Default\b/i.test(device.label || '')
}

function sortAudioInputsWithDefaultFirst(devices) {
    const defaultLabeled = []
    const rest = []
    for (const d of devices) {
        if (isDefaultLabeledAudioInput(d)) defaultLabeled.push(d)
        else rest.push(d)
    }
    return [...defaultLabeled, ...rest]
}

async function listAudioInputsWithLabels() {
    if (!navigator.mediaDevices?.enumerateDevices) return []
    let devices = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'audioinput')
    if (devices.length > 0 && devices.some((d) => d.label)) return devices
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: buildMicAudioConstraints(store.get(micInputDeviceIdAtom)),
        })
        stream.getTracks().forEach((t) => t.stop())
        devices = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'audioinput')
    } catch (e) {
        console.error('Microphone permission needed to list audio inputs:', e)
    }
    return devices
}

/**
 * Audio tab: pick an audioinput. Same labeled select as the camera source.
 */
export default function MicInputDevicePicker() {
    const [selectedId, setSelectedId] = useAtom(micInputDeviceIdAtom)
    const [devices, setDevices] = useState([])

    const refreshDevices = useCallback(() => listAudioInputsWithLabels().then(setDevices), [])

    useEffect(() => {
        void refreshDevices()
        const onDeviceChange = () => void refreshDevices()
        navigator.mediaDevices?.addEventListener?.('devicechange', onDeviceChange)
        return () => navigator.mediaDevices?.removeEventListener?.('devicechange', onDeviceChange)
    }, [refreshDevices])

    const sortedDevices = useMemo(() => sortAudioInputsWithDefaultFirst(devices), [devices])

    return (
        <div className="audio-source mic-audio-section">
            <label htmlFor="audio-device">Audio Source: </label>
            <select
                id="audio-device"
                value={selectedId ?? ''}
                onChange={(event) => setSelectedId(event.target.value || null)}
            >
                <option value="">Default microphone</option>
                {sortedDevices.map((device, key) => (
                    <option key={device.deviceId || `audio-${key}`} value={device.deviceId}>
                        {device.label || `Microphone ${key + 1}`}
                    </option>
                ))}
            </select>
        </div>
    )
}
