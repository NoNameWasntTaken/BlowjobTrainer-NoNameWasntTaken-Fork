import React from 'react'
import { useAtom } from 'jotai'
import { currentStateAtom } from '../../atoms/markersAtoms'

function DebugStateSlider() {

    const [currentState, setCurrentState] = useAtom(currentStateAtom)

    const styles = {
        slideContainer: {
            margin: '10px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
        },
        debugLabel: {
            fontSize: '14px',
            color: '#666'
        }
    }

    return (
        <div style={styles.slideContainer}>
            <input
                type="range"
                min="0"
                max="4"
                value={currentState}
                onChange={(e) => {
                    const newValue = Number(e.target.value)
                    if (currentState !== newValue) {
                        setCurrentState(newValue)
                    }
                }}
            />
            <span style={styles.debugLabel}>Current State: {currentState}</span>
        </div>
    )
}

export default DebugStateSlider 