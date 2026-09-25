/**
 * Hidden custom content: UI visibility and active-selection revert helpers.
 */

import { storageService } from '../services/storageService'
import { audioManager } from '../services/audioManager'
import { musicTrackManager } from '../services/musicTrackManager'
import {
    DEFAULT_PROFILE_ID,
    normalizePlayerProfilesState,
} from '../atoms/playerProfilesModel'
import { activePackIdAtom } from '../atoms/audioAtom'
import { playerProfilesAtom } from '../atoms/playerAtom'

export function isHiddenRecord(x) {
    return x?.hidden === true
}

export function isVisibleInUi(x, showHidden) {
    return showHidden || !isHiddenRecord(x)
}

export function filterByVisibility(items, showHidden) {
    return items.filter((x) => isVisibleInUi(x, showHidden))
}

/**
 * For editor <select>: when show-hidden is off, filtered list plus selected id if hidden and not in list.
 * When there is no concrete selectedId, still returns the filtered list (not the full items array).
 */
export function withEditorSelectInjection(items, selectedId, getId, showHidden) {
    if (showHidden) return items
    const list = filterByVisibility(items, showHidden)
    if (
        selectedId &&
        items.some((x) => getId(x) === selectedId && isHiddenRecord(x))
    ) {
        const sel = items.find((x) => getId(x) === selectedId)
        if (sel && !list.some((x) => getId(x) === selectedId)) {
            return [...list, sel]
        }
    }
    return list
}

/**
 * Revert library active pack / active BGM / active profile when they reference hidden content.
 * Does not clear audioManager fallbackPack.
 * @param {{ get: Function, set: Function }} store - Jotai store
 * @param {boolean} showHidden - when true, no-op
 */
export function revertHiddenActiveSelections(store, showHidden) {
    if (showHidden) return

    const activePackId =
        store.get(activePackIdAtom) ?? storageService.getActiveAudioPack()
    if (activePackId) {
        const pack = storageService.loadAudioPack(activePackId)
        if (pack && isHiddenRecord(pack)) {
            void audioManager.setActiveCustomPack(null)
        }
    }

    const trackId = musicTrackManager.getActiveTrackId()
    if (trackId) {
        const tr = musicTrackManager.getTrack(trackId)
        if (tr && isHiddenRecord(tr)) {
            musicTrackManager.setActiveTrack(null)
        }
    }

    let pp = normalizePlayerProfilesState(store.get(playerProfilesAtom))
    const aid = pp.activeProfileId
    if (aid && aid !== DEFAULT_PROFILE_ID) {
        const prof = pp.profiles[aid]
        if (prof && isHiddenRecord(prof)) {
            store.set(playerProfilesAtom, {
                ...pp,
                activeProfileId: DEFAULT_PROFILE_ID,
            })
            pp = normalizePlayerProfilesState(store.get(playerProfilesAtom))
        }
    }

    reconcileDefaultProfileBypassWhenConcealed(store, pp)
}

/**
 * Default profile: bypass and stat tracking cannot both stay on while hidden content is concealed.
 * Clears bypass if both are enabled (e.g. after turning hidden content off).
 * @param {{ get: Function, set: Function }} store
 * @param {object} [normalizedState] - optional result of normalizePlayerProfilesState to avoid an extra read
 */
export function reconcileDefaultProfileBypassWhenConcealed(store, normalizedState) {
    const pp = normalizedState ?? normalizePlayerProfilesState(store.get(playerProfilesAtom))
    const def = pp.profiles[DEFAULT_PROFILE_ID]
    if (
        !def ||
        def.bypassLevelRequirements !== true ||
        def.statTrackingEnabled !== true
    ) {
        return
    }
    store.set(playerProfilesAtom, {
        ...pp,
        profiles: {
            ...pp.profiles,
            [DEFAULT_PROFILE_ID]: {
                ...def,
                bypassLevelRequirements: false,
            },
        },
    })
}
