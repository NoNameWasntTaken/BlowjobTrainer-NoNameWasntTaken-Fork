/** Theme ids stored under `trainer.theme`. Custom colors overlay the default theme. */
export const THEME_IDS = ['default', 'modern-red', 'dark', 'classic', 'custom']

export const THEME_STORAGE_KEY = 'trainer.theme'
export const THEME_CUSTOM_STORAGE_KEY = 'trainer.theme.custom'
export const THEME_SAVED_STORAGE_KEY = 'trainer.theme.saved'
export const THEME_PRESET_IDS = ['default', 'modern-red', 'dark', 'classic']

/**
 * Default custom set matches :root in themes.css (accent, page, ink, danger).
 * An empty or partial custom theme falls back to these.
 */
export const DEFAULT_CUSTOM_COLORS = {
    accent: '#2563eb',
    page: '#f8fafc',
    ink: '#0f172a',
    danger: '#dc2626',
}

export const THEME_PRESETS = [
    { id: 'default', label: 'Modern Blue' },
    { id: 'modern-red', label: 'Modern Red' },
    { id: 'dark', label: 'Dark' },
    { id: 'classic', label: 'Classic' },
]

/** Accent, page, ink, and danger for each built-in palette. Matches themes.css. */
export const PRESET_THEME_COLORS = {
    default: DEFAULT_CUSTOM_COLORS,
    'modern-red': {
        accent: '#b83e59',
        page: '#fffafb',
        ink: '#352329',
        danger: '#d92d4b',
    },
    dark: {
        accent: '#dc2626',
        page: '#0a0a0a',
        ink: '#f5f5f5',
        danger: '#ef4444',
    },
    classic: {
        accent: '#33c3f0',
        page: '#ffffff',
        ink: '#222222',
        danger: '#ff4d4d',
    },
}

/** Inline properties written for the custom theme. `--accent-rgb` feeds the page gradient. */
export const CUSTOM_INLINE_VARS = [
    '--accent',
    '--accent-rgb',
    '--accent-light',
    '--accent-border',
    '--accent-dark',
    '--accent-soft',
    '--page',
    '--ink',
    '--muted',
    '--text-secondary',
    '--line',
    '--surface-soft',
    '--danger',
    '--shadow-sm',
    '--shadow-lg',
]

export function isPresetThemeId(value) {
    return THEME_PRESET_IDS.includes(value)
}

export function normalizeThemeId(value) {
    return THEME_IDS.includes(value) ? value : 'default'
}

export function createThemeId() {
    const stamp = Date.now().toString(36)
    const rand = Math.random().toString(36).slice(2, 8)
    return `theme_${stamp}_${rand}`
}

function hasControlChar(value) {
    for (let i = 0; i < value.length; i++) {
        if (value.charCodeAt(i) < 32) return true
    }
    return false
}

function isThemeIdString(value) {
    return typeof value === 'string'
        && value.length > 0
        && value.length <= 80
        && !hasControlChar(value)
}

export function normalizeHex(value, fallback) {
    if (typeof value !== 'string') return fallback
    const match = /^#([0-9a-f]{6})$/i.exec(value.trim())
    if (!match) return fallback
    return `#${match[1].toLowerCase()}`
}

export function hexToRgbChannels(hex) {
    const match = /^#([0-9a-f]{6})$/i.exec(hex || '')
    if (!match) return '37, 99, 235'
    const n = parseInt(match[1], 16)
    return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}

