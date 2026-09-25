// timingLogic.js

import { useEffect, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { navAtom } from '../atoms/navAtom';
import { currentStateAtom } from '../atoms/markersAtoms';
import * as NAV from '../atoms/navAtom';

// this logic should track and record the time within each of the dive states
// so that we can work out the tempo and held positions
function useTiming() {

    const currentState = useAtomValue(currentStateAtom)
    const nav = useAtomValue(navAtom);
    // combine dive state into single object
    const [diveState, setDiveState] = useState({
        current: 0,
        previous: 0,
        previousDurations: {}  // Initialize as empty object instead of null
    });
    const startTimeRef = useRef(null);

    useEffect(() => {
        // not past setup & calibration
        if (nav < NAV.TRAINING) { return; }
        if (currentState === null) { return; }

        // haven't started timer
        if (startTimeRef.current === null) {
            startTimeRef.current = Date.now();
        }

        // a change in the current state, record previous state and time
        setDiveState(prevState => {
            // Calculate the duration of the previous state more exactly
            const endTime = Date.now();
            const duration = endTime - startTimeRef.current;
            // console.log(`dur.${duration}`);

            // Prepare the new dive state object
            const newDiveState = {
                current: currentState,
                previous: prevState.current,
                previousDurations: {
                    ...(prevState.previousDurations || {}),  // Handle null case
                    [prevState.current]: duration
                }
            };

            // Reset the start time for the next state
            startTimeRef.current = Date.now();

            return newDiveState;
        });
    }, [currentState, nav]);

    return diveState;
}

export default useTiming
