import { atom } from 'jotai'

/**
 * Synchronous read for initial atom value (main thread, before first React paint).
 * Electron: preload exposes getShowHiddenSync. Web dev: ?showHidden=1 or ?showHidden=true
 */
export function readShowHiddenSyncOnce() {
    if (typeof window === 'undefined') return false
    try {
        const sp = new URLSearchParams(window.location.search)
        const v = sp.get('showHidden')
        if (v === '1' || v === 'true') return true
    } catch {
        /* ignore */
    }
    if (typeof window.electronAPI?.getShowHiddenSync === 'function') {
        try {
            return !!window.electronAPI.getShowHiddenSync()
        } catch {
            return false
        }
    }
    return false
}

/** Session-only: not persisted. Initial value from sync IPC / URL. */
export const showHiddenContentAtom = atom(readShowHiddenSyncOnce())
