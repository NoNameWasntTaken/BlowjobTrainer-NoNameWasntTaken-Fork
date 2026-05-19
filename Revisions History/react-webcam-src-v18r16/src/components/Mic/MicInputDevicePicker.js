import React, { useCallback, useEffect, useState } from 'react'
import { useAtom } from 'jotai'
import { micInputDeviceIdAtom } from '../../atoms/audioAtom'
import { store } from '../../store'
import { buildMicAudioConstraints } from '../../utils/micCaptureConstraints'
import './MicInputDevicePicker.css'

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
 * Audio tab: pick default or a specific audioinput (e.g. webcam mic). Matches webcam device button layout.
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

    // Match WebcamDisplay video source list: row-centered column, plain <button> (no .button / .padding-x / primary).
    return (
        <div
            className="row-centered"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
            <h5 style={{ marginTop: '12px', marginBottom: '8px' }}>Audio Input</h5>
            <div>
                <button
                    type="button"
                    className={selectedId == null ? 'u-audio-input-selected' : undefined}
                    onClick={() => setSelectedId(null)}
                >
                    System default
                </button>
                {devices.map((device, key) => (
                    <button
                        key={device.deviceId || `audio-${key}`}
                        type="button"
                        className={
                            selectedId != null && selectedId === device.deviceId
                                ? 'u-audio-input-selected'
                                : undefined
                        }
                        onClick={() => setSelectedId(device.deviceId)}
                    >
                        {device.label || `Device ${key + 1}`}
                    </button>
                ))}
            </div>
        </div>
    )
}
