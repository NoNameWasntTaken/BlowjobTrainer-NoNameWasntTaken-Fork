import { useRef, useState, useCallback } from 'react'
import { VIDEO_WIDTH, VIDEO_HEIGHT } from '../constants/constants'

function useWebcam() {
    const webcamRef = useRef(null)
    const canvasRef = useRef(null)
    const [canvasDimensions, setCanvasDimensions] = useState({ width: VIDEO_WIDTH, height: VIDEO_HEIGHT })
    const [scaleFactor, setScaleFactor] = useState({ x: 1, y: 1 })

    const drawVideoFrame = useCallback(() => {
        const canvas = canvasRef.current
        const context = canvas?.getContext('2d', { willReadFrequently: true })
        const video = webcamRef.current?.video

        if (video && video.readyState === 4 && canvas && context) {
            // Update dimensions if needed
            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                canvas.width = video.videoWidth
                canvas.height = video.videoHeight
                setCanvasDimensions({ width: video.videoWidth, height: video.videoHeight })
            }

            // Calculate scale factor between displayed video and actual video
            const videoElement = webcamRef.current?.video
            if (videoElement) {
                const displayedWidth = videoElement.clientWidth
                const displayedHeight = videoElement.clientHeight
                const actualWidth = video.videoWidth
                const actualHeight = video.videoHeight

                setScaleFactor({
                    x: actualWidth / displayedWidth,
                    y: actualHeight / displayedHeight
                })
            }

            // Draw the frame
            context.drawImage(video, 0, 0, canvas.width, canvas.height)
            return true
        }
        return false
    }, [])

    return {
        webcamRef,
        canvasRef,
        canvasDimensions,
        scaleFactor,
        drawVideoFrame
    }
}

export default useWebcam 