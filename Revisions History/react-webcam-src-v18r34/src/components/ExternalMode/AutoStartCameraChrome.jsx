import React from 'react'
import { useAtomValue } from 'jotai'
import { navAtom } from '../../atoms/navAtom'
import * as NAV from '../../atoms/navAtom'
import PlayTime from '../PlayTime'
import { Play, Pause } from 'react-feather'
import { PlayState } from '../../atoms/taskAtom'
import { APP_DISPLAY_TITLE } from '../../constants/appMeta'
import { usePlayPauseHandler } from '../../hooks/usePlayPauseHandler'

/**
 * Title + play/pause strip for CLI --auto-start (Navigation is hidden).
 * Shown above the camera column; visible even when the camera feed is off.
 */
function AutoStartCameraChrome() {
    const nav = useAtomValue(navAtom)
    const { playState, handlePlayPause, resumeMicLoading } = usePlayPauseHandler()

    const showPlayControls =
        playState === PlayState.PLAYING || playState === PlayState.PAUSED

    return (
        <div style={{ width: '100%' }}>
            <div className="row-centered">
                <h1 className="margin-y">{APP_DISPLAY_TITLE}</h1>
            </div>
            {showPlayControls && (
                <div className="navigation-row margin-y" style={{ justifyContent: 'center' }}>
                    <PlayTime />
                    <button
                        type="button"
                        className="button margin-x-sm"
                        disabled={nav !== NAV.PLAYING || resumeMicLoading}
                        style={{ width: '60px' }}
                        onClick={handlePlayPause}
                    >
                        {playState === PlayState.PLAYING ? (
                            <Pause size={18} />
                        ) : (
                            <Play size={18} />
                        )}
                    </button>
                </div>
            )}
        </div>
    )
}

export default AutoStartCameraChrome
