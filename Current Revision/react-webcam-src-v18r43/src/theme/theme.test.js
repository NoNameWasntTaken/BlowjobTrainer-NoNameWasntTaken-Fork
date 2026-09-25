import {
    CUSTOM_INLINE_VARS,
    DEFAULT_CUSTOM_COLORS,
    THEME_CUSTOM_STORAGE_KEY,
    THEME_SAVED_STORAGE_KEY,
    THEME_STORAGE_KEY,
    applyStoredTheme,
    applyTheme,
    hexToRgbChannels,
    normalizeCustomColors,
    normalizeThemeId,
    readSavedThemes,
    resolveStoredThemeId,
    themeCustomStorage,
} from './theme'

beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    CUSTOM_INLINE_VARS.forEach((name) => document.documentElement.style.removeProperty(name))
})

test('theme ids fall back to default', () => {
    expect(normalizeThemeId('modern-red')).toBe('modern-red')
    expect(normalizeThemeId('dark')).toBe('dark')
    expect(normalizeThemeId('classic')).toBe('classic')
    expect(normalizeThemeId('custom')).toBe('custom')
    expect(normalizeThemeId('rose')).toBe('default')
    expect(normalizeThemeId(null)).toBe('default')
})

test('custom colors keep only #rrggbb and fill the rest from the blue theme', () => {
    expect(normalizeCustomColors(null)).toEqual(DEFAULT_CUSTOM_COLORS)
    expect(normalizeCustomColors({})).toEqual(DEFAULT_CUSTOM_COLORS)
    expect(normalizeCustomColors({
        accent: '#ABCDEF',
        page: '#fff',
        ink: 'black',
        danger: '#ff00aa',
        extra: '#000000',
    })).toEqual({
        accent: '#abcdef',
        page: DEFAULT_CUSTOM_COLORS.page,
        ink: DEFAULT_CUSTOM_COLORS.ink,
        danger: '#ff00aa',
    })
})

test('hex channels match the stored accent', () => {
    expect(hexToRgbChannels('#2563eb')).toBe('37, 99, 235')
    expect(hexToRgbChannels('#112233')).toBe('17, 34, 51')
    expect(hexToRgbChannels('nope')).toBe('37, 99, 235')
})

test('custom theme writes inline variables over the default theme and presets clear them', () => {
    applyTheme('custom', {
        accent: '#112233',
        page: '#101010',
        ink: '#fafafa',
        danger: '#ff0000',
    })
    const root = document.documentElement
    expect(root.dataset.theme).toBe('custom')
    expect(root.style.getPropertyValue('--accent')).toBe('#112233')
    expect(root.style.getPropertyValue('--accent-rgb')).toBe('17, 34, 51')
    expect(root.style.getPropertyValue('--accent-light')).toBe('#455360')
    expect(root.style.getPropertyValue('--accent-border')).toBe('#bcc1c6')
    expect(root.style.getPropertyValue('--accent-dark')).toBe('#0e1c2a')
    expect(root.style.getPropertyValue('--accent-soft')).toBe('#e2e4e7')
    expect(root.style.getPropertyValue('--muted')).toBe('#919191')
    expect(root.style.getPropertyValue('--page')).toBe('#101010')
    expect(root.style.getPropertyValue('--ink')).toBe('#fafafa')
    expect(root.style.getPropertyValue('--danger')).toBe('#ff0000')

    applyTheme('dark')
    expect(root.dataset.theme).toBe('dark')
    CUSTOM_INLINE_VARS.forEach((name) => {
        expect(root.style.getPropertyValue(name)).toBe('')
    })
})

test('a legacy custom slot becomes one saved theme and stays active', () => {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify('custom'))
    themeCustomStorage.setItem(THEME_CUSTOM_STORAGE_KEY, {
        accent: '#445566',
        page: 'nope',
        ink: '#eeeeee',
        danger: '#cc0000',
    })

    const saved = readSavedThemes()
    expect(saved).toHaveLength(1)
    expect(saved[0].name).toBe('Custom')
    expect(saved[0].colors).toEqual({
        accent: '#445566',
        page: DEFAULT_CUSTOM_COLORS.page,
        ink: '#eeeeee',
        danger: '#cc0000',
    })
    expect(resolveStoredThemeId('custom', saved)).toBe('default')
    expect(JSON.parse(localStorage.getItem(THEME_STORAGE_KEY))).toBe(saved[0].id)
    expect(JSON.parse(localStorage.getItem(THEME_SAVED_STORAGE_KEY))).toEqual(saved)

    applyStoredTheme()
    expect(document.documentElement.dataset.theme).toBe('custom')
    expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#445566')
    expect(document.documentElement.style.getPropertyValue('--page')).toBe(DEFAULT_CUSTOM_COLORS.page)
})

test('an unknown stored theme id falls back to blue and a saved id is kept', () => {
    const saved = [{ id: 'theme_abc', name: 'Rose', colors: DEFAULT_CUSTOM_COLORS }]
    expect(resolveStoredThemeId('rose', saved)).toBe('default')
    expect(resolveStoredThemeId('theme_abc', saved)).toBe('theme_abc')
    expect(resolveStoredThemeId('modern-red', saved)).toBe('modern-red')
    expect(resolveStoredThemeId('dark', saved)).toBe('dark')
})

test('missing storage leaves the blue theme with no inline overrides', () => {
    applyStoredTheme()
    expect(document.documentElement.dataset.theme).toBe('default')
    CUSTOM_INLINE_VARS.forEach((name) => {
        expect(document.documentElement.style.getPropertyValue(name)).toBe('')
    })
})
