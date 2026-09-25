import { atomWithStorage } from 'jotai/utils';

export const CAMERA_VIEWPORT_HEIGHT_CAP_MIN = 0.5;
export const CAMERA_VIEWPORT_HEIGHT_CAP_MAX = 1.0;
/** Default matches previous hardcoded VIEWPORT_HEIGHT_CAP in WebcamDisplay. */
export const CAMERA_VIEWPORT_HEIGHT_CAP_DEFAULT = 0.8;

/** Clamp for camera preview max-height fraction of `window.innerHeight` (WebcamDisplay). */
export function clampCameraViewportHeightCap(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return CAMERA_VIEWPORT_HEIGHT_CAP_DEFAULT;
    return Math.min(CAMERA_VIEWPORT_HEIGHT_CAP_MAX, Math.max(CAMERA_VIEWPORT_HEIGHT_CAP_MIN, n));
}

const cameraViewportHeightCapStorage = {
    getItem: (key, initialValue) => {
        try {
            const raw = localStorage.getItem(key);
            if (raw === null) return initialValue;
            return clampCameraViewportHeightCap(JSON.parse(raw));
        } catch {
            return initialValue;
        }
    },
    setItem: (key, value) => {
        localStorage.setItem(key, JSON.stringify(clampCameraViewportHeightCap(value)));
    },
    removeItem: (key) => localStorage.removeItem(key),
};

export const cameraViewportHeightCapAtom = atomWithStorage(
    'cameraViewportHeightCap',
    CAMERA_VIEWPORT_HEIGHT_CAP_DEFAULT,
    cameraViewportHeightCapStorage,
);

export const cameraEnabledAtom = atomWithStorage('cameraEnabled', true);

/**
 * `MediaDeviceInfo.deviceId` for `videoinput`. `null` = use default constraint (`facingMode: 'user'` in WebcamDisplay).
 */
export const cameraVideoDeviceIdAtom = atomWithStorage('cameraVideoDeviceId', null, undefined, {
    getOnInit: true,
});
