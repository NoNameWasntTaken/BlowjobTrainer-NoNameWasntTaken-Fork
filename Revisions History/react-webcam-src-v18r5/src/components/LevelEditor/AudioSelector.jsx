import React from 'react'
import { audioManager } from '../../services/audioManager'
import { getAudioFile } from '../../services/audioResolver'

/**
 * AudioSelector - Dropdown for selecting audio from available packs
 * @param {string} value - Current selected audio value (e.g., "Hold.ONE")
 * @param {function} onChange - Callback when audio selection changes
 * @param {string} label - Label for the selector
 * @param {Array} allowedOptions - Optional array of allowed audio options. If provided, only these options will be shown.
 *                                 Format: [{ value: "Hold.ONE", label: "Hold.ONE" }, ...]
 * @param {string} audioPackId - Optional audio pack ID to use for this level (overrides active pack)
 */
const AudioSelector = ({ value, onChange, label = "Audio", allowedOptions = null, audioPackId = null }) => {
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
                for (const key in customPack.audioFiles[category]) {
                    const optionValue = `${category}.${key}`
                    // Only add if not already in options (custom takes precedence)
                    if (!options.find(opt => opt.value === optionValue)) {
                        options.push({
                            value: optionValue,
                            label: `${category}.${key} (custom)`,
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
            // Load the specified pack if provided, otherwise use null (will use active pack via getAudioFileSync)
            const packToUse = audioPackId 
                ? audioManager.loadPack(audioPackId)
                : null
            
            // Use getAudioFile from audioResolver directly with the specified pack
            const audioPath = getAudioFile(value, packToUse)
            
            if (audioPath) {
                // Handle custom content URLs
                let audioUrl = audioPath
                if (audioPath && audioPath.startsWith('custom-content://')) {
                    const { audioFileService } = await import('../../services/storageService')
                    const resolvedUrl = await audioFileService.getAudioFile(audioPath)
                    if (resolvedUrl) {
                        audioUrl = resolvedUrl
                    }
                }

                const audio = new Audio(audioUrl)
                audio.play().catch(err => console.error('Error playing preview:', err))
            }
        }
    }

    return (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ marginLeft: '2rem' }}>{label}:</div>
            <select
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
            {value && (
                <button
                    type="button"
                    onClick={handlePreview}
                    style={{ padding: '4px 8px', fontSize: '12px' }}
                >
                    ▶ Preview
                </button>
            )}
        </div>
    )
}

export default AudioSelector

