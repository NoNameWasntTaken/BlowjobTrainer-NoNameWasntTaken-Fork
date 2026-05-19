import React from 'react'
import { audioManager } from '../../services/audioManager'

const CUSTOM_KEYS = Array.from({ length: 20 }, (_, i) => `Custom${i + 1}`)

/**
 * AudioSelector - Dropdown for selecting audio from available packs
 * @param {string} value - Current selected audio value (e.g., "Hold.ONE")
 * @param {function} onChange - Callback when audio selection changes
 * @param {string} label - Label for the selector
 * @param {Array} allowedOptions - Optional array of allowed audio options. If provided, only these options will be shown.
 *                                 Format: [{ value: "Hold.ONE", label: "Hold.ONE" }, ...]
 * @param {string} audioPackId - Optional voice pack ID to use for this level (overrides active pack)
 * @param {boolean} summaryStyle - Fixed-width label column, narrower select (session summary rows)
 * @param {React.ReactNode} summaryExtra - Optional slot after Preview (e.g. custom-voice checkbox)
 */
const AudioSelector = ({ value, onChange, label = "Voice", allowedOptions = null, audioPackId = null, summaryStyle = false, summaryExtra = null }) => {
    const [audioOptions, setAudioOptions] = React.useState([])

    React.useEffect(() => {
        // If allowedOptions is provided, use those directly
        if (allowedOptions && allowedOptions.length > 0) {
            setAudioOptions(allowedOptions)
            return
        }

        // Load the specified pack if provided, otherwise use active pack
        const customPack = audioPackId 
            ? audioManager.loadPack(audioPackId)
            : audioManager.getActiveCustomPack()
        
        // Otherwise, get all available audio options from default and specified/active custom pack
        const defaultAudio = audioManager.getDefaultAudio()

        const options = []

        // Add options from default audio
        for (const category in defaultAudio) {
            if (typeof defaultAudio[category] === 'object' && defaultAudio[category] !== null) {
                for (const key in defaultAudio[category]) {
                    if (defaultAudio[category][key] !== null) {
                        options.push({
                            value: `${category}.${key}`,
                            label: `${category}.${key}`,
                            category: category
                        })
                    }
                }
            }
        }

        // Add options from custom pack if active
        if (customPack && customPack.audioFiles) {
            for (const category in customPack.audioFiles) {
                const keys = category === 'Custom'
                    ? CUSTOM_KEYS
                    : Object.keys(customPack.audioFiles[category] || {})
                for (const key of keys) {
                    const value = customPack.audioFiles[category]?.[key]
                    if (!value) continue
                    const hasFiles = Array.isArray(value) ? value.length > 0 : !!value
                    if (!hasFiles) continue
                    const optionValue = `${category}.${key}`
                    if (!options.find(opt => opt.value === optionValue)) {
                        const label = category === 'Custom'
                            ? (customPack.customNames?.['Custom.' + key] || `Custom.${key}`)
                            : `${category}.${key} (custom)`
                        options.push({
                            value: optionValue,
                            label,
                            category: category
                        })
                    }
                }
            }
        }

        // Sort by category, then by key
        options.sort((a, b) => {
            if (a.category !== b.category) {
                return a.category.localeCompare(b.category)
            }
            return a.label.localeCompare(b.label)
        })

        setAudioOptions(options)
    }, [allowedOptions, audioPackId])

    const handlePreview = async () => {
        if (value) {
            const audioUrl = await audioManager.getAudioFileForPack(value, audioPackId)
            if (audioUrl) {
                const audio = new Audio(audioUrl)
                audio.play().catch(err => console.error('Error playing preview:', err))
            }
        }
    }

    const summaryGridTemplate = summaryExtra
        ? '5rem minmax(30rem, 40rem) 6rem minmax(30rem, 1fr)'
        : '5rem minmax(30rem, 40rem) minmax(30rem, 1fr)'

    const rootStyle = summaryStyle
        ? {
            display: 'grid',
            gridTemplateColumns: summaryGridTemplate,
            columnGap: '8px',
            alignItems: 'center',
            width: '100%',
            maxWidth: summaryExtra ? 'min(100%, 58rem)' : 'min(100%, 44rem)',
        }
        : { display: 'flex', gap: '8px', alignItems: 'center' }

    const labelStyle = summaryStyle
        ? { textAlign: 'right', marginLeft: 0 }
        : { marginLeft: '2rem' }

    const selectStyle = summaryStyle
        ? { width: '100%', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }
        : undefined

    return (
        <div style={rootStyle}>
            <div style={labelStyle}>{label}:</div>
            <select
                style={selectStyle}
                value={value || ''}
                onChange={(e) => onChange(e.target.value || null)}
            >
                <option value="">None</option>
                {audioOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            <div style={summaryStyle ? { justifySelf: 'start' } : undefined}>
                {summaryStyle ? (
                    value ? (
                        <button
                            type="button"
                            onClick={handlePreview}
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
                            ▶ Preview
                        </button>
                    ) : null
                ) : (
                    value && (
                        <button
                            type="button"
                            onClick={handlePreview}
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
                            ▶ Preview
                        </button>
                    )
                )}
            </div>
            {summaryStyle && summaryExtra != null && (
                <div style={{ justifySelf: 'start', alignSelf: 'center' }}>{summaryExtra}</div>
            )}
        </div>
    )
}

export default AudioSelector

