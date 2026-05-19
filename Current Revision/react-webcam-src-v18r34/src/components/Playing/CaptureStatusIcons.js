import React from 'react'
import { useAtomValue } from 'jotai'
import { Camera, Video } from 'react-feather'
import { captureSessionAtom } from '../../atoms/captureAtom'

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

    // Hide entirely unless captures are allowed for this session (profile + level + user/CLI gate).
    // Level "standby" styling must not imply recording when captures are off.
    if (!session.capturesEnabled) return null

    // Both icons are always visible when captures are enabled; icon state (active/standby/inactive)
    // conveys per-channel availability. Task types that can never produce a given capture type
    // (e.g. HITDEPTH→video, UPANDDOWN→photo) are forced to 'inactive' by useCaptureManager.

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
            <span style={{ marginRight: 4 }}>Capture</span>
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
        </div>
    )
}
