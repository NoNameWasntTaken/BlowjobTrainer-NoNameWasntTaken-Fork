import { useAtom, useAtomValue } from 'jotai';
import { useCallback, useEffect } from 'react';
import {
    buttplugDevicesAtom,
    vibrateSpeedAtom,
    maxDeviceSpeedAtom,
    buttplugConnectedAtom
} from '../atoms/buttplugAtom';

// used for setting the vibration speed. 
export function useButtplug() {
    const [devices] = useAtom(buttplugDevicesAtom);
    const [vibrateSpeed, setVibrateSpeed] = useAtom(vibrateSpeedAtom);
    const [isConnected] = useAtom(buttplugConnectedAtom);
    const maxVibration = useAtomValue(maxDeviceSpeedAtom)

    // Ensure maxVibration is between 0 and 1
    const normalizedMax = Math.max(0, Math.min(1, maxVibration));

    /**
     * Apply vibration to all devices
     * @param {number} deviceSpeed - Value between 0 and 1 for the device
     * @returns {Promise<void>}
     */
    const applyVibrationToDevices = useCallback(async (deviceSpeed) => {
        if (!isConnected) {
            console.warn('Buttplug not connected');
            return;
        }

        // Apply to all devices
        for (const device of devices) {
            if (device.vibrateAttributes.length > 0) {
                try {
                    await device.vibrate(deviceSpeed);
                } catch (err) {
                    console.error(`Failed to vibrate device ${device.name}:`, err);
                }
            }
        }
    }, [isConnected, devices]);

    // Watch for changes to vibration speed and max speed
    useEffect(() => {
        const deviceSpeed = vibrateSpeed * normalizedMax;
        applyVibrationToDevices(deviceSpeed);
    }, [vibrateSpeed, normalizedMax, applyVibrationToDevices]);

    /**
     * Adjust the current vibration speed by a delta value
     * @param {number} delta - Value to add or subtract from current speed (-1 to 1)
     * @returns {Promise<void>}
     */
    const adjustVibration = useCallback(async (delta) => {
        // Current speed is already normalized, just adjust and clamp
        const newNormalized = Math.max(0, Math.min(1, vibrateSpeed + delta));
        setVibrateSpeed(newNormalized);
    }, [vibrateSpeed, setVibrateSpeed]);

    /**
     * Stop all vibration
     * @returns {Promise<void>}
     */
    const stopVibration = useCallback(async () => {
        setVibrateSpeed(0);
    }, [setVibrateSpeed]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // Stop vibration when component unmounts
            stopVibration();
        };
    }, [stopVibration]);

    return {
        isConnected,
        devices,
        setVibrateSpeed,
        adjustVibration,
        stopVibration
    };
} 