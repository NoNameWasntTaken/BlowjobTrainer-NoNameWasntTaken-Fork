/**
 * Enumerate media device ids after permission prompts (labels/deviceIds may be empty until then).
 */

import { store } from '../store';
import { micInputDeviceIdAtom } from '../atoms/audioAtom';
import { buildMicAudioConstraints } from './micCaptureConstraints';

/**
 * @returns {Promise<Set<string>>}
 */
export async function listVideoInputDeviceIdSet() {
    if (!navigator.mediaDevices?.getUserMedia || !navigator.mediaDevices?.enumerateDevices) {
        return new Set();
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((t) => t.stop());
        const devices = await navigator.mediaDevices.enumerateDevices();
        return new Set(
            devices.filter((d) => d.kind === 'videoinput' && d.deviceId).map((d) => d.deviceId)
        );
    } catch {
        return new Set();
    }
}

/**
 * @returns {Promise<Set<string>>}
 */
export async function listAudioInputDeviceIdSet() {
    if (!navigator.mediaDevices?.getUserMedia || !navigator.mediaDevices?.enumerateDevices) {
        return new Set();
    }
    try {
        const deviceId = store.get(micInputDeviceIdAtom);
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: buildMicAudioConstraints(deviceId),
        });
        stream.getTracks().forEach((t) => t.stop());
        const devices = await navigator.mediaDevices.enumerateDevices();
        return new Set(
            devices.filter((d) => d.kind === 'audioinput' && d.deviceId).map((d) => d.deviceId)
        );
    } catch {
        return new Set();
    }
}
