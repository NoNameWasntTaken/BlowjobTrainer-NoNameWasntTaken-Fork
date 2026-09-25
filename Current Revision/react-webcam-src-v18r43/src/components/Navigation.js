import React, { useState } from 'react'
import { useAtom } from 'jotai'
import { navAtom } from '../atoms/navAtom'
import * as NAV from '../atoms/navAtom'
import PlayTime from './PlayTime'
import { Grid, Book, Play, Pause, Circle, Award, HelpCircle, Mic as MicIcon, Zap, Edit, Music, Folder, Droplet, ChevronDown, ChevronUp } from 'react-feather'
import { PlayState } from '../atoms/taskAtom'
import { useButtplug } from '../hooks/useButtplug'
import { externalIntegrationService } from '../services/externalIntegrationService'
import LimitedNavigation from './Navigation/LimitedNavigation'
import { usePlayPauseHandler } from '../hooks/usePlayPauseHandler'
import { APP_DISPLAY_TITLE } from '../constants/appMeta'
import SetupFileMenu from './SetupFileMenu'

function NavigationMain() {
    const [nav, setNav] = useAtom(navAtom)
    const [showMore, setShowMore] = useState(false)
    const { playState, handlePlayPause, resumeMicLoading } = usePlayPauseHandler()

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

    function handleThemes() {
        handleChangeState(NAV.THEMES)
    }

    const showPlayControls = playState === PlayState.PLAYING || playState === PlayState.PAUSED
    const navClass = (route) => `nav-button${nav === route ? ' is-active' : ''}`

    return (
        <>
        <header className="app-header">
            <div className="brand-lockup">
                <div>
                    <h1>{APP_DISPLAY_TITLE}</h1>
                    <div className="brand-eyebrow">Practice Makes Perfect</div>
                </div>
            </div>

            <div className="app-header-nav">
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
                        className={navClass(NAV.TRAINING)}
                        disabled={disableNavigation}
                        onClick={handleTraining}>
                        <Book size={18} /> <span>Levels</span>
                    </button>
                    <button
                        className={`${navClass(NAV.PLAYING)} nav-button-play`}
                        disabled={disableNavigation && nav === NAV.PLAYING}
                        onClick={handleBeginPlay}>
                        <Circle size={18} /> <span>Play</span>
                    </button>
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
            </div>
        </header>
        {!isPlaying && (
            <div className={`utility-navigation${showMore ? '' : ' is-collapsed'}`}>
                <div className="utility-tools">
                    <SetupFileMenu disabled={disableNavigation} />
                    <button
                        type="button"
                        className="utility-toggle"
                        aria-expanded={showMore}
                        onClick={() => setShowMore((open) => !open)}>
                        More {showMore ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>
                {showMore && (
                    <div className="utility-links">
                        <button
                            className={navClass(NAV.AUDIO_PACK_EDITOR)}
                            disabled={disableNavigation}
                            onClick={handleAudioPackEditor}>
                            <Music size={18} /> <span>Voice Pack Editor</span>
                        </button>
                        <button
                            className={navClass(NAV.LEVEL_EDITOR)}
                            disabled={disableNavigation}
                            onClick={handleLevelEditor}>
                            <Edit size={18} /> <span>Level Editor</span>
                        </button>
                        <button
                            className={navClass(NAV.ACHIEVEMENTS)}
                            disabled={disableNavigation}
                            onClick={handleAchievement}>
                            <Award size={18} /> <span>Profiles</span>
                        </button>
                        <button
                            className={navClass(NAV.THEMES)}
                            disabled={disableNavigation}
                            onClick={handleThemes}>
                            <Droplet size={18} /> <span>Themes</span>
                        </button>
                    </div>
                )}
            </div>
        )}
        </>
    )
}

function Navigation() {
    useButtplug()

    const isExternalMode = externalIntegrationService.isExternalMode();

    if (isExternalMode) {
        return <LimitedNavigation />;
    }

    return <NavigationMain />;
}

export default Navigation
