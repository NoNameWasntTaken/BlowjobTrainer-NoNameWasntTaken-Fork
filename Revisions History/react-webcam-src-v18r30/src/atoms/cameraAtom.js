import { atomWithStorage } from 'jotai/utils';

export const cameraEnabledAtom = atomWithStorage('cameraEnabled', true);

/**
 * `MediaDeviceInfo.deviceId` for `videoinput`. `null` = use default constraint (`facingMode: 'user'` in WebcamDisplay).
 */
export const cameraVideoDeviceIdAtom = atomWithStorage('cameraVideoDeviceId', null, undefined, {
    getOnInit: true,
});
