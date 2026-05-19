import { atom } from 'jotai'

// Atom to store the array of selected grid squares
export const gridSquaresAtom = atom([])
// Atom to store the grid colors: { 'x,y': [r,g,b] }
export const gridColorsAtom = atom({})

// Atom to store the brush mode: true for add, false for delete
export const brushAddModeAtom = atom(true)

// -- colors --
// current average color across grid
export const gridAverageColorAtom = atom({ r: 0, g: 0, b: 0 })
// base color to compare to
export const gridBaseColorAtom = atom({ r: 200, g: 10, b: 10 });
// Default sensitivity values
export const gridSensitivityAtom = atom({ r: 30, g: 30, b: 30 });

// -- percentages --
export const gridShaftPercentAtom = atom(0)
export const gridDepthPercentAtom = atom({ 1: 50, 2: 40, 3: 30, 4: 20 })
export const percentHysterisisAtom = atom(5)