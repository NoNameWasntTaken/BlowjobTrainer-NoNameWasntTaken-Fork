import { useState, useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { playStateAtom, PlayState } from '../atoms/taskAtom';
import { externalIntegrationService } from '../services/externalIntegrationService';

/**
 * Hook to manage calibration and pause timers for external mode
 */
export function useExternalTimers() {
    const playState = useAtomValue(playStateAtom);
    const [calibrationTimeRemaining, setCalibrationTimeRemaining] = useState(null);
    const [pauseTimeRemaining, setPauseTimeRemaining] = useState(null);
    const [isCalibrationTimerActive, setIsCalibrationTimerActive] = useState(false);
    const [isPauseTimerActive, setIsPauseTimerActive] = useState(false);
    const [initialCalibrationTime, setInitialCalibrationTime] = useState(null);
    const [initialPauseTime, setInitialPauseTime] = useState(null);

    // Initialize timers from CLI config
    useEffect(() => {
        const calibrationTime = externalIntegrationService.getCalibrationTimeLimit();
        const pauseTime = externalIntegrationService.getPauseTimeLimit();

        if (calibrationTime !== null && calibrationTime >= 0) {
            setInitialCalibrationTime(calibrationTime);
            setCalibrationTimeRemaining(calibrationTime);
            setIsCalibrationTimerActive(true);
        }

        if (pauseTime !== null && pauseTime >= 0) {
            setInitialPauseTime(pauseTime);
            setPauseTimeRemaining(pauseTime);
        }
    }, []);

    // Calibration timer - counts down when active
    useEffect(() => {
        if (!isCalibrationTimerActive || calibrationTimeRemaining === null || calibrationTimeRemaining <= 0) {
            return;
        }

        const interval = setInterval(() => {
            setCalibrationTimeRemaining(prev => {
                if (prev <= 1) {
                    setIsCalibrationTimerActive(false);
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
    }, [isCalibrationTimerActive, calibrationTimeRemaining]);

    // Pause timer - only counts down when paused
    useEffect(() => {
        if (playState === PlayState.PAUSED && pauseTimeRemaining !== null && pauseTimeRemaining >= 0) {
            setIsPauseTimerActive(true);
        } else {
            setIsPauseTimerActive(false);
            // Reset timer when not paused
            if (initialPauseTime !== null) {
                setPauseTimeRemaining(initialPauseTime);
            }
        }
    }, [playState, initialPauseTime, pauseTimeRemaining]);

    useEffect(() => {
        if (!isPauseTimerActive || pauseTimeRemaining === null || pauseTimeRemaining <= 0) {
            return;
        }

        const interval = setInterval(() => {
            setPauseTimeRemaining(prev => {
                if (prev <= 1) {
                    setIsPauseTimerActive(false);
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
    }, [isPauseTimerActive, pauseTimeRemaining]);

    // Reset timers
    const resetCalibrationTimer = (newTime = null) => {
        const time = newTime !== null ? newTime : initialCalibrationTime;
        if (time !== null) {
            setCalibrationTimeRemaining(time);
            setIsCalibrationTimerActive(true);
        }
    };

    const resetPauseTimer = (newTime = null) => {
        const time = newTime !== null ? newTime : initialPauseTime;
        if (time !== null) {
            setPauseTimeRemaining(time);
            setIsPauseTimerActive(false);
        }
    };

    return {
        calibrationTimeRemaining,
        pauseTimeRemaining,
        resetCalibrationTimer,
        resetPauseTimer
    };
}
