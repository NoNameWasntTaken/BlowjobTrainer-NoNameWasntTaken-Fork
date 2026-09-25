import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAtom } from 'jotai'
import { micInputDeviceIdAtom } from '../../atoms/audioAtom'
import { store } from '../../store'
import { buildMicAudioConstraints } from '../../utils/micCaptureConstraints'
import './MicInputDevicePicker.css'

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
 * Audio tab: pick an audioinput (e.g. default route or webcam mic). Matches webcam device button layout.
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

    useEffect(() => {
        if (selectedId != null) return
        const defaultDevice = devices.find(isDefaultLabeledAudioInput)
        if (defaultDevice?.deviceId) {
            setSelectedId(defaultDevice.deviceId)
        }
    }, [devices, selectedId, setSelectedId])

    const sortedDevices = useMemo(() => sortAudioInputsWithDefaultFirst(devices), [devices])

    return (
        <div
            className="row-centered mic-audio-section"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
            <h3 style={{ marginTop: '12px', marginBottom: '8px' }}>Audio Input</h3>
            <div>
                {sortedDevices.map((device, key) => (
                    <button
                        key={device.deviceId || `audio-${key}`}
                        type="button"
                        className={selectedId === device.deviceId ? 'u-audio-input-selected' : undefined}
                        onClick={() => setSelectedId(device.deviceId)}
                    >
                        {device.label || `Device ${key + 1}`}
                    </button>
                ))}
            </div>
        </div>
    )
}
