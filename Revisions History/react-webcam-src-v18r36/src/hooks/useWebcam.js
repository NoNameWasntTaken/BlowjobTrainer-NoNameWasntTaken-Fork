import { useRef, useState, useCallback, useEffect } from 'react'
import { VIDEO_WIDTH, VIDEO_HEIGHT } from '../constants/constants'

function useWebcam() {
    const webcamRef = useRef(null)
    const canvasRef = useRef(null)
    const hiddenVideoRef = useRef(null)
    const [canvasDimensions, setCanvasDimensions] = useState({ width: VIDEO_WIDTH, height: VIDEO_HEIGHT })
    const [scaleFactor, setScaleFactor] = useState({ x: 1, y: 1 })

    // Hidden video element kept in viewport so depth processing continues when feed scrolls out of view
    useEffect(() => {
        const video = document.createElement('video')
        video.autoplay = true
        video.muted = true
        video.playsInline = true
        video.setAttribute('aria-hidden', 'true')
        video.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none'
        document.body.appendChild(video)
        hiddenVideoRef.current = video
        return () => {
            video.srcObject = null
            video.remove()
            hiddenVideoRef.current = null
        }
    }, [])

    const drawVideoFrame = useCallback(() => {
        const canvas = canvasRef.current
        const context = canvas?.getContext('2d', { willReadFrequently: true })
        const visibleVideo = webcamRef.current?.video
        const hiddenVideo = hiddenVideoRef.current

        if (!canvas || !context || !hiddenVideo) return false

        // Sync stream from visible to hidden video (handles initial load and device switch)
        if (visibleVideo?.srcObject && visibleVideo.srcObject !== hiddenVideo.srcObject) {
            hiddenVideo.srcObject = visibleVideo.srcObject
            hiddenVideo.play().catch(() => {})
        }

        if (hiddenVideo.readyState !== 4) return false

        // Update dimensions if needed (use hidden video for actual frame size)
        if (canvas.width !== hiddenVideo.videoWidth || canvas.height !== hiddenVideo.videoHeight) {
            canvas.width = hiddenVideo.videoWidth
            canvas.height = hiddenVideo.videoHeight
            setCanvasDimensions({ width: hiddenVideo.videoWidth, height: hiddenVideo.videoHeight })
        }

        // Scale factor uses visible video display size (for grid coordinate conversion)
        if (visibleVideo && visibleVideo.clientWidth > 0 && visibleVideo.clientHeight > 0) {
            setScaleFactor({
                x: hiddenVideo.videoWidth / visibleVideo.clientWidth,
                y: hiddenVideo.videoHeight / visibleVideo.clientHeight
            })
        }

        // Draw from hidden video (stays in viewport, avoids browser throttling when feed scrolls away)
        context.drawImage(hiddenVideo, 0, 0, canvas.width, canvas.height)
        return true
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