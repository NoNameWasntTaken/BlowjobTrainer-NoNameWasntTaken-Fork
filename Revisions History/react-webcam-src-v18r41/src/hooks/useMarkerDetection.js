import { useAtomValue } from 'jotai'
import { useMemo, useRef, useEffect } from 'react'
import {
    baseColorsAtom,
    currentColorsAtom,
    sensitivityAtom,
    HYSTERESIS
} from '../atoms/markersAtoms'

/**
 * Local implementation of color difference detection with sensitivity threshold and hysteresis
 */
function isDifferenceGreaterThanSensitivity(baseColor, currentColor, sensitivity, previousState, hysteresis) {
    if (baseColor === null || currentColor === null) {
        return false
    }

    const deltaR = Math.abs(baseColor.r - currentColor.r)
    const deltaG = Math.abs(baseColor.g - currentColor.g)
    const deltaB = Math.abs(baseColor.b - currentColor.b)

    // Apply hysteresis based on previous state
    // If previously active, use a lower threshold to maintain state
    // If previously inactive, use a higher threshold to change state
    if (previousState) {
        // Previously active - use lower threshold to maintain state
        return deltaR > (sensitivity.r - hysteresis) ||
            deltaG > (sensitivity.g - hysteresis) ||
            deltaB > (sensitivity.b - hysteresis)
    } else {
        // Previously inactive - use higher threshold to change state
        return deltaR > (sensitivity.r + hysteresis) ||
            deltaG > (sensitivity.g + hysteresis) ||
            deltaB > (sensitivity.b + hysteresis)
    }
}

/**
 * Hook that detects which markers are covered with hysteresis
 * @returns {Array<boolean>} Array of booleans indicating which markers (1-4) are covered
 */
function useMarkerDetection() {
    // Get atoms
    const baseColors = useAtomValue(baseColorsAtom)
    const currentColors = useAtomValue(currentColorsAtom)
    const sensitivity = useAtomValue(sensitivityAtom)

    // Use ref to track previous marker states without triggering re-renders
    const prevMarkerStatesRef = useRef([false, false, false, false])

    // Memoize the marker detection to prevent unnecessary recalculations
    const markersCovered = useMemo(() => {
        const newMarkerStates = [0, 1, 2, 3].map(index =>
            isDifferenceGreaterThanSensitivity(
                baseColors[index] ?? { r: 0, g: 0, b: 0 },
                currentColors[index] ?? { r: 0, g: 0, b: 0 },
                sensitivity,
                prevMarkerStatesRef.current[index],
                HYSTERESIS
            )
        )

        return newMarkerStates
    }, [baseColors, currentColors, sensitivity])

    // Update the ref after render with the new states
    useEffect(() => {
        prevMarkerStatesRef.current = markersCovered
    }, [markersCovered])

    return markersCovered
}

export default useMarkerDetection 