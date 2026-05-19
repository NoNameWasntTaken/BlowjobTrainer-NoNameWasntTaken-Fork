import { atomWithStorage } from 'jotai/utils'
import { storageService } from '../services/storageService'
import {
    createDefaultCustomLevelFolderNameSets,
    normalizeCustomLevelFolderNameSets,
} from '../constants/customLevelFolders'

const folderNamesStorage = {
    getItem(_key, initialValue) {
        try {
            return normalizeCustomLevelFolderNameSets(
                storageService.getCustomLevelFolderNameSets()
            )
        } catch {
            return initialValue
        }
    },
    setItem(_key, value) {
        storageService.saveCustomLevelFolderNameSets(value)
    },
    removeItem() {
        try {
            localStorage.removeItem('custom_level_folder_names')
        } catch {
            /* ignore */
        }
    },
}

/** Global Training / Level Editor subfolder labels: concealed vs revealed hidden-content modes */
export const customLevelFolderNamesAtom = atomWithStorage(
    'customLevelFolderNames',
    createDefaultCustomLevelFolderNameSets(),
    folderNamesStorage,
    { getOnInit: true }
)
