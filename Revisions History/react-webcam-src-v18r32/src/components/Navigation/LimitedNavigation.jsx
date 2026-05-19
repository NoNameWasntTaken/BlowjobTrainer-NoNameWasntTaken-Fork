import React from 'react';
import { useAtom } from 'jotai';
import { navAtom } from '../../atoms/navAtom';
import * as NAV from '../../atoms/navAtom';
import PlayTime from '../PlayTime';
import { HelpCircle, Compass, Mic as MicIcon, Zap, Play, Pause, Circle, Check } from 'react-feather';
import { PlayState } from '../../atoms/taskAtom';
import { useButtplug } from '../../hooks/useButtplug';
import { usePlayPauseHandler } from '../../hooks/usePlayPauseHandler';
import { externalIntegrationService } from '../../services/externalIntegrationService';
import { exportCalibration } from '../Calibration/calibrationExportService';
import { APP_DISPLAY_TITLE } from '../../constants/appMeta';

function LimitedNavigation() {
    const [nav, setNav] = useAtom(navAtom);
    const { playState, handlePlayPause, resumeMicLoading } = usePlayPauseHandler();
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
                <h1 className='margin-y'>{APP_DISPLAY_TITLE}</h1>
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
