import { useEffect } from 'react'
import { useAtomValue } from 'jotai'
import {
    savedThemesAtom,
    themeDraftActiveAtom,
    themeDraftAtom,
    themeIdAtom,
} from '../atoms/themeAtom'
import { applyTheme, isPresetThemeId } from './theme'

/** Keeps `data-theme` and custom inline variables in sync with the stored atoms. */
export function useApplyTheme() {
    const themeId = useAtomValue(themeIdAtom)
    const savedThemes = useAtomValue(savedThemesAtom)
    const draft = useAtomValue(themeDraftAtom)
    const draftActive = useAtomValue(themeDraftActiveAtom)

    useEffect(() => {
        const savedTheme = savedThemes.find((theme) => theme.id === themeId)
        if (savedTheme) {
            applyTheme('custom', savedTheme.colors)
            return
        }
        if (draftActive && isPresetThemeId(themeId)) {
            applyTheme('custom', draft)
            return
        }
        applyTheme(isPresetThemeId(themeId) ? themeId : 'default')
    }, [themeId, savedThemes, draft, draftActive])
}
