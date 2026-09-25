import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import {
    DEFAULT_CUSTOM_COLORS,
    THEME_SAVED_STORAGE_KEY,
    THEME_STORAGE_KEY,
    themeIdStorage,
    themeSavedStorage,
} from '../theme/theme'

export const themeIdAtom = atomWithStorage(
    THEME_STORAGE_KEY,
    'default',
    themeIdStorage,
    { getOnInit: true },
)

export const savedThemesAtom = atomWithStorage(
    THEME_SAVED_STORAGE_KEY,
    [],
    themeSavedStorage,
    { getOnInit: true },
)

/** Unsaved color edits while a built-in preset is selected. */
export const themeDraftAtom = atom(DEFAULT_CUSTOM_COLORS)

export const themeDraftActiveAtom = atom(false)
