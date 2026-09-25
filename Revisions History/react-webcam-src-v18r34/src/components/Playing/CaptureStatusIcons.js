import React from 'react'
import { useAtomValue } from 'jotai'
import { Camera, Video } from 'react-feather'
import { captureSessionAtom } from '../../atoms/captureAtom'
import { effectiveMirrorAtom } from '../../atoms/mirrorModeAtom'
import * as NAV from '../../atoms/navAtom'
import { navAtom } from '../../atoms/navAtom'
import { playStateAtom, PlayState } from '../../atoms/taskAtom'

/** Inactive: idle / no capture activity on this channel */
const INACTIVE_COLOR = '#bbb'
/** Standby: captures may occur (hidden notification path or standby UI level option) */
const STANDBY_COLOR = '#111'
/** Active: capture in progress or visible notification */
const ACTIVE_COLOR = '#d00'
const ICON_SIZE = 22

function captureGlyphColor(state) {
    if (state === 'active') return ACTIVE_COLOR
    if (state === 'standby') return STANDBY_COLOR
    return INACTIVE_COLOR
}

/** Photo / video capture status (inactive / standby / active). */
export default function CaptureStatusIcons() {
    const session = useAtomValue(captureSessionAtom)
    const effectiveMirror = useAtomValue(effectiveMirrorAtom)
    const nav = useAtomValue(navAtom)
    const playState = useAtomValue(playStateAtom)

    const levelActive =
        nav === NAV.PLAYING &&
        (playState === PlayState.PLAYING || playState === PlayState.PAUSED)

    // Hide unless captures are allowed and a level is actively playing or paused.
    // capturesEnabled stays true after level end for Gameover stats; HUD must not linger.
    if (!session.capturesEnabled || !levelActive) return null

    const showStandbyInactive = session.showStandbyInactiveIcons
    const showPhotoIcon = showStandbyInactive || session.photoIconState === 'active'
    const showVideoIcon = showStandbyInactive || session.videoIconState === 'active'

    // When standby/inactive icons are disabled, hide the HUD until a visible capture is active.
    if (!showPhotoIcon && !showVideoIcon) return null

    return (
        <div
            style={{
                position: 'fixed',
                bottom: 24,
                right: 24,
                zIndex: 50,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                color: '#333',
                background: 'rgba(255,255,255,0.9)',
                padding: '6px 10px',
                borderRadius: 8,
                boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
            }}
        >
            <span
                style={{
                    marginRight: 4,
                    ...(effectiveMirror ? { transform: 'scaleX(-1)', display: 'inline-block' } : {}),
                }}
            >
                Capture
            </span>
            {showPhotoIcon && (
                <span
                    title="Photo"
                    style={{ display: 'inline-flex', alignItems: 'center', lineHeight: 0 }}
                >
                    <Camera
                        size={ICON_SIZE}
                        color={captureGlyphColor(session.photoIconState)}
                        strokeWidth={2}
                        aria-hidden
                    />
                </span>
            )}
            {showVideoIcon && (
                <span
                    title="Video"
                    style={{ display: 'inline-flex', alignItems: 'center', lineHeight: 0 }}
                >
                    <Video
                        size={ICON_SIZE}
                        color={captureGlyphColor(session.videoIconState)}
                        strokeWidth={2}
                        aria-hidden
                    />
                </span>
            )}
        </div>
    )
}
