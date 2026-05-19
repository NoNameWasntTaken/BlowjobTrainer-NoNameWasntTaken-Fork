import { atom } from 'jotai'
import { createDefaultGrid } from '../utils/gridUtils'

// Legacy atoms (kept for migration)
export const gridSquaresAtom = atom([])
export const gridBaseColorAtom = atom({ r: 200, g: 10, b: 10 });
export const gridSensitivityAtom = atom({ r: 30, g: 30, b: 30 });
export const gridAverageColorAtom = atom({ r: 0, g: 0, b: 0 })

// Multi-grid atoms
// Ensure gridsAtom is always an array, even if empty
const gridsAtomBase = atom([createDefaultGrid('Grid 1')])
export const gridsAtom = atom(
    (get) => {
        const grids = get(gridsAtomBase)
        // Ensure it's always an array
        return Array.isArray(grids) ? grids : []
    },
    (get, set, newGrids) => {
        // Handle function updaters (e.g., setGrids(prev => prev.map(...)))
        const currentGrids = get(gridsAtomBase)
        // Normalize currentGrids to always be an array before passing to function updater
        const normalizedCurrentGrids = Array.isArray(currentGrids) ? currentGrids : []
        
        const resolvedGrids = typeof newGrids === 'function' 
            ? newGrids(normalizedCurrentGrids) 
            : newGrids
        // Ensure we always set an array (allow empty arrays)
        const grids = Array.isArray(resolvedGrids) ? resolvedGrids : []
        set(gridsAtomBase, grids)
    }
)
export const selectedGridIdAtom = atom(null) // null means "All Grids" mode
export const gridMigrationDoneAtom = atom(false)

// Derived atoms
export const isAllGridsModeAtom = atom((get) => get(selectedGridIdAtom) === null)

export const selectedGridAtom = atom((get) => {
    const grids = get(gridsAtom)
    const selectedId = get(selectedGridIdAtom)
    if (selectedId === null) return null
    return grids.find(g => g.id === selectedId) || null
})

export const allGridSquaresAtom = atom((get) => {
    const grids = get(gridsAtom)
    return grids.flatMap(grid => grid.squares)
})

export const gridSquareOwnershipAtom = atom((get) => {
    const grids = get(gridsAtom)
    const ownership = new Map()
    grids.forEach(grid => {
        grid.squares.forEach(sq => {
            ownership.set(`${sq.x},${sq.y}`, grid.id)
        })
    })
    return ownership
})

// Per-frame computed atoms (fast-changing)
export const gridAverageColorsAtom = atom({}) // { [gridId]: {r, g, b} }
export const gridColorsAtom = atom({}) // { [key]: { gridId, color: [r,g,b], shaft: boolean } }

// Combined shaft percentage (derived)
export const combinedShaftPercentAtom = atom((get) => {
    const grids = get(gridsAtom)
    const ownership = get(gridSquareOwnershipAtom)
    const gridColors = get(gridColorsAtom)
    
    let totalSquares = 0
    let shaftSquares = 0
    
    grids.forEach(grid => {
        grid.squares.forEach(sq => {
            totalSquares++
            const key = `${sq.x},${sq.y}`
            const entry = gridColors[key]
            const gridId = ownership.get(key)
            if (entry && entry.gridId === gridId && entry.shaft) {
                shaftSquares++
            }
        })
    })
    
    return totalSquares > 0 ? Math.round((shaftSquares / totalSquares) * 100) : 0
})

// Atom to store the brush mode: true for add, false for delete
export const brushAddModeAtom = atom(true)

// -- percentages (global, shared across all grids) --
export const gridShaftPercentAtom = atom(0) // Legacy, kept for compatibility
export const gridDepthPercentAtom = atom({ 1: 50, 2: 40, 3: 30, 4: 20 })
export const percentHysterisisAtom = atom(5)
