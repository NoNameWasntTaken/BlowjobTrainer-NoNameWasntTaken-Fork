/**
 * Grid management utilities
 */

/**
 * Generate a unique grid ID
 */
export function generateGridId() {
    return `grid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Create a default grid with the given name
 */
export function createDefaultGrid(name) {
    return {
        id: generateGridId(),
        name: name || 'Grid 1',
        squares: [],
        baseColor: { r: 200, g: 10, b: 10 },
        sensitivity: { r: 30, g: 30, b: 30 },
        balls: false
    }
}

/**
 * Validate that new squares don't overlap with existing grids
 */
export function validateNoOverlaps(grids, newSquares) {
    const existingSquares = new Set()
    grids.forEach(grid => {
        grid.squares.forEach(sq => {
            existingSquares.add(`${sq.x},${sq.y}`)
        })
    })

    for (const sq of newSquares) {
        const key = `${sq.x},${sq.y}`
        if (existingSquares.has(key)) {
            return false
        }
    }
    return true
}

/**
 * Generate a unique grid name based on existing grid names
 */
export function generateUniqueGridName(grids) {
    let counter = 1
    let name = `Grid ${counter}`
    const existingNames = new Set(grids.map(g => g.name))
    
    while (existingNames.has(name)) {
        counter++
        name = `Grid ${counter}`
    }
    
    return name
}
