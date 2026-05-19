/**
 * Grid migration utilities
 * Handles migration from single-grid to multi-grid format
 */

import { store } from '../store'
import {
    gridsAtom,
    selectedGridIdAtom,
    gridMigrationDoneAtom,
    gridSquaresAtom,
    gridBaseColorAtom,
    gridSensitivityAtom
} from '../atoms/gridAtoms'
import { createDefaultGrid } from './gridUtils'

/**
 * Migrate legacy single-grid atoms to multi-grid format
 */
export function migrateLegacyGrids() {
    const legacySquares = store.get(gridSquaresAtom)
    const legacyBaseColor = store.get(gridBaseColorAtom)
    const legacySensitivity = store.get(gridSensitivityAtom)

    // Check if we have legacy data
    const hasLegacyData = legacySquares.length > 0 || 
                         legacyBaseColor.r !== 200 || 
                         legacyBaseColor.g !== 10 || 
                         legacyBaseColor.b !== 10 ||
                         legacySensitivity.r !== 30 ||
                         legacySensitivity.g !== 30 ||
                         legacySensitivity.b !== 30

    if (hasLegacyData) {
        // Create a grid from legacy data
        const migratedGrid = {
            id: `grid_migrated_${Date.now()}`,
            name: 'Grid 1',
            squares: legacySquares.map(sq => ({ x: sq.x, y: sq.y })),
            baseColor: { ...legacyBaseColor },
            sensitivity: { ...legacySensitivity },
            balls: false
        }
        
        store.set(gridsAtom, [migratedGrid])
        store.set(selectedGridIdAtom, migratedGrid.id)
        
        // Clear legacy atoms (optional, but helps avoid confusion)
        // We'll keep them for now in case there are other references
    } else {
        // No legacy data, ensure we have at least one default grid
        const grids = store.get(gridsAtom)
        // Ensure grids is always an array
        if (!Array.isArray(grids) || grids.length === 0) {
            const defaultGrid = createDefaultGrid('Grid 1')
            store.set(gridsAtom, [defaultGrid])
            store.set(selectedGridIdAtom, defaultGrid.id)
        } else {
            // Normalize existing grids: ensure any grid missing balls gets balls: false
            const normalizedGrids = grids.map(g => ({ ...g, balls: g.balls ?? false }))
            store.set(gridsAtom, normalizedGrids)
            // Ensure selection is set
            const currentSelection = store.get(selectedGridIdAtom)
            if (currentSelection === null || !normalizedGrids.find(g => g.id === currentSelection)) {
                store.set(selectedGridIdAtom, normalizedGrids[0].id)
            }
        }
    }
}

/**
 * Initialize grid system (run on app startup)
 */
export function initializeGrids() {
    // Set migration flag to false
    store.set(gridMigrationDoneAtom, false)
    
    // Perform migration
    migrateLegacyGrids()
    
    // Set migration flag to true
    store.set(gridMigrationDoneAtom, true)
}
