import { useEffect, useRef } from 'react'
import useFpsCounter from '../../hooks/useFpsCounter'

function FrameProcessor({ canvasRef, drawVideoFrame, onFpsChange }) {
    const { fps, updateFps } = useFpsCounter()
    const animationFrameRef = useRef()

    // Update parent component with current FPS
    useEffect(() => {
        onFpsChange(fps)
    }, [fps, onFpsChange])

    useEffect(() => {
        const canvas = canvasRef.current
        canvas?.getContext('2d', { willReadFrequently: true })

        const captureFrame = (timestamp) => {
            // Update FPS and check if we should process this frame
            const shouldProcessFrame = updateFps(timestamp)
            if (!shouldProcessFrame) {
                animationFrameRef.current = requestAnimationFrame(captureFrame)
                return
            }

            try {
                // Draw the frame using the provided function
                drawVideoFrame()
            } catch (error) {
                console.error('Error capturing frame:', error)
            }

            // Request next frame
            animationFrameRef.current = requestAnimationFrame(captureFrame)
        }

        // Start the animation loop
        animationFrameRef.current = requestAnimationFrame(captureFrame)

        // Cleanup function
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
        }
    }, [updateFps, drawVideoFrame, canvasRef])

    return null
}

export default FrameProcessor 