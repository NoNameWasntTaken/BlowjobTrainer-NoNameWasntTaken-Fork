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
import { formatTime } from '../../constants/helpers'
import {
    exportPlayerProfile,
    parsePlayerProfile,
    profileExportFileName,
} from '../../services/profileExport'
import { triggerBrowserDownload } from '../../utils/levelFileFormat'
import '../ContentLibrary/ContentLibrary.css'

const PROFILE_FILE_MAX_BYTES = 10 * 1024 * 1024
const PROFILE_FILE_MESSAGE_MS = 4000

/** Space between a profile option heading and its helper copy. */
const PROFILE_OPTION_HELPER_TEXT_STYLE = {
    margin: 0,
    marginTop: '0.6rem',
    fontSize: '0.9rem',
    opacity: 0.88,
    lineHeight: 1.35,
    maxWidth: '42rem',
}

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
    const [importPreview, setImportPreview] = useState(null)
    const [profileFileMessage, setProfileFileMessage] = useState('')
    const [readingImport, setReadingImport] = useState(false)
    const nameInputRef = useRef(null)
    const importInputRef = useRef(null)
    const profileFileMessageTimer = useRef(null)

    const showProfileFileMessage = (message) => {
        if (profileFileMessageTimer.current) {
            clearTimeout(profileFileMessageTimer.current)
            profileFileMessageTimer.current = null
        }
        setProfileFileMessage(message)
        if (!message) return
        profileFileMessageTimer.current = setTimeout(() => {
            setProfileFileMessage('')
            profileFileMessageTimer.current = null
        }, PROFILE_FILE_MESSAGE_MS)
    }

    useEffect(() => () => {
        if (profileFileMessageTimer.current) clearTimeout(profileFileMessageTimer.current)
    }, [])

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
        const turningOn = !activeProfile.statTrackingEnabled
        const defaultConcealed = activeId === DEFAULT_PROFILE_ID && !showHiddenContent
        setPp({
            ...normalized,
            profiles: {
                ...normalized.profiles,
                [activeId]: {
                    ...activeProfile,
                    statTrackingEnabled: !activeProfile.statTrackingEnabled,
                    ...(defaultConcealed && turningOn
                        ? { bypassLevelRequirements: false }
                        : {}),
                },
            },
        })
    }

    const toggleBypassLevelRequirements = () => {
        if (sessionLocked || !activeProfile) return
        const turningOn = !activeProfile.bypassLevelRequirements
        const defaultConcealed = activeId === DEFAULT_PROFILE_ID && !showHiddenContent
        setPp({
            ...normalized,
            profiles: {
                ...normalized.profiles,
                [activeId]: {
                    ...activeProfile,
                    bypassLevelRequirements: !activeProfile.bypassLevelRequirements,
                    ...(defaultConcealed && turningOn
                        ? { statTrackingEnabled: false }
                        : {}),
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

    const handleExportProfile = () => {
        if (sessionLocked || !activeProfile) return
        showProfileFileMessage('')
        try {
            triggerBrowserDownload(
                profileExportFileName(activeProfile),
                exportPlayerProfile(activeProfile)
            )
            showProfileFileMessage('Profile export downloaded.')
        } catch (error) {
            showProfileFileMessage(error.message)
        }
    }

    const handleImportFile = async (event) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file || sessionLocked) return
        setImportPreview(null)
        showProfileFileMessage('')
        setReadingImport(true)
        try {
            if (file.size > PROFILE_FILE_MAX_BYTES) {
                throw new Error('Choose a profile file smaller than 10 MB. Your saved data has not been changed.')
            }
            const profile = parsePlayerProfile(await file.text())
            setImportPreview(profile)
        } catch (error) {
            showProfileFileMessage(error.message)
        } finally {
            setReadingImport(false)
        }
    }

    const writeImportedProfile = (profile) => {
        if (sessionLocked) return
        const stored = JSON.parse(JSON.stringify(profile))
        setPp((prev) => {
            const n = normalizePlayerProfilesState(prev)
            return {
                ...n,
                profiles: { ...n.profiles, [stored.id]: stored },
                activeProfileId: stored.id,
            }
        })
        setImportPreview(null)
        showProfileFileMessage(`Imported “${profile.name}”.`)
    }

    const handleConfirmImport = () => {
        if (!importPreview) return
        writeImportedProfile(importPreview)
    }

    const handleOverwriteImport = () => {
        if (!importPreview) return
        writeImportedProfile(importPreview)
    }

    const handleImportAsNewId = () => {
        if (!importPreview || sessionLocked) return
        const profile = { ...importPreview, id: newUserProfileId() }
        writeImportedProfile(profile)
    }

    const cancelImport = () => setImportPreview(null)

    const canSubmitName = !!(nameModal && draftName.trim())
    const importConflicts = !!(importPreview && normalized.profiles[importPreview.id])
    const unlockedCount = importPreview?.achievements?.unlockedAchievements?.length || 0

    const toggleAllowsCaptures = () => {
        if (sessionLocked || !activeProfile || activeId === DEFAULT_PROFILE_ID) return
        setPp({
            ...normalized,
            profiles: {
                ...normalized.profiles,
                [activeId]: {
                    ...activeProfile,
                    allowsCaptures: !activeProfile.allowsCaptures,
                },
            },
        })
    }

    const toggleAllowsHiddenCaptures = () => {
        if (sessionLocked || !activeProfile || activeId === DEFAULT_PROFILE_ID) return
        setPp({
            ...normalized,
            profiles: {
                ...normalized.profiles,
                [activeId]: {
                    ...activeProfile,
                    allowsHiddenCaptures: !activeProfile.allowsHiddenCaptures,
                },
            },
        })
    }

    const showBypassLevelRow =
        activeProfile && (activeId === DEFAULT_PROFILE_ID || showHiddenContent)

    return (
        <>
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
            <div className="profile-file-section margin-y-lg">
            <div
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
            >
                <div className="row-centered" style={{ flexWrap: 'wrap', gap: '8px' }}>
                    <button
                        type="button"
                        className="button"
                        disabled={sessionLocked || !activeProfile}
                        onClick={handleExportProfile}
                    >
                        Export Profile
                    </button>
                    <button
                        type="button"
                        className="button"
                        disabled={sessionLocked || readingImport}
                        onClick={() => importInputRef.current?.click()}
                    >
                        Import Profile
                    </button>
                    <input
                        ref={importInputRef}
                        type="file"
                        accept=".json,application/json"
                        hidden
                        onChange={handleImportFile}
                    />
                </div>
                {importPreview && (
                    <div>
                        <p style={{ margin: '4px 0' }}>
                            <strong>{importPreview.name}</strong>
                            {': '}
                            {formatTime(importPreview.timeStats.totalPlayTime)} play time, {unlockedCount} unlocked {unlockedCount === 1 ? 'achievement' : 'achievements'}.
                        </p>
                        {importConflicts && (
                            <p style={{ margin: '4px 0' }}>
                                A profile with this id already exists ({normalized.profiles[importPreview.id]?.name || importPreview.id}).
                            </p>
                        )}
                        <div className="row-centered" style={{ flexWrap: 'wrap', gap: '8px' }}>
                            {importConflicts ? (
                                <>
                                    <button
                                        type="button"
                                        className="button"
                                        disabled={sessionLocked}
                                        onClick={handleOverwriteImport}
                                    >
                                        Overwrite that profile
                                    </button>
                                    <button
                                        type="button"
                                        className="button"
                                        disabled={sessionLocked}
                                        onClick={handleImportAsNewId}
                                    >
                                        Import as a new id
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    className="button"
                                    disabled={sessionLocked}
                                    onClick={handleConfirmImport}
                                >
                                    Import this profile
                                </button>
                            )}
                            <button type="button" className="button" onClick={cancelImport}>
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
                {profileFileMessage && <p role="status" style={{ margin: 0 }}>{profileFileMessage}</p>}
            </div>
            </div>
            <div className="card margin-y-lg profile-manager-card">
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
            <div
                className="card-row border-bottom profile-option-row"
                style={{
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    gap: '0px',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: '100%',
                        gap: '0.75rem',
                    }}
                >
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
                <p style={PROFILE_OPTION_HELPER_TEXT_STYLE}>
                    When enabled, session results contribute to stat totals, level requirements, and achievements.
                </p>
            </div>
            {showBypassLevelRow && (
                <div
                    className="card-row border-bottom profile-option-row"
                    style={{
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        gap: '0px',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            width: '100%',
                            gap: '0.75rem',
                        }}
                    >
                        <span className="profile-manager-row-heading">Bypass Level Requirements</span>
                        <label>
                            <input
                                type="checkbox"
                                checked={activeProfile.bypassLevelRequirements === true}
                                disabled={sessionLocked}
                                onChange={toggleBypassLevelRequirements}
                            />
                        </label>
                    </div>
                    <p style={PROFILE_OPTION_HELPER_TEXT_STYLE}>
                        When enabled, level prerequisite ranks are ignored, and every level can be selected.
                    </p>
                </div>
            )}
            {activeId !== DEFAULT_PROFILE_ID && activeProfile && (
                <>
                    <div
                        className="card-row border-bottom profile-option-row"
                        style={{
                            flexDirection: 'column',
                            alignItems: 'stretch',
                            gap: '0px',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                width: '100%',
                                gap: '0.75rem',
                            }}
                        >
                            <span className="profile-manager-row-heading">Allow Webcam Captures</span>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={activeProfile.allowsCaptures === true}
                                    disabled={sessionLocked}
                                    onChange={toggleAllowsCaptures}
                                />
                            </label>
                        </div>
                        <p style={PROFILE_OPTION_HELPER_TEXT_STYLE}>
                            When enabled, qualifying custom levels may save photos/videos during play (packaged Electron app only).
                        </p>
                    </div>
                    <div
                        className="card-row border-bottom profile-option-row"
                        style={{
                            flexDirection: 'column',
                            alignItems: 'stretch',
                            gap: '0px',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                width: '100%',
                                gap: '0.75rem',
                            }}
                        >
                            <span className="profile-manager-row-heading">Allow Hidden Capture Notifications</span>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={activeProfile.allowsHiddenCaptures === true}
                                    disabled={sessionLocked}
                                    onChange={toggleAllowsHiddenCaptures}
                                />
                            </label>
                        </div>
                        <p style={PROFILE_OPTION_HELPER_TEXT_STYLE}>
                            When enabled, qualifying custom levels may hide notifications of photo/video captures.
                        </p>
                    </div>
                </>
            )}
            {showHiddenContent && activeId !== DEFAULT_PROFILE_ID && activeProfile && (
                <div className="card-row border-bottom">
                    <span className="profile-manager-row-heading">Hidden Profile</span>
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
        </>
    )
}
