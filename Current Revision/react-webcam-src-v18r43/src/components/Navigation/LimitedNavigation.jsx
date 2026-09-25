import React from 'react';
import { useAtom } from 'jotai';
import { navAtom } from '../../atoms/navAtom';
import * as NAV from '../../atoms/navAtom';
import PlayTime from '../PlayTime';
import { HelpCircle, Grid, Mic as MicIcon, Zap, Folder, Droplet, Play, Pause, Circle, Check } from 'react-feather';
import { PlayState } from '../../atoms/taskAtom';
import { useButtplug } from '../../hooks/useButtplug';
import { usePlayPauseHandler } from '../../hooks/usePlayPauseHandler';
import { externalIntegrationService } from '../../services/externalIntegrationService';
import { exportCalibration } from '../Calibration/calibrationExportService';
import { APP_DISPLAY_TITLE } from '../../constants/appMeta';
import SetupFileMenu from '../SetupFileMenu';

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

    function handleContentLibrary() {
        handleChangeState(NAV.CONTENT_LIBRARY);
    }

    function handleThemes() {
        handleChangeState(NAV.THEMES);
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
    const showSetup = playState !== PlayState.PLAYING;
    const navClass = (route) => `nav-button${nav === route ? ' is-active' : ''}`;

    return (
        <>
        <header className="app-header">
            <div className="brand-lockup">
                <div>
                    <h1>{APP_DISPLAY_TITLE}</h1>
                    <div className="brand-eyebrow">Practice Makes Perfect</div>
                </div>
            </div>

            <nav className="primary-navigation" aria-label="Main navigation">
                <button
                    className={navClass(NAV.INSTRUCTIONS)}
                    disabled={disableNavigation}
                    onClick={handleInstructions}>
                    <HelpCircle size={18} /> <span>Help</span>
                </button>
                <button
                    className={navClass(NAV.CALIBRATE)}
                    disabled={disableNavigation}
                    onClick={handleCalibration}>
                    <Grid size={18} /> <span>Grids</span>
                </button>
                <button
                    className={navClass(NAV.MIC)}
                    disabled={disableNavigation}
                    onClick={handleMic}>
                    <MicIcon size={18} /> <span>Audio</span>
                </button>
                <button
                    className={navClass(NAV.BUTTPLUG)}
                    disabled={disableNavigation}
                    onClick={handleButtplug}>
                    <Zap size={18} /> <span>Buttplug</span>
                </button>
                <button
                    className={navClass(NAV.CONTENT_LIBRARY)}
                    disabled={disableNavigation}
                    onClick={handleContentLibrary}>
                    <Folder size={18} /> <span>Content Library</span>
                </button>
                <button
                    className={navClass(NAV.THEMES)}
                    disabled={disableNavigation}
                    onClick={handleThemes}>
                    <Droplet size={18} /> <span>Themes</span>
                </button>
                {isCalibrateOnly ? (
                    <button
                        className="nav-button nav-button-play"
                        onClick={handleDone}>
                        <Check size={18} /> <span>Done</span>
                    </button>
                ) : (
                    <button
                        className={`${navClass(NAV.PLAYING)} nav-button-play`}
                        disabled={disableNavigation && nav === NAV.PLAYING}
                        onClick={handleBeginPlay}>
                        <Circle size={18} /> <span>Play</span>
                    </button>
                )}
                {showPlayControls && (
                    <div className="play-controls">
                        <PlayTime />
                        <button
                            className="nav-button nav-pause-button"
                            disabled={nav !== NAV.PLAYING || resumeMicLoading}
                            onClick={handlePlayPause}>
                            {playState === PlayState.PLAYING ?
                                <Pause size={18} /> :
                                <Play size={18} />
                            }
                        </button>
                    </div>
                )}
            </nav>
        </header>
        {showSetup && (
            <div className="utility-navigation is-collapsed utility-navigation--limited">
                <div className="utility-tools">
                    <SetupFileMenu disabled={disableNavigation} />
                </div>
            </div>
        )}
        </>
    );
}

export default LimitedNavigation;
