import React, { useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import { ButtplugClient, ButtplugBrowserWebsocketClientConnector } from 'buttplug';
import {
    buttplugClientAtom,
    buttplugDevicesAtom,
    buttplugConnectedAtom,
    maxDeviceSpeedAtom,
    vibrateSpeedAtom
} from '../../atoms/buttplugAtom';
import NumberControl from '../NumberControl';
import { useButtplug } from '../../hooks/useButtplug';

function ButtplugComponent() {
    const [client, setClient] = useAtom(buttplugClientAtom);
    const [devices, setDevices] = useAtom(buttplugDevicesAtom);
    const [isConnected, setIsConnected] = useAtom(buttplugConnectedAtom);
    const [maxDeviceSpeed, setMaxDeviceSpeed] = useAtom(maxDeviceSpeedAtom);
    const [vibrateSpeed, setVibrateSpeed] = useAtom(vibrateSpeedAtom);
    const [error, setError] = useState(null);

    // Local state for controls
    const [localMaxSpeed, setLocalMaxSpeed] = useState(maxDeviceSpeed);
    const [localSpeed, setLocalSpeed] = useState(vibrateSpeed);

    // Hook for device vibration
    useButtplug(maxDeviceSpeed);

    // Sync local state with atoms
    useEffect(() => {
        setMaxDeviceSpeed(localMaxSpeed);
    }, [localMaxSpeed, setMaxDeviceSpeed]);

    useEffect(() => {
        setVibrateSpeed(localSpeed);
    }, [localSpeed, setVibrateSpeed]);

    const connectToServer = async () => {
        try {
            const client = new ButtplugClient("Blowjob Trainer");

            client.addListener('deviceadded', async (device) => {
                setDevices(prevDevices => [...prevDevices, device]);
                await client.stopScanning();
            });

            client.addListener('deviceremoved', (device) => {
                setDevices(prevDevices =>
                    prevDevices.filter(d => d.Index !== device.Index)
                );
            });

            client.addListener('scanningfinished', () => {
                console.log("Scanning Finished");
            });

            const connector = new ButtplugBrowserWebsocketClientConnector("ws://127.0.0.1:12345/buttplug");
            await client.connect(connector);

            setClient(client);
            setIsConnected(true);
            setError(null);

            await client.startScanning();
        } catch (err) {
            console.error('Connection error:', err);
            setError(`Failed to connect: ${err?.message || err?.toString() || 'Unknown error'}`);
        }
    };

    const disconnectFromServer = async () => {
        if (client) {
            try {
                await client.disconnect();
                setClient(null);
                setIsConnected(false);
                setDevices([]);
                setError(null);
            } catch (err) {
                console.error('Disconnect error:', err);
                setError(`Failed to disconnect: ${err?.message || err?.toString() || 'Unknown error'}`);
            }
        }
    };

    const renderNoDevices = () => (
        <p>No devices connected. Make sure your device is turned on and in range.</p>
    );

    const renderConnectedDevices = () => (
        <>
            <div className="margin-y row-centered">
                <NumberControl
                    label="Set Max Vibration"
                    value={localMaxSpeed}
                    setValue={setLocalMaxSpeed}
                    min={0.1}
                    max={1}
                    step={0.1}
                />

                <NumberControl
                    label="Test Vibration"
                    value={localSpeed}
                    setValue={setLocalSpeed}
                    min={0}
                    max={1}
                    step={0.1}
                />
            </div>
            <ul className="margin-y-sm">
                {devices.map(device => (
                    <li key={device.Index} className="padding-x padding-y">
                        {device.name} - {device.vibrateAttributes.length > 0 ? 'Vibrate' : 'No vibration'}
                    </li>
                ))}
            </ul>
        </>
    );

    return (
        <div>
            <h2 className="tab-title">Buttplug Integration</h2>

            <div>
                <p>In order to connect to toys you'll need to download <a href='https://intiface.com'>intiface</a> and connect your device via that.  Start the service up, once running you should then be able to see the device in the list below.</p>
            </div>

            {error && (
                <div className="margin-y-sm padding-x-sm border-grey" style={{ backgroundColor: '#ffebee', color: '#c62828' }}>
                    {error}
                </div>
            )}

            <div className="row-centered margin-y">
                {!isConnected ? (
                    <button
                        className="button button-primary"
                        onClick={connectToServer}>
                        Connect to Buttplug Server
                    </button>
                ) : (
                    <button
                        className="button"
                        onClick={disconnectFromServer}>
                        Disconnect
                    </button>
                )}
            </div>

            {isConnected && (
                <div className="padding-y padding-x margin-y">
                    <h3 className="margin-y-sm">Connected Devices</h3>
                    {devices.length === 0 ? renderNoDevices() : renderConnectedDevices()}
                </div>
            )}
        </div>
    );
}

export default ButtplugComponent; 