function hexToChannels(hex) {
    const n = parseInt(hex.slice(1), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function channelsToHex(channels) {
    return `#${channels.map((channel) => (
        Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0')
    )).join('')}`
}

/** Mix `amount` of `target` into `base` (0 keeps base, 1 becomes target). */
function mixHex(base, target, amount) {
    const from = hexToChannels(base)
    const to = hexToChannels(target)
    return channelsToHex(from.map((channel, index) => channel + (to[index] - channel) * amount))
}

function relativeLuminance(hex) {
    const [r, g, b] = hexToChannels(hex).map((channel) => channel / 255)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Accent and ink-tinted chrome for a custom theme.
 * Built-in presets ship these in CSS; a custom accent otherwise leaves them on Blue.
 */
export function derivedThemeColors(colors) {
    const { accent, ink, page } = colors
    const shadow = relativeLuminance(ink) > 0.6 ? [0, 0, 0] : hexToChannels(ink)
    const [r, g, b] = shadow
    return {
        accentLight: mixHex(accent, '#ffffff', 0.22),
        accentBorder: mixHex(accent, '#ffffff', 0.72),
        accentDark: mixHex(accent, '#000000', 0.18),
        accentSoft: mixHex(accent, '#ffffff', 0.88),
        muted: mixHex(ink, page, 0.45),
        textSecondary: mixHex(ink, page, 0.28),
        line: mixHex(ink, page, 0.82),
        surfaceSoft: mixHex('#ffffff', ink, 0.06),
        shadowSm: `0 1px 2px rgba(${r}, ${g}, ${b}, 0.04), 0 8px 24px rgba(${r}, ${g}, ${b}, 0.06)`,
        shadowLg: `0 18px 50px rgba(${r}, ${g}, ${b}, 0.1)`,
    }
}

export function normalizeCustomColors(value) {
    const source = value && typeof value === 'object' ? value : {}
    return {
        accent: normalizeHex(source.accent, DEFAULT_CUSTOM_COLORS.accent),
        page: normalizeHex(source.page, DEFAULT_CUSTOM_COLORS.page),
        ink: normalizeHex(source.ink, DEFAULT_CUSTOM_COLORS.ink),
        danger: normalizeHex(source.danger, DEFAULT_CUSTOM_COLORS.danger),
    }
}

function readJson(key) {
    try {
        const raw = localStorage.getItem(key)
        if (raw === null) return undefined
        return JSON.parse(raw)
    } catch {
        return undefined
    }
}

function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value))
}

function subscribeStorage(key, callback, initialValue, normalize) {
    if (typeof window === 'undefined') return () => {}
    const onStorage = (event) => {
        if (event.storageArea !== localStorage || event.key !== key) return
        if (event.newValue === null) {
            callback(initialValue)
            return
        }
        try {
            callback(normalize(JSON.parse(event.newValue)))
        } catch {
            callback(initialValue)
        }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
}

export function normalizeSavedTheme(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    if (!isThemeIdString(value.id) || isPresetThemeId(value.id) || value.id === 'custom') return null
    const name = typeof value.name === 'string' ? value.name.trim() : ''
    if (!name || name.length > 80) return null
    return {
        id: value.id,
        name,
        colors: normalizeCustomColors(value.colors),
    }
}

export function normalizeSavedThemes(value) {
    if (!Array.isArray(value)) return []
    const seen = new Set()
    const themes = []
    value.forEach((item) => {
        const theme = normalizeSavedTheme(item)
        if (!theme || seen.has(theme.id)) return
        seen.add(theme.id)
        themes.push(theme)
    })
    return themes
}

function migrateLegacyCustomTheme() {
    const legacy = readJson(THEME_CUSTOM_STORAGE_KEY)
    if (legacy === undefined) return []
    const theme = {
        id: createThemeId(),
        name: 'Custom',
        colors: normalizeCustomColors(legacy),
    }
    writeJson(THEME_SAVED_STORAGE_KEY, [theme])
    if (readJson(THEME_STORAGE_KEY) === 'custom') {
        writeJson(THEME_STORAGE_KEY, theme.id)
    }
    return [theme]
}

export function readSavedThemes() {
    const parsed = readJson(THEME_SAVED_STORAGE_KEY)
    if (parsed !== undefined) return normalizeSavedThemes(parsed)
    return migrateLegacyCustomTheme()
}

export function resolveStoredThemeId(value, savedThemes = readSavedThemes()) {
    if (isPresetThemeId(value)) return value
    if (typeof value === 'string' && savedThemes.some((theme) => theme.id === value)) return value
    return 'default'
}

export const themeIdStorage = {
    getItem(key, initialValue) {
        const parsed = readJson(key)
        if (parsed === undefined) return initialValue
        return resolveStoredThemeId(parsed)
    },
    setItem(key, value) {
        const stored = isPresetThemeId(value) || (typeof value === 'string' && isThemeIdString(value) && value !== 'custom')
            ? value
            : 'default'
        writeJson(key, stored)
    },
    removeItem(key) {
        localStorage.removeItem(key)
    },
    subscribe(key, callback, initialValue) {
        return subscribeStorage(key, callback, initialValue, (value) => resolveStoredThemeId(value))
    },
}

export const themeSavedStorage = {
    getItem(_key, _initialValue) {
        return readSavedThemes()
    },
    setItem(key, value) {
        writeJson(key, normalizeSavedThemes(value))
    },
    removeItem(key) {
        localStorage.removeItem(key)
    },
    subscribe(key, callback, initialValue) {
        return subscribeStorage(key, callback, initialValue, normalizeSavedThemes)
    },
}

export const themeCustomStorage = {
    getItem(key, initialValue) {
        const parsed = readJson(key)
        if (parsed === undefined) return normalizeCustomColors(initialValue)
        return normalizeCustomColors(parsed)
    },
    setItem(key, value) {
        writeJson(key, normalizeCustomColors(value))
    },
    removeItem(key) {
        localStorage.removeItem(key)
    },
    subscribe(key, callback, initialValue) {
        return subscribeStorage(key, callback, initialValue, (value) => normalizeCustomColors(value))
    },
}

export function readStoredTheme() {
    const saved = readSavedThemes()
    const themeId = themeIdStorage.getItem(THEME_STORAGE_KEY, 'default')
    const savedTheme = saved.find((theme) => theme.id === themeId)
    return {
        themeId,
        custom: savedTheme ? savedTheme.colors : DEFAULT_CUSTOM_COLORS,
        saved,
    }
}

/**
 * Sets `data-theme` on the document element.
 * Custom keeps the default theme tokens and overlays accent, page, ink, and danger,
 * plus the accent steps and ink-tinted chrome those four colors imply.
 */
export function applyTheme(themeId, customColors) {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const id = normalizeThemeId(themeId)
    root.dataset.theme = id
    CUSTOM_INLINE_VARS.forEach((name) => root.style.removeProperty(name))
    if (id !== 'custom') return
    const colors = normalizeCustomColors(customColors)
    const derived = derivedThemeColors(colors)
    root.style.setProperty('--accent', colors.accent)
    root.style.setProperty('--accent-rgb', hexToRgbChannels(colors.accent))
    root.style.setProperty('--accent-light', derived.accentLight)
    root.style.setProperty('--accent-border', derived.accentBorder)
    root.style.setProperty('--accent-dark', derived.accentDark)
    root.style.setProperty('--accent-soft', derived.accentSoft)
    root.style.setProperty('--page', colors.page)
    root.style.setProperty('--ink', colors.ink)
    root.style.setProperty('--muted', derived.muted)
    root.style.setProperty('--text-secondary', derived.textSecondary)
    root.style.setProperty('--line', derived.line)
    root.style.setProperty('--surface-soft', derived.surfaceSoft)
    root.style.setProperty('--danger', colors.danger)
    root.style.setProperty('--shadow-sm', derived.shadowSm)
    root.style.setProperty('--shadow-lg', derived.shadowLg)
}

export function applyStoredTheme() {
    const { themeId, custom, saved } = readStoredTheme()
    const savedTheme = saved.find((theme) => theme.id === themeId)
    if (savedTheme) applyTheme('custom', custom)
    else applyTheme(themeId)
}
