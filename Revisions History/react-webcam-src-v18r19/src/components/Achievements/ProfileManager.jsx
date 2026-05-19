import React, { useMemo } from 'react'
import { useAtom, useAtomValue } from 'jotai'
import {
    playerProfilesAtom,
    DEFAULT_PROFILE_ID,
    createEmptyProfile,
    normalizePlayerProfilesState,
    getResolvedActiveProfileId,
} from '../../atoms/playerAtom'
import * as NAV from '../../atoms/navAtom'
import { navAtom } from '../../atoms/navAtom'

function newUserProfileId() {
    return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `p-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export default function ProfileManager() {
    const [pp, setPp] = useAtom(playerProfilesAtom)
    const nav = useAtomValue(navAtom)
    const sessionLocked = nav === NAV.PLAYING || nav === NAV.GAMEOVER

    const normalized = useMemo(() => normalizePlayerProfilesState(pp), [pp])
    const activeId = getResolvedActiveProfileId(normalized)
    const activeProfile = normalized.profiles[activeId]
    const profileIds = Object.keys(normalized.profiles)

    const setActive = (id) => {
        if (sessionLocked || !normalized.profiles[id]) return
        setPp({ ...normalized, activeProfileId: id })
    }

    const toggleTracking = () => {
        if (sessionLocked || !activeProfile) return
        setPp({
            ...normalized,
            profiles: {
                ...normalized.profiles,
                [activeId]: {
                    ...activeProfile,
                    statTrackingEnabled: !activeProfile.statTrackingEnabled,
                },
            },
        })
    }

    const handleNewProfile = () => {
        if (sessionLocked) return
        const name = window.prompt('New profile name', 'Profile')
        if (name == null || !String(name).trim()) return
        const id = newUserProfileId()
        const fresh = createEmptyProfile(id, String(name).trim())
        setPp({
            ...normalizePlayerProfilesState(pp),
            profiles: {
                ...normalizePlayerProfilesState(pp).profiles,
                [id]: fresh,
            },
            activeProfileId: id,
        })
    }

    const handleRename = () => {
        if (sessionLocked || activeId === DEFAULT_PROFILE_ID || !activeProfile) return
        const name = window.prompt('Profile name', activeProfile.name)
        if (name == null || !String(name).trim()) return
        const n = normalizePlayerProfilesState(pp)
        setPp({
            ...n,
            profiles: {
                ...n.profiles,
                [activeId]: { ...n.profiles[activeId], name: String(name).trim() },
            },
        })
    }

    const handleCopy = () => {
        if (sessionLocked || !activeProfile) return
        const name = window.prompt('Name for copied profile', `${activeProfile.name} copy`)
        if (name == null || !String(name).trim()) return
        const id = newUserProfileId()
        const clone = JSON.parse(JSON.stringify(activeProfile))
        clone.id = id
        clone.name = String(name).trim()
        const n = normalizePlayerProfilesState(pp)
        setPp({
            ...n,
            profiles: { ...n.profiles, [id]: clone },
            activeProfileId: id,
        })
    }

    const copyIdToClipboard = () => {
        if (!activeId) return
        void navigator.clipboard?.writeText(activeId)
    }

    return (
        <div className="card margin-y-lg profile-manager-card">
            {sessionLocked && (
                <p className="margin-y-sm" style={{ opacity: 0.85 }}>
                    Profile changes are disabled while playing or on the level summary screen.
                </p>
            )}
            <div className="card-row border-bottom">
                <span className="profile-manager-row-heading">Active Profile</span>
                <select
                    className="button"
                    style={{ maxWidth: '220px' }}
                    value={activeId}
                    disabled={sessionLocked}
                    onChange={(e) => setActive(e.target.value)}
                >
                    {profileIds.map((id) => (
                        <option key={id} value={id}>
                            {normalized.profiles[id]?.name || id}
                        </option>
                    ))}
                </select>
            </div>
            <div className="card-row border-bottom">
                <span className="profile-manager-row-heading">Profile ID</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.85em' }}>{activeId}</span>
                <button
                    type="button"
                    className="button margin-x-sm"
                    disabled={sessionLocked}
                    onClick={copyIdToClipboard}
                >
                    Copy id
                </button>
            </div>
            <div className="card-row border-bottom">
                <span className="profile-manager-row-heading">Track Stats & Achievements</span>
                <label>
                    <input
                        type="checkbox"
                        checked={!!activeProfile?.statTrackingEnabled}
                        disabled={sessionLocked}
                        onChange={toggleTracking}
                    />
                </label>
            </div>
            <div className="row-centered margin-y-sm" style={{ flexWrap: 'wrap', gap: '8px' }}>
                <button type="button" className="button" disabled={sessionLocked} onClick={handleNewProfile}>
                    New profile
                </button>
                <button
                    type="button"
                    className="button"
                    disabled={sessionLocked || activeId === DEFAULT_PROFILE_ID}
                    onClick={handleRename}
                >
                    Rename
                </button>
                <button type="button" className="button" disabled={sessionLocked} onClick={handleCopy}>
                    Copy profile
                </button>
            </div>
        </div>
    )
}
