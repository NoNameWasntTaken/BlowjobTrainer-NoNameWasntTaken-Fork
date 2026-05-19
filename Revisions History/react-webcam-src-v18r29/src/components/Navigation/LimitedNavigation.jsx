import React, { useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { navAtom } from '../../atoms/navAtom';
import * as NAV from '../../atoms/navAtom';
import PlayTime from '../PlayTime';
import { HelpCircle, Compass, Mic as MicIcon, Zap, Play, Pause, Circle, Check } from 'react-feather';
import { playStateAtom, PlayState } from '../../atoms/taskAtom';
import { vibrateSpeedAtom } from '../../atoms/buttplugAtom';
import { useButtplug } from '../../hooks/useButtplug';
import { externalIntegrationService } from '../../services/externalIntegrationService';
import { exportCalibration } from '../Calibration/calibrationExportService';
import {
    ensureGameplayMicBeforeResume,
    isGameplayMicActive,
} from '../../services/gameplayMicSession';

function LimitedNavigation() {
    const [nav, setNav] = useAtom(navAtom);
    const [playState, setPlayState] = useAtom(playStateAtom);
    const [resumeMicLoading, setResumeMicLoading] = useState(false);
    const setVibrateSpeed = useSetAtom(vibrateSpeedAtom);
    useButtplug();

    const isCalibrateOnly = externalIntegrationService.isCalibrationOnlyMode();

    // Determine if buttons should be disabled based on play state (not applicable in calibrate-only)
    const isPlaying = playState === PlayState.PLAYING;
    const isPaused = playState === PlayState.PAUSED;
    const disableNavigation = !isCalibrateOnly && isPlaying && !isPaused;

    function handleChangeState(toState) {
        setNav(toState);
    }

    function handleInstructions() {
        handleChangeState(NAV.INSTRUCTIONS);
    }

    function handleCalibration() {
        handleChangeState(NAV.CALIBRATE);
    }

    function handleMic() {
        handleChangeState(NAV.MIC);
    }

    function handleButtplug() {
        handleChangeState(NAV.BUTTPLUG);
    }

    function handleBeginPlay() {
        handleChangeState(NAV.PLAYING);
    }

    function handlePlayPause() {
        setVibrateSpeed(0);
        if (playState === PlayState.PLAYING) {
            setPlayState(PlayState.PAUSED);
        } else if (playState === PlayState.PAUSED) {
            void (async () => {
                setResumeMicLoading(true);
                try {
                    await ensureGameplayMicBeforeResume();
                    if (!isGameplayMicActive()) {
                        window.alert('Microphone could not be restarted. Check permissions and try again.');
                        return;
                    }
                    setPlayState(PlayState.PLAYING);
                } catch (e) {
                    console.error('Resume: microphone error:', e);
                    window.alert(e?.message || 'Could not access the microphone for gameplay.');
                } finally {
                    setResumeMicLoading(false);
                }
            })();
        }
    }

    async function handleDone() {
        const result = await exportCalibration();
        if (result.success && window.electronAPI?.requestExit) {
            window.electronAPI.requestExit(0, 'calibration_complete');
        }
    }

    const showPlayControls = !isCalibrateOnly && (playState === PlayState.PLAYING || playState === PlayState.PAUSED);

    return (
        <div>
            <div className='row-centered'>
                <h1 className='margin-y'>Blowjob Trainer</h1>
            </div>

            {/* Calibrate-only: Help, Calibrate, Audio, Buttplug, Done | Level mode: Help, Calibrate, Audio, Buttplug, Play */}
            <div className='navigation-row margin-y'>
                <button
                    className={`button margin-x-sm padding-x ${nav === NAV.INSTRUCTIONS && "button-primary"}`}
                    disabled={disableNavigation}
                    onClick={handleInstructions}>
                    <HelpCircle size={18} className="margin-xr-sm" /> Help
                </button>
                <button
                    className={`button margin-x-sm padding-x ${nav === NAV.CALIBRATE && "button-primary"}`}
                    disabled={disableNavigation}
                    onClick={handleCalibration}>
                    <Compass size={18} className="margin-xr-sm" /> Calibrate
                </button>
                <button
                    className={`button margin-x-sm padding-x ${nav === NAV.MIC && "button-primary"}`}
                    disabled={disableNavigation}
                    onClick={handleMic}>
                    <MicIcon size={18} className="margin-xr-sm" /> Audio
                </button>
                <button
                    className={`button margin-x-sm padding-x ${nav === NAV.BUTTPLUG && "button-primary"}`}
                    disabled={disableNavigation}
                    onClick={handleButtplug}>
                    <Zap size={18} className="margin-xr-sm" /> Buttplug
                </button>
                {isCalibrateOnly ? (
                    <button
                        className="button button-primary margin-x-sm padding-x"
                        onClick={handleDone}>
                        <Check size={18} className="margin-xr-sm" /> Done
                    </button>
                ) : (
                    <button
                        className={`button margin-x-sm padding-x ${nav === NAV.PLAYING && "button-primary"}`}
                        disabled={disableNavigation && nav === NAV.PLAYING}
                        onClick={handleBeginPlay}>
                        <Circle size={18} className="margin-xr-sm" /> Play
                    </button>
                )}
                {showPlayControls && (
                    <>
                        <PlayTime />
                        <button
                            className="button margin-x-sm"
                            disabled={nav !== NAV.PLAYING || resumeMicLoading}
                            style={{ width: '60px' }}
                            onClick={handlePlayPause}>
                            {playState === PlayState.PLAYING ?
                                <Pause size={18} /> :
                                <Play size={18} />
                            }
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

export default LimitedNavigation;
