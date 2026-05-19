import { useRef, useState, useCallback } from 'react'

function useFpsCounter(targetSampleFps = 60) {
    const [fps, setFps] = useState(0)
    const frameCountRef = useRef(0)
    const lastFpsUpdateTimeRef = useRef(0)
    const lastFrameTimeRef = useRef(0)
    const frameInterval = 1000 / targetSampleFps

    const updateFps = useCallback((timestamp) => {
        // Count this frame
        frameCountRef.current++

        // Update FPS counter every second
        if (timestamp - lastFpsUpdateTimeRef.current >= 1000) {
            const elapsedSecs = (timestamp - lastFpsUpdateTimeRef.current) / 1000
            const currentFps = Math.round(frameCountRef.current / elapsedSecs)
            setFps(currentFps)

            // Reset counters
            frameCountRef.current = 0
            lastFpsUpdateTimeRef.current = timestamp
        }

        // Check if we should process this frame based on target FPS
        const shouldProcessFrame = timestamp - lastFrameTimeRef.current >= frameInterval
        if (shouldProcessFrame) {
            lastFrameTimeRef.current = timestamp
        }

        return shouldProcessFrame
    }, [frameInterval])

    return {
        fps,
        updateFps
    }
}

export default useFpsCounter 