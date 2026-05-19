import React, { useState, useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { playStateAtom, PlayState } from '../../atoms/taskAtom';
import { externalIntegrationService } from '../../services/externalIntegrationService';

function PauseTimer() {
    const playState = useAtomValue(playStateAtom);
    const [timeRemaining, setTimeRemaining] = useState(null);
    const [isActive, setIsActive] = useState(false);
    const [initialTime, setInitialTime] = useState(null);

    useEffect(() => {
        const pauseTime = externalIntegrationService.getPauseTimeLimit();
        
        if (pauseTime !== null && pauseTime >= 0) {
            setInitialTime(pauseTime);
            setTimeRemaining(pauseTime);
        }
    }, []);

    useEffect(() => {
        // Only count down when paused
        if (playState === PlayState.PAUSED && timeRemaining !== null && timeRemaining >= 0) {
            setIsActive(true);
        } else {
            setIsActive(false);
            // Reset timer when not paused
            if (initialTime !== null) {
                setTimeRemaining(initialTime);
            }
        }
    }, [playState, initialTime]);

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
                        window.electronAPI.requestExit(3, 'pause_timeout');
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isActive, timeRemaining]);

    if (!isActive || timeRemaining === null || playState !== PlayState.PAUSED) {
        return null;
    }

    // Format time as MM:SS
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;

    const formatTime = (value) => {
        return value.toString().padStart(2, '0');
    };

    const timeString = `${formatTime(minutes)}:${formatTime(seconds)}`;

    return (
        <div style={{
            position: 'fixed',
            top: 50,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(255, 0, 0, 0.8)',
            color: 'white',
            padding: '10px',
            textAlign: 'center',
            zIndex: 1000,
            fontSize: '18px',
            fontWeight: 'bold'
        }}>
            Pause Time Remaining: {timeString}
        </div>
    );
}

export default PauseTimer;
