import React, { useMemo, useState, useEffect, useRef } from 'react'
import { useAtom, useAtomValue } from 'jotai'
import { X } from 'react-feather'
import {
    playerProfilesAtom,
    DEFAULT_PROFILE_ID,
    createEmptyProfile,
    normalizePlayerProfilesState,
    getResolvedActiveProfileId,
} from '../../atoms/playerAtom'
import * as NAV from '../../atoms/navAtom'
import { navAtom } from '../../atoms/navAtom'
import { showHiddenContentAtom } from '../../atoms/hiddenContentAtom'
import { isVisibleInUi } from '../../utils/hiddenContentVisibility'
import '../ContentLibrary/ContentLibrary.css'

function newUserProfileId() {
    return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `p-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export default function ProfileManager() {
    const [pp, setPp] = useAtom(playerProfilesAtom)
    const nav = useAtomValue(navAtom)
    const showHiddenContent = useAtomValue(showHiddenContentAtom)
    const sessionLocked = nav === NAV.PLAYING || nav === NAV.GAMEOVER
    const [nameModal, setNameModal] = useState(null)
    const [draftName, setDraftName] = useState('')
    const nameInputRef = useRef(null)

    const normalized = useMemo(() => normalizePlayerProfilesState(pp), [pp])
    const activeId = getResolvedActiveProfileId(normalized)
    const activeProfile = normalized.profiles[activeId]
    const profileIds = Object.keys(normalized.profiles).filter(
        (id) =>
            id === DEFAULT_PROFILE_ID ||
            isVisibleInUi(normalized.profiles[id], showHiddenContent)
    )

    const toggleProfileHidden = () => {
        if (sessionLocked || activeId === DEFAULT_PROFILE_ID || !activeProfile) return
        setPp({
            ...normalized,
            profiles: {
                ...normalized.profiles,
                [activeId]: {
                    ...activeProfile,
                    hidden: !(activeProfile.hidden === true),
                },
            },
        })
    }

    const closeNameModal = () => {
        setNameModal(null)
        setDraftName('')
    }

    const confirmNameModal = () => {
        if (!nameModal) return
        const name = draftName.trim()
        if (!name) return

        if (nameModal.mode === 'new') {
            const id = newUserProfileId()
            const fresh = createEmptyProfile(id, name)
            setPp((prev) => {
                const n = normalizePlayerProfilesState(prev)
                return {
                    ...n,
                    profiles: { ...n.profiles, [id]: fresh },
                    activeProfileId: id,
                }
            })
        } else if (nameModal.mode === 'rename' && nameModal.targetId) {
            const tid = nameModal.targetId
            setPp((prev) => {
                const n = normalizePlayerProfilesState(prev)
                if (!n.profiles[tid]) return n
                return {
                    ...n,
                    profiles: {
                        ...n.profiles,
                        [tid]: { ...n.profiles[tid], name },
                    },
                }
            })
        } else if (nameModal.mode === 'copy' && nameModal.targetId) {
            const tid = nameModal.targetId
            const newId = newUserProfileId()
            setPp((prev) => {
                const n = normalizePlayerProfilesState(prev)
                const source = n.profiles[tid]
                if (!source) return n
                const clone = JSON.parse(JSON.stringify(source))
                clone.id = newId
                clone.name = name
                return {
                    ...n,
                    profiles: { ...n.profiles, [newId]: clone },
                    activeProfileId: newId,
                }
            })
        }
        closeNameModal()
    }

    useEffect(() => {
        if (!nameModal) return
        const el = nameInputRef.current
        if (el) {
            el.focus()
            el.select()
        }
    }, [nameModal])

    useEffect(() => {
        if (!nameModal) return
        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault()
                closeNameModal()
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [nameModal])

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
        setNameModal({ mode: 'new', title: 'New profile' })
        setDraftName('Profile')
    }

    const handleRename = () => {
        if (sessionLocked || activeId === DEFAULT_PROFILE_ID || !activeProfile) return
        setNameModal({
            mode: 'rename',
            title: 'Rename profile',
            targetId: activeId,
        })
        setDraftName(activeProfile.name)
    }

    const handleCopy = () => {
        if (sessionLocked || !activeProfile) return
        setNameModal({
            mode: 'copy',
            title: 'Copy profile',
            targetId: activeId,
        })
        setDraftName(`${activeProfile.name} copy`)
    }

    const copyIdToClipboard = () => {
        if (!activeId) return
        void navigator.clipboard?.writeText(activeId)
    }

    const canSubmitName = !!(nameModal && draftName.trim())

    return (
        <div className="card margin-y-lg profile-manager-card">
            {nameModal && (
                <div
                    className="import-dialog-overlay"
                    role="presentation"
                    onClick={closeNameModal}
                >
                    <div
                        className="import-dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="profile-name-modal-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="dialog-header">
                            <h3 id="profile-name-modal-title">{nameModal.title}</h3>
                            <button
                                type="button"
                                className="button-icon"
                                onClick={closeNameModal}
                                aria-label="Close"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="dialog-content" style={{ marginTop: 0 }}>
                            <label htmlFor="profile-name-input" className="margin-y-sm" style={{ display: 'block' }}>
                                Profile name
                            </label>
                            <input
                                id="profile-name-input"
                                ref={nameInputRef}
                                type="text"
                                className="button"
                                style={{
                                    width: '100%',
                                    maxWidth: '100%',
                                    boxSizing: 'border-box',
                                    marginTop: '8px',
                                    textAlign: 'left',
                                }}
                                value={draftName}
                                onChange={(e) => setDraftName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.target.value.trim()) {
                                        e.preventDefault()
                                        confirmNameModal()
                                    }
                                }}
                            />
                            <div
                                className="row-centered margin-y-sm"
                                style={{ justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}
                            >
                                <button type="button" className="button" onClick={closeNameModal}>
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="button"
                                    disabled={!canSubmitName}
                                    onClick={confirmNameModal}
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
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
            {showHiddenContent && activeId !== DEFAULT_PROFILE_ID && activeProfile && (
                <div className="card-row border-bottom">
                    <span className="profile-manager-row-heading">Hidden</span>
                    <label>
                        <input
                            type="checkbox"
                            checked={activeProfile.hidden === true}
                            disabled={sessionLocked}
                            onChange={toggleProfileHidden}
                        />
                    </label>
                </div>
            )}
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
