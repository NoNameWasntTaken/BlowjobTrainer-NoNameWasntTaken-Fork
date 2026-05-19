import { useAtomValue, useAtom } from 'jotai'
import { useEffect } from 'react'
import { currentStateAtom } from '../atoms/markersAtoms'
import {
    combinedShaftPercentAtom,
    gridDepthPercentAtom,
    percentHysterisisAtom,
    gridMigrationDoneAtom,
} from '../atoms/gridAtoms'

function useGridProcessor() {
    const migrationDone = useAtomValue(gridMigrationDoneAtom)
    const percentShaft = useAtomValue(combinedShaftPercentAtom)
    const depthPercents = useAtomValue(gridDepthPercentAtom)
    const hysteresis = useAtomValue(percentHysterisisAtom)
    const [currentState, setCurrentState] = useAtom(currentStateAtom)

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
        if (!migrationDone) return

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

        // Compute next state
        let nextState = currentState
        let currentThreshold = 100;
        
        if (desiredState > currentState) {
            if (currentState === 0) { currentThreshold = depthPercents[1] }
            else if (currentState === 1) { currentThreshold = depthPercents[2] }
            else if (currentState === 2) { currentThreshold = depthPercents[3] }
            else if (currentState === 3) { currentThreshold = depthPercents[4] }

            currentThreshold -= hysteresis
            if (percentShaft < currentThreshold) {
                nextState = desiredState
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
                nextState = desiredState
            }
        }

        // Only update if state changed
        if (nextState !== currentState) {
            setCurrentState(nextState)
        }

    }, [migrationDone, percentShaft, depthPercents, currentState, hysteresis, setCurrentState])
}

// Note: This hook no longer returns a value - it writes directly to currentStateAtom
export default useGridProcessor 