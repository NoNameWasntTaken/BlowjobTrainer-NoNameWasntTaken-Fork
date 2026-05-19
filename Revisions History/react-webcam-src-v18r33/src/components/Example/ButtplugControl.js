import React from 'react';
import { useAtom } from 'jotai';
import {
    buttplugDevicesAtom,
    vibrateSpeedAtom,
    buttplugConnectedAtom
} from '../../atoms/buttplugAtom';

function ButtplugControl() {
    const [devices] = useAtom(buttplugDevicesAtom);
    const [vibrateSpeed, setVibrateSpeed] = useAtom(vibrateSpeedAtom);
    const [isConnected] = useAtom(buttplugConnectedAtom);

    const handleVibrate = async (speed) => {
        for (const device of devices) {
            if (device.vibrateAttributes.length > 0) {
                try {
                    await device.vibrate(speed);
                } catch (err) {
                    console.error(`Failed to vibrate device ${device.name}:`, err);
                }
            }
        }
    };

    if (!isConnected) {
        return <p>Please connect to Buttplug server first</p>;
    }

    return (
        <div>
            <h3>Buttplug Control</h3>
            <div>
                <button onClick={() => handleVibrate(0.5)}>Vibrate 50%</button>
                <button onClick={() => handleVibrate(1.0)}>Vibrate 100%</button>
                <button onClick={() => handleVibrate(0)}>Stop</button>
            </div>
            <div>
                <p>Connected Devices: {devices.length}</p>
                <p>Current Speed: {vibrateSpeed.toFixed(2)}</p>
            </div>
        </div>
    );
}

export default ButtplugControl; 