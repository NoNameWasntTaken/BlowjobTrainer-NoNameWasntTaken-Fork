import React, { useState } from 'react';
import { useButtplug } from '../../hooks/useButtplug';

function ButtplugExample() {
    const [maxVibration, setMaxVibration] = useState(0.5);
    const {
        isConnected,
        devices,
        currentSpeed,
        maxVibration: normalizedMax,
        setNormalizedVibration,
        stopVibration
    } = useButtplug(maxVibration);

    if (!isConnected) {
        return <p>Please connect to Buttplug server first</p>;
    }

    return (
        <div>
            <h3>Buttplug Example</h3>

            <div className="control-section">
                <h4>Max Vibration Setting</h4>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={maxVibration}
                    onChange={(e) => setMaxVibration(parseFloat(e.target.value))}
                />
                <span>{maxVibration.toFixed(1)}</span>
            </div>

            <div className="control-section">
                <h4>Normalized Vibration Control</h4>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={currentSpeed / normalizedMax}
                    onChange={(e) => setNormalizedVibration(parseFloat(e.target.value))}
                />
                <span>{(currentSpeed / normalizedMax).toFixed(1)}</span>
            </div>

            <div className="control-section">
                <h4>Quick Controls</h4>
                <button onClick={() => setNormalizedVibration(0.25)}>25%</button>
                <button onClick={() => setNormalizedVibration(0.5)}>50%</button>
                <button onClick={() => setNormalizedVibration(0.75)}>75%</button>
                <button onClick={() => setNormalizedVibration(1.0)}>100%</button>
                <button onClick={stopVibration}>Stop</button>
            </div>

            <div className="info-section">
                <p>Connected Devices: {devices.length}</p>
                <p>Current Speed: {currentSpeed.toFixed(2)}</p>
                <p>Max Vibration: {normalizedMax.toFixed(2)}</p>
            </div>
        </div>
    );
}

export default ButtplugExample; 