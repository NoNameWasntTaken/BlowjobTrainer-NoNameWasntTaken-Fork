import React from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { navAtom } from '../../atoms/navAtom';
import * as NAV from '../../atoms/navAtom';
import PlayTime from '../PlayTime';
import { HelpCircle, Compass, Mic as MicIcon, Zap, Play, Pause, Circle } from 'react-feather';
import { playStateAtom, PlayState } from '../../atoms/taskAtom';
import { vibrateSpeedAtom } from '../../atoms/buttplugAtom';
import { useButtplug } from '../../hooks/useButtplug';

function LimitedNavigation() {
    const [nav, setNav] = useAtom(navAtom);
    const [playState, setPlayState] = useAtom(playStateAtom);
    const setVibrateSpeed = useSetAtom(vibrateSpeedAtom);
    useButtplug();

    // Determine if buttons should be disabled based on play state
    const isPlaying = playState === PlayState.PLAYING;
    const isPaused = playState === PlayState.PAUSED;
    const disableNavigation = isPlaying && !isPaused;

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
            setPlayState(PlayState.PLAYING);
        }
    }

    const showPlayControls = playState === PlayState.PLAYING || playState === PlayState.PAUSED;

    return (
        <div>
            <div className='row-centered'>
                <h1 className='margin-y'>Blowjob Trainer</h1>
            </div>

            {/* Limited navigation row: Help, Calibrate, Mic, Buttplug, Play */}
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
                    <MicIcon size={18} className="margin-xr-sm" /> Mic
                </button>
                <button
                    className={`button margin-x-sm padding-x ${nav === NAV.BUTTPLUG && "button-primary"}`}
                    disabled={disableNavigation}
                    onClick={handleButtplug}>
                    <Zap size={18} className="margin-xr-sm" /> Buttplug
                </button>
                <button
                    className={`button margin-x-sm padding-x ${nav === NAV.PLAYING && "button-primary"}`}
                    disabled={disableNavigation && nav === NAV.PLAYING}
                    onClick={handleBeginPlay}>
                    <Circle size={18} className="margin-xr-sm" /> Play
                </button>
                {showPlayControls && (
                    <>
                        <PlayTime />
                        <button
                            className="button margin-x-sm"
                            disabled={nav !== NAV.PLAYING}
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
