import React, { useState, useEffect } from 'react';
import { externalIntegrationService } from '../../services/externalIntegrationService';

function CalibrationTimer() {
    const [timeRemaining, setTimeRemaining] = useState(null);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        const calibrationTime = externalIntegrationService.getCalibrationTimeLimit();
        
        if (calibrationTime !== null && calibrationTime >= 0) {
            setTimeRemaining(calibrationTime);
            setIsActive(true);
        } else {
            setIsActive(false);
        }
    }, []);

    useEffect(() => {
        if (!isActive || timeRemaining === null || timeRemaining <= 0) {
            return;
        }

        const interval = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    setIsActive(false);
                    // Timer reached 0 - trigger exit
                    if (window.electronAPI && window.electronAPI.requestExit) {
                        window.electronAPI.requestExit(2, 'calibration_timeout');
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isActive, timeRemaining]);

    if (!isActive || timeRemaining === null) {
        return null;
    }

    // Format time as HH:MM:SS
    const hours = Math.floor(timeRemaining / 3600);
    const minutes = Math.floor((timeRemaining % 3600) / 60);
    const seconds = timeRemaining % 60;

    const formatTime = (value) => {
        return value.toString().padStart(2, '0');
    };

    const timeString = `${formatTime(hours)}:${formatTime(minutes)}:${formatTime(seconds)}`;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '10px',
            textAlign: 'center',
            zIndex: 1000,
            fontSize: '18px',
            fontWeight: 'bold'
        }}>
            Calibration Time Remaining: {timeString}
        </div>
    );
}

export default CalibrationTimer;
