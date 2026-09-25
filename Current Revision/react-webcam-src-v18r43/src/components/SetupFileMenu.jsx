import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { exportCalibration } from './Calibration/calibrationExportService'
import { calibrationService } from '../services/calibrationService'
import './ContentLibrary/ContentLibrary.css'

const EXPORT_SECTIONS = [
    {
        id: 'camera',
        label: 'Camera',
        hint: 'The selected camera, the preview rotation, and the preview size percentage.',
    },
    {
        id: 'grids',
        label: 'Grids',
        hint: 'The painted tracking grids, each grid’s color and sensitivity, the depth percentages, balls depth, and the depth buffer.',
    },
    {
        id: 'audio',
        label: 'Audio',
        hint: 'Clap sensitivity, volume levels for SFX, voice, and music, fade in and out on music, and the selected microphone device.',
    },
    {
        id: 'voicePack',
        label: 'Voice Pack',
        hint: 'Which voice pack is selected. The pack’s audio files are not included.',
    },
    {
        id: 'backgroundTrack',
        label: 'Background Track',
        hint: 'Which background track is selected, or none. The audio file is not included.',
    },
    {
        id: 'theme',
        label: 'Theme',
        hint: 'The active theme. If a custom theme is used, also includes the custom accent, page, ink, and danger colors.',
    },
    {
        id: 'misc',
        label: 'Misc',
        hint: 'Whether mirror mode is on, and whether the depth diagram is flipped.',
    },
]

const SETUP_STATUS_MS = 4000

const allSectionsOn = () => Object.fromEntries(EXPORT_SECTIONS.map((section) => [section.id, true]))

