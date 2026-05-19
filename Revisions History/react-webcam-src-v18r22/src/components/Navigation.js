import React from 'react'
import { useAtom, useSetAtom } from 'jotai'
import { navAtom } from '../atoms/navAtom'
import * as NAV from '../atoms/navAtom'
import PlayTime from './PlayTime'
import { Compass, Book, Play, Pause, Circle, Award, HelpCircle, Mic as MicIcon, Zap, Edit, Music, Folder } from 'react-feather'
import { playStateAtom, PlayState } from '../atoms/taskAtom'
import { vibrateSpeedAtom } from '../atoms/buttplugAtom'
import { useButtplug } from '../hooks/useButtplug'
import { externalIntegrationService } from '../services/externalIntegrationService'
import LimitedNavigation from './Navigation/LimitedNavigation'

function Navigation() {
    // Call ALL hooks first, before any conditional returns
    const [nav, setNav] = useAtom(navAtom)
    const [playState, setPlayState] = useAtom(playStateAtom)
    const setVibrateSpeed = useSetAtom(vibrateSpeedAtom)
    useButtplug()
    
    // Check if external mode is active
    const isExternalMode = externalIntegrationService.isExternalMode();
    
    // If external mode, render limited navigation
    if (isExternalMode) {
        return <LimitedNavigation />;
    }

    // Determine if buttons should be disabled based on play state
    const isPlaying = playState === PlayState.PLAYING
    const isPaused = playState === PlayState.PAUSED
    const disableNavigation = isPlaying && !isPaused

    function handleChangeState(toState) {
        setNav(toState)
    }

    function handleInstructions() {
        handleChangeState(NAV.INSTRUCTIONS)
    }

    function handleCalibration() {
        handleChangeState(NAV.CALIBRATE)
    }

    function handleTraining() {
        handleChangeState(NAV.TRAINING)
    }

    function handleBeginPlay() {
        handleChangeState(NAV.PLAYING)
    }

    function handleAchievement() {
        handleChangeState(NAV.ACHIEVEMENTS)
    }

    function handleMic() {
        handleChangeState(NAV.MIC)
    }

    function handleButtplug() {
        handleChangeState(NAV.BUTTPLUG)
    }

    function handleLevelEditor() {
        handleChangeState(NAV.LEVEL_EDITOR)
    }

    function handleAudioPackEditor() {
        handleChangeState(NAV.AUDIO_PACK_EDITOR)
    }

    function handleContentLibrary() {
        handleChangeState(NAV.CONTENT_LIBRARY)
    }

    function handlePlayPause() {
        setVibrateSpeed(0)
        if (playState === PlayState.PLAYING) {
            setPlayState(PlayState.PAUSED)
        } else if (playState === PlayState.PAUSED) {
            setPlayState(PlayState.PLAYING)
        }
    }

    const showPlayControls = playState === PlayState.PLAYING || playState === PlayState.PAUSED

    return (
        <div>
            <div className='row-centered'>
                <h1 className='margin-y'>Blowjob Trainer</h1>
            </div>

            {/* Row 1: Help, Calibrate, Mic, Buttplug, Levels, Play */}
            <div className='navigation-row margin-y'>
                <button
                    className={`button margin-x-sm padding-x ${nav === NAV.INSTRUCTIONS && "button-primary"}`}
                    disabled={disableNavigation}
                    onClick={handleInstructions}>
                    <HelpCircle size={18} className="margin-xr-sm" /> Help
                </button>
                {/* <button
                    className={`button margin-x-sm padding-x ${nav === NAV.SETUP && "button-primary"}`}
                    disabled={disableNavigation}
                    onClick={handleSetup}>
                    <Settings size={18} className="margin-xr-sm" /> Setup
                </button> */}
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
                <button
                    className={`button margin-x-sm padding-x ${nav === NAV.TRAINING && "button-primary"}`}
                    disabled={disableNavigation}
                    onClick={handleTraining}>
                    <Book size={18} className="margin-xr-sm" /> Levels
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

            {/* Row 2: Content Library, Voice Pack Editor, Edit Levels, Achievements */}
            <div className='navigation-row margin-y'>
                <button
                    className={`button margin-x-sm padding-x ${nav === NAV.CONTENT_LIBRARY && "button-primary"}`}
                    disabled={disableNavigation}
                    onClick={handleContentLibrary}>
                    <Folder size={18} className="margin-xr-sm" /> Content Library
                </button>
                <button
                    className={`button margin-x-sm padding-x ${nav === NAV.AUDIO_PACK_EDITOR && "button-primary"}`}
                    disabled={disableNavigation}
                    onClick={handleAudioPackEditor}>
                    <Music size={18} className="margin-xr-sm" /> Voice Pack Editor
                </button>
                <button
                    className={`button margin-x-sm padding-x ${nav === NAV.LEVEL_EDITOR && "button-primary"}`}
                    disabled={disableNavigation}
                    onClick={handleLevelEditor}>
                    <Edit size={18} className="margin-xr-sm" /> Edit Levels
                </button>
                <button
                    className={`button margin-x-sm padding-x ${nav === NAV.ACHIEVEMENTS && "button-primary"}`}
                    disabled={disableNavigation}
                    onClick={handleAchievement}>
                    <Award size={18} className="margin-xr-sm" /> Profiles
                </button>
            </div>
        </div>
    )
}

export default Navigation
