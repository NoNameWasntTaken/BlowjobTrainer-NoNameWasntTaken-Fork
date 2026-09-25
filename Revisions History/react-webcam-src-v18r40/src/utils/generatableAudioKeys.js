import { AUDIO } from '../components/Tasks/audio'
import { CUSTOM_VOICE_SLOT_KEYS } from '../constants/customVoiceCategories'

const EXCLUDED_CATEGORIES = new Set(['NONE', 'Sfx'])

export function getGeneratableCategories() {
    const fromAudio = Object.keys(AUDIO).filter(
        (cat) =>
            !EXCLUDED_CATEGORIES.has(cat) &&
            typeof AUDIO[cat] === 'object' &&
            AUDIO[cat] !== null
    )
    return [...fromAudio, 'Custom']
}

export function getGeneratableKeys(category) {
    if (category === 'Custom') return CUSTOM_VOICE_SLOT_KEYS
    return Object.keys(AUDIO[category] || {}).filter((key) => {
        if (key === 'desc') return false
        const val = AUDIO[category][key]
        // Empty string is a valid custom slot (e.g. Hit.ONE has no default audio path)
        return val !== null && val !== 'non'
    })
}

export function makeLineId(category, key) {
    return `${category}.${key}`
}
