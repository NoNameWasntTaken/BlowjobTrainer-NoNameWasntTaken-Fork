import { useState, useEffect } from 'react'
import { useAtomValue } from 'jotai'
import { navAtom } from '../atoms/navAtom'
import * as NAV from '../atoms/navAtom'
import useMarkerDetection from './useMarkerDetection'

// Custom hook to manage marker state
function useMarkersState() {
    const [currentState, setCurrentState] = useState(0)
    const nav = useAtomValue(navAtom)

    // Use the marker detection hook to get marker states
    const markersCovered = useMarkerDetection()

    useEffect(() => {
        function checkMarkers() {
            const marker1 = markersCovered[0]
            const marker2 = markersCovered[1]
            const marker3 = markersCovered[2]
            const marker4 = markersCovered[3]

            let nextState = -999

            if (marker1 && marker2 && marker3 && marker4) {
                nextState = 4
            } else if (marker1 && marker2 && marker3 && !marker4) {
                nextState = 3
            } else if (marker1 && marker2 && !marker3 && !marker4) {
                nextState = 2
            } else if (marker1 && !marker2 && !marker3 && !marker4) {
                nextState = 1
            } else if (!marker1 && !marker2 && !marker3 && !marker4) {
                nextState = 0
            } else if (!marker1 && marker2 && marker3 && marker4) {
                nextState = 4
            } else if (!marker1 && !marker2 && !marker3 && marker4) {
                nextState = -1
            } else if (!marker1 && marker2 && marker3 && !marker4) {
                nextState = 3
            }

            return nextState
        }

        // main function call here
        if (nav >= NAV.CALIBRATE) {
            const nextState = checkMarkers()
            if (currentState !== nextState && nextState !== -999) {
                setCurrentState(nextState)
            }
        }

    }, [markersCovered, nav, currentState])

    // Return both the current state and the function to update it
    return currentState
}

export default useMarkersState