import React, { useState } from 'react'
import { useAtom } from 'jotai'
import {
    savedThemesAtom,
    themeDraftActiveAtom,
    themeDraftAtom,
    themeIdAtom,
} from '../../atoms/themeAtom'
import {
    DEFAULT_CUSTOM_COLORS,
    PRESET_THEME_COLORS,
    THEME_PRESETS,
    createThemeId,
    isPresetThemeId,
    normalizeCustomColors,
} from '../../theme/theme'

const CUSTOM_FIELDS = [
    { key: 'accent', label: 'Accent' },
    { key: 'page', label: 'Page' },
    { key: 'ink', label: 'Ink' },
    { key: 'danger', label: 'Danger' },
]

export default function Themes() {
    const [themeId, setThemeId] = useAtom(themeIdAtom)
    const [savedThemes, setSavedThemes] = useAtom(savedThemesAtom)
    const [draft, setDraft] = useAtom(themeDraftAtom)
    const [draftActive, setDraftActive] = useAtom(themeDraftActiveAtom)
    const [newName, setNewName] = useState('')

    const selectedSaved = savedThemes.find((theme) => theme.id === themeId) || null
    const presetColors = PRESET_THEME_COLORS[themeId] || DEFAULT_CUSTOM_COLORS
    const editorColors = selectedSaved
        ? selectedSaved.colors
        : (draftActive ? draft : presetColors)

    const selectPreset = (id) => {
        setThemeId(id)
        setDraft(PRESET_THEME_COLORS[id] || DEFAULT_CUSTOM_COLORS)
        setDraftActive(false)
    }

    const selectSaved = (id) => {
        setThemeId(id)
        setDraftActive(false)
    }

    const setColor = (key, value) => {
        if (selectedSaved) {
            setSavedThemes((themes) => themes.map((theme) => (
                theme.id === selectedSaved.id
                    ? { ...theme, colors: normalizeCustomColors({ ...theme.colors, [key]: value }) }
                    : theme
            )))
            return
        }
        const base = draftActive ? draft : presetColors
        setDraft(normalizeCustomColors({ ...base, [key]: value }))
        setDraftActive(true)
    }

    const saveAsNew = () => {
        const name = (selectedSaved ? selectedSaved.name : newName).trim() || 'Custom'
        const theme = {
            id: createThemeId(),
            name,
            colors: normalizeCustomColors(editorColors),
        }
        setSavedThemes((themes) => [...themes, theme])
        setThemeId(theme.id)
        setDraftActive(false)
        setNewName('')
    }

    const renameSelected = (name) => {
        if (!selectedSaved || !name.trim()) return
        setSavedThemes((themes) => themes.map((theme) => (
            theme.id === selectedSaved.id ? { ...theme, name: name.trim() } : theme
        )))
    }

    const deleteSelected = () => {
        if (!selectedSaved) return
        setSavedThemes((themes) => themes.filter((theme) => theme.id !== selectedSaved.id))
        setThemeId('default')
        setDraft(DEFAULT_CUSTOM_COLORS)
        setDraftActive(false)
    }

    return (
        <div>
            <h2 className="tab-title">Themes</h2>
            <section className="card margin-y-lg theme-control" aria-label="Theme">
                <div className="theme-picker">
                    <label htmlFor="theme-select">Select Theme:</label>
                    <select
                        id="theme-select"
                        value={themeId}
                        onChange={(event) => {
                            const id = event.target.value
                            if (isPresetThemeId(id)) selectPreset(id)
                            else selectSaved(id)
                        }}
                    >
                        <optgroup label="Built-in">
                            {THEME_PRESETS.map((preset) => (
                                <option key={preset.id} value={preset.id}>{preset.label}</option>
                            ))}
                        </optgroup>
                        {savedThemes.length > 0 && (
                            <optgroup label="Saved">
                                {savedThemes.map((theme) => (
                                    <option key={theme.id} value={theme.id}>{theme.name}</option>
                                ))}
                            </optgroup>
                        )}
                    </select>
                </div>

                <h3 className="theme-create-heading">Create Theme</h3>
                <div className="theme-swatches" aria-hidden="true">
                    <span className="theme-swatch" style={{ background: 'var(--accent)' }} />
                    <span className="theme-swatch" style={{ background: 'var(--page)', color: 'var(--ink)' }}>Aa</span>
                    <span className="theme-swatch" style={{ background: 'var(--danger)' }} />
                </div>
                <div className="theme-color-grid">
                    {CUSTOM_FIELDS.map((field) => (
                        <React.Fragment key={field.key}>
                            <label htmlFor={`theme-${field.key}`}>{field.label}</label>
                            <input
                                id={`theme-${field.key}`}
                                className="theme-color-input"
                                type="color"
                                value={editorColors[field.key]}
                                onChange={(event) => setColor(field.key, event.target.value)}
                            />
                            <span className="theme-color-hex">{editorColors[field.key]}</span>
                        </React.Fragment>
                    ))}
                </div>
                <div className="theme-save-row">
                    <input
                        type="text"
                        value={selectedSaved ? selectedSaved.name : newName}
                        placeholder="Theme name"
                        maxLength={80}
                        aria-label="Theme name"
                        onChange={(event) => {
                            if (selectedSaved) renameSelected(event.target.value)
                            else setNewName(event.target.value)
                        }}
                    />
                    <button type="button" className="button button-primary" onClick={saveAsNew}>
                        Save as new
                    </button>
                    <button
                        type="button"
                        className="button"
                        disabled={!selectedSaved}
                        onClick={deleteSelected}
                    >
                        Delete
                    </button>
                </div>
                <p className="theme-note">
                    {isPresetThemeId(themeId) && !selectedSaved
                        ? 'Color edits stay unsaved until you save them as a new theme. Built-in palettes are unchanged.'
                        : 'Color edits update the selected saved theme.'}
                </p>
            </section>
        </div>
    )
}