export default function SetupFileMenu({ disabled }) {
    const rootRef = useRef(null)
    const fileInputRef = useRef(null)
    const [open, setOpen] = useState(false)
    const [exportDialogOpen, setExportDialogOpen] = useState(false)
    const [sections, setSections] = useState(allSectionsOn)
    const [busy, setBusy] = useState(null)
    const [message, setMessage] = useState(null)
    const messageTimerRef = useRef(null)
    const anySectionSelected = EXPORT_SECTIONS.some((section) => sections[section.id])

    const showMessage = (next) => {
        if (messageTimerRef.current) {
            clearTimeout(messageTimerRef.current)
            messageTimerRef.current = null
        }
        setMessage(next)
        if (next?.tone !== 'success') return
        messageTimerRef.current = setTimeout(() => {
            setMessage(null)
            messageTimerRef.current = null
        }, SETUP_STATUS_MS)
    }

    useEffect(() => () => {
        if (messageTimerRef.current) clearTimeout(messageTimerRef.current)
    }, [])

    useEffect(() => {
        if (disabled) {
            setOpen(false)
            setExportDialogOpen(false)
        }
    }, [disabled])

    useEffect(() => {
        if (!exportDialogOpen) return undefined
        const onKeyDown = (event) => {
            if (event.key === 'Escape') setExportDialogOpen(false)
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [exportDialogOpen])

    useEffect(() => {
        if (!open) return undefined

        const onKeyDown = (event) => {
            if (event.key === 'Escape') setOpen(false)
        }
        const onPointerDown = (event) => {
            if (!rootRef.current?.contains(event.target)) setOpen(false)
        }

        document.addEventListener('keydown', onKeyDown)
        document.addEventListener('pointerdown', onPointerDown)
        return () => {
            document.removeEventListener('keydown', onKeyDown)
            document.removeEventListener('pointerdown', onPointerDown)
        }
    }, [open])

    const openExportDialog = () => {
        setSections(allSectionsOn())
        setOpen(false)
        setExportDialogOpen(true)
    }

    const handleExport = async () => {
        setBusy('export')
        showMessage(null)
        try {
            const result = await exportCalibration(sections)
            if (result.success) {
                if (result.data) {
                    const dataStr = JSON.stringify(result.data, null, 2)
                    const dataBlob = new Blob([dataStr], { type: 'application/json' })
                    const url = URL.createObjectURL(dataBlob)
                    const link = document.createElement('a')
                    link.href = url
                    link.download = 'calibration_data.json'
                    link.click()
                    URL.revokeObjectURL(url)
                }
                setExportDialogOpen(false)
                setOpen(true)
                showMessage({ tone: 'success', text: 'Setup exported.' })
            } else if (!result.canceled) {
                setMessage({ tone: 'error', text: result.error || 'Export failed' })
            }
        } catch (error) {
            setMessage({ tone: 'error', text: error.message || 'Export failed' })
        } finally {
            setBusy(false)
        }
    }

    const handleFileSelect = async (event) => {
        const file = event.target.files?.[0]
        if (fileInputRef.current) fileInputRef.current.value = ''
        if (!file) return

        setBusy('import')
        showMessage(null)
        try {
            const calibrationData = JSON.parse(await file.text())
            const result = await calibrationService.importCalibration(calibrationData)
            if (result.success) {
                showMessage({ tone: 'success', text: 'Setup imported.' })
            } else {
                setMessage({ tone: 'error', text: result.errors.join(', ') || 'Import failed' })
            }
        } catch (error) {
            setMessage({ tone: 'error', text: error.message || 'Failed to parse setup file' })
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="setup-file" ref={rootRef}>
            <button
                type="button"
                className="setup-file-trigger"
                aria-expanded={open}
                aria-haspopup="menu"
                disabled={disabled}
                onClick={() => setOpen((current) => !current)}
            >
                Setup
            </button>
            {open && (
                <div className="setup-file-menu" role="menu">
                    <button
                        type="button"
                        className="setup-file-action"
                        role="menuitem"
                        disabled={busy}
                        onClick={openExportDialog}
                    >
                        Export settings
                    </button>
                    <button
                        type="button"
                        className="setup-file-action"
                        role="menuitem"
                        disabled={busy}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        Import settings
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json,application/json"
                        hidden
                        onChange={handleFileSelect}
                    />
                    {message && (
                        <p className={`setup-file-status setup-file-status--${message.tone}`} role="status">
                            {message.text}
                        </p>
                    )}
                </div>
            )}
            {exportDialogOpen && createPortal(
                <div
                    className="import-dialog-overlay"
                    onClick={() => { if (!busy) setExportDialogOpen(false) }}
                >
                    <div
                        className="import-dialog setup-export-dialog"
                        role="dialog"
                        aria-labelledby="setup-export-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="dialog-header">
                            <h3 id="setup-export-title">Export settings</h3>
                        </div>
                        <div className="dialog-content setup-export-sections">
                            {EXPORT_SECTIONS.map((section) => (
                                <div key={section.id} className="setup-export-option">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={sections[section.id]}
                                            disabled={busy === 'export'}
                                            onChange={(event) => {
                                                setSections((current) => ({
                                                    ...current,
                                                    [section.id]: event.target.checked,
                                                }))
                                            }}
                                        />
                                        {section.label}
                                    </label>
                                    <button
                                        type="button"
                                        className="setup-export-help"
                                        aria-label={`What ${section.label} includes`}
                                    >
                                        ?
                                        <span className="setup-export-tip" role="tooltip">{section.hint}</span>
                                    </button>
                                </div>
                            ))}
                            {message && !open && (
                                <p className={`setup-file-status setup-file-status--${message.tone}`} role="status">
                                    {message.text}
                                </p>
                            )}
                        </div>
                        <div className="setup-export-actions">
                            <button type="button" className="button" disabled={busy === 'export'} onClick={() => setExportDialogOpen(false)}>
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="button button-primary"
                                disabled={!anySectionSelected || busy === 'export'}
                                onClick={handleExport}
                            >
                                {busy === 'export' ? 'Exporting…' : 'Export'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
