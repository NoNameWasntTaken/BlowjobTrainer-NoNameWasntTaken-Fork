import { useAtomValue, useAtom } from 'jotai'
import { useEffect, useState } from 'react'
import { currentStateAtom } from '../atoms/markersAtoms'
import {
    gridColorsAtom,
    gridSquaresAtom,
    gridShaftPercentAtom,
    gridDepthPercentAtom,
    percentHysterisisAtom,
} from '../atoms/gridAtoms'

function useGridProcessor() {
    const gridColors = useAtomValue(gridColorsAtom)
    const gridSquares = useAtomValue(gridSquaresAtom)
    const [percentShaft, setPercentShaft] = useAtom(gridShaftPercentAtom)
    const depthPercents = useAtomValue(gridDepthPercentAtom)
    const hysteresis = useAtomValue(percentHysterisisAtom)
    // const [currentState, setCurrentState] = useAtom(currentStateAtom)
    const [currentState, setCurrentState] = useState(0)
    // const [desiredState, setDesiredState] = useState(0)

    // Calculate and set percentShaft when gridSquares or gridColors change
    useEffect(() => {
        const total = gridSquares.length
        let shaftCount = 0
        for (const { x, y } of gridSquares) {
            if (gridColors[`${x},${y}`]?.shaft) shaftCount++
        }
        const percent = total > 0 ? (shaftCount / total) * 100 : 0
        setPercentShaft(Math.round(percent))
    }, [gridSquares, gridColors, setPercentShaft])

    // 2. Determine the desired state (no hysteresis)
    function getDesiredState(percentShaft, depthPercents) {
        const keys = [1, 2, 3, 4]
        let desiredState = 0 // default to surface
        for (let i = 0; i < keys.length; i++) {
            if (percentShaft < depthPercents[keys[i]]) {
                desiredState = keys[i]
            }
        }
        return desiredState
    }

    // State logic using percentShaft atom value and thresholds
    useEffect(() => {
        const keys = [1, 2, 3, 4]
        // Check all keys exist
        if (!keys.every(k => typeof depthPercents[k] === 'number')) return
        // Check all values are strictly decreasing
        for (let i = 0; i < keys.length - 1; i++) {
            if (!(depthPercents[keys[i]] > depthPercents[keys[i + 1]])) {
                return
            }
        }

        const desiredState = getDesiredState(percentShaft, depthPercents)
        if (desiredState === currentState) return

        let currentThreshold = 100;
        if (desiredState > currentState) {
            if (currentState === 0) { currentThreshold = depthPercents[1] }
            else if (currentState === 1) { currentThreshold = depthPercents[2] }
            else if (currentState === 2) { currentThreshold = depthPercents[3] }
            else if (currentState === 3) { currentThreshold = depthPercents[4] }

            currentThreshold -= hysteresis
            if (percentShaft < currentThreshold) {
                setCurrentState(desiredState)
            }
        }
        else if (desiredState < currentState) {
            // going the other way we want to check against our current depth 
            if (currentState === 4) { currentThreshold = depthPercents[4] }
            else if (currentState === 3) { currentThreshold = depthPercents[3] }
            else if (currentState === 2) { currentThreshold = depthPercents[2] }
            else if (currentState === 1) { currentThreshold = depthPercents[1] }

            currentThreshold += hysteresis
            if (percentShaft > currentThreshold) {
                setCurrentState(desiredState)
            }
        }

    }, [percentShaft, depthPercents, currentState, setCurrentState, hysteresis])

    return currentState
}

export default useGridProcessor 