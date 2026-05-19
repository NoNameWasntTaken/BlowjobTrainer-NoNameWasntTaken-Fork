import React, { useCallback, useRef, useEffect, useMemo, useState } from 'react'
import Webcam from 'react-webcam'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { gridSquaresAtom, brushAddModeAtom, gridColorsAtom, gridBaseColorAtom, gridSensitivityAtom, gridAverageColorAtom } from '../../atoms/gridAtoms'
import useColorSampling from '../../hooks/useColorSampling'

const OUTLINE = 2

function WebcamDisplay({ webcamRef, canvasRef, canvasDimensions, scaleFactor, fps }) {
    const brushAddMode = useAtomValue(brushAddModeAtom)
    const [gridSquares, setGridSquares] = useAtom(gridSquaresAtom)
    const [gridColors, setGridColors] = useAtom(gridColorsAtom)
    const baseColor = useAtomValue(gridBaseColorAtom)
    const sensitivity = useAtomValue(gridSensitivityAtom)
    const setGridAverageColor = useSetAtom(gridAverageColorAtom)
    const animationFrameRef = useRef()
    const outlineCanvasRef = useRef()
    const isDrawing = useRef(false)
    const brushSize = 20
    const gridSize = 5
    const { sampleGridSquares } = useColorSampling()

    const [deviceId, setDeviceId] = useState({});
    const [devices, setDevices] = useState([]);

    const handleDevices = useCallback(
        mediaDevices =>
            setDevices(mediaDevices.filter(({ kind }) => kind === "videoinput")),
        [setDevices]
    );

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(() => navigator.mediaDevices.enumerateDevices())
            .then(handleDevices)
            .catch(err => console.error(err));
    }, [handleDevices]);

    // Helper function to get the actual displayed video dimensions (accounting for letterboxing)
    const getActualVideoDisplayDimensions = useCallback(() => {
        const videoElement = webcamRef.current?.video
        if (!videoElement) return { width: 0, height: 0, offsetX: 0, offsetY: 0 }

        const containerWidth = videoElement.clientWidth
        const containerHeight = videoElement.clientHeight
        const videoAspectRatio = canvasDimensions.width / canvasDimensions.height
        const containerAspectRatio = containerWidth / containerHeight

        let actualWidth, actualHeight, offsetX = 0, offsetY = 0

        if (containerAspectRatio > videoAspectRatio) {
            // Container is wider than video - letterboxing on sides
            actualHeight = containerHeight
            actualWidth = actualHeight * videoAspectRatio
            offsetX = (containerWidth - actualWidth) / 2
        } else {
            // Container is taller than video - letterboxing on top/bottom
            actualWidth = containerWidth
            actualHeight = actualWidth / videoAspectRatio
            offsetY = (containerHeight - actualHeight) / 2
        }

        return { width: actualWidth, height: actualHeight, offsetX, offsetY }
    }, [webcamRef, canvasDimensions])

    // Helper function to convert display coordinates to canvas coordinates
    const convertToCanvasCoordinates = useCallback((displayX, displayY) => {
        const { width: actualWidth, height: actualHeight, offsetX, offsetY } = getActualVideoDisplayDimensions()

        // Adjust for letterboxing offset
        const adjustedX = displayX - offsetX
        const adjustedY = displayY - offsetY

        // Convert to canvas coordinates
        const scaleX = canvasDimensions.width / actualWidth
        const scaleY = canvasDimensions.height / actualHeight

        return {
            x: adjustedX * scaleX,
            y: adjustedY * scaleY
        }
    }, [getActualVideoDisplayDimensions, canvasDimensions])

    // Helper function to convert canvas coordinates to display coordinates
    const convertToDisplayCoordinates = useCallback((canvasX, canvasY) => {
        const { width: actualWidth, height: actualHeight, offsetX, offsetY } = getActualVideoDisplayDimensions()

        // Convert from canvas coordinates to actual video display coordinates
        const scaleX = actualWidth / canvasDimensions.width
        const scaleY = actualHeight / canvasDimensions.height

        const displayX = canvasX * scaleX
        const displayY = canvasY * scaleY

        // Add letterboxing offset
        return {
            x: displayX + offsetX,
            y: displayY + offsetY
        }
    }, [getActualVideoDisplayDimensions, canvasDimensions])

    // Memoize the neighbor map to avoid recalculating every frame
    const neighborMap = useMemo(() => {
        const map = new Map()
        for (const { x, y } of gridSquares) {
            const key = `${x},${y}`
            map.set(key, {
                left: gridSquares.some(sq => sq.x === x - gridSize && sq.y === y),
                right: gridSquares.some(sq => sq.x === x + gridSize && sq.y === y),
                top: gridSquares.some(sq => sq.x === x && sq.y === y - gridSize),
                bottom: gridSquares.some(sq => sq.x === x && sq.y === y + gridSize)
            })
        }
        return map
    }, [gridSquares, gridSize])

    // Memoize the shaft neighbor map
    const shaftNeighborMap = useMemo(() => {
        const map = new Map()
        for (const { x, y } of gridSquares) {
            const entry = gridColors[`${x},${y}`]
            if (!entry?.shaft) continue

            const key = `${x},${y}`
            map.set(key, {
                left: gridSquares.some(sq => sq.x === x - gridSize && sq.y === y && gridColors[`${sq.x},${sq.y}`]?.shaft),
                right: gridSquares.some(sq => sq.x === x + gridSize && sq.y === y && gridColors[`${sq.x},${sq.y}`]?.shaft),
                top: gridSquares.some(sq => sq.x === x && sq.y === y - gridSize && gridColors[`${sq.x},${sq.y}`]?.shaft),
                bottom: gridSquares.some(sq => sq.x === x && sq.y === y + gridSize && gridColors[`${sq.x},${sq.y}`]?.shaft)
            })
        }
        return map
    }, [gridSquares, gridColors, gridSize])

    const drawGridOutlines = useCallback(() => {
        const canvas = outlineCanvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Draw regular grid outlines
        ctx.strokeStyle = '#2196f3'
        ctx.lineWidth = OUTLINE

        for (const { x, y } of gridSquares) {
            const key = `${x},${y}`
            const neighbors = neighborMap.get(key)
            if (!neighbors) continue

            // Draw directly in canvas coordinates (no conversion needed)
            if (!neighbors.left) {
                ctx.beginPath()
                ctx.moveTo(x, y)
                ctx.lineTo(x, y + gridSize)
                ctx.stroke()
            }
            if (!neighbors.right) {
                ctx.beginPath()
                ctx.moveTo(x + gridSize, y)
                ctx.lineTo(x + gridSize, y + gridSize)
                ctx.stroke()
            }
            if (!neighbors.top) {
                ctx.beginPath()
                ctx.moveTo(x, y)
                ctx.lineTo(x + gridSize, y)
                ctx.stroke()
            }
            if (!neighbors.bottom) {
                ctx.beginPath()
                ctx.moveTo(x, y + gridSize)
                ctx.lineTo(x + gridSize, y + gridSize)
                ctx.stroke()
            }
        }

        // Draw shaft outlines
        ctx.strokeStyle = '#ff4444'
        ctx.lineWidth = OUTLINE

        for (const { x, y } of gridSquares) {
            const key = `${x},${y}`
            const neighbors = shaftNeighborMap.get(key)
            if (!neighbors) continue

            // Draw directly in canvas coordinates (no conversion needed)
            if (!neighbors.left) {
                ctx.beginPath()
                ctx.moveTo(x, y)
                ctx.lineTo(x, y + gridSize)
                ctx.stroke()
            }
            if (!neighbors.right) {
                ctx.beginPath()
                ctx.moveTo(x + gridSize, y)
                ctx.lineTo(x + gridSize, y + gridSize)
                ctx.stroke()
            }
            if (!neighbors.top) {
                ctx.beginPath()
                ctx.moveTo(x, y)
                ctx.lineTo(x + gridSize, y)
                ctx.stroke()
            }
            if (!neighbors.bottom) {
                ctx.beginPath()
                ctx.moveTo(x, y + gridSize)
                ctx.lineTo(x + gridSize, y + gridSize)
                ctx.stroke()
            }
        }
    }, [gridSquares, neighborMap, shaftNeighborMap, gridSize])

    // Helper: get all grid squares in brush area (in canvas coordinates)
    const getBrushSquares = useCallback((canvasX, canvasY) => {
        const squares = []
        const radius = brushSize / 2
        const startX = Math.floor((canvasX - radius) / gridSize) * gridSize
        const startY = Math.floor((canvasY - radius) / gridSize) * gridSize
        const endX = Math.ceil((canvasX + radius) / gridSize) * gridSize
        const endY = Math.ceil((canvasY + radius) / gridSize) * gridSize

        for (let gridX = startX; gridX <= endX; gridX += gridSize) {
            for (let gridY = startY; gridY <= endY; gridY += gridSize) {
                const centerX = gridX + gridSize / 2
                const centerY = gridY + gridSize / 2
                const distance = Math.sqrt(
                    Math.pow(centerX - canvasX, 2) +
                    Math.pow(centerY - canvasY, 2)
                )

                if (distance <= radius) {
                    squares.push({ x: gridX, y: gridY })
                }
            }
        }
        return squares
    }, [brushSize, gridSize])

    // Helper: compare color to baseColor with sensitivity for 'shaft' logic
    const isShaft = useCallback((color) => {
        if (!color) return false
        return (
            Math.abs(color[0] - baseColor.r) <= sensitivity.r &&
            Math.abs(color[1] - baseColor.g) <= sensitivity.g &&
            Math.abs(color[2] - baseColor.b) <= sensitivity.b
        )
    }, [baseColor, sensitivity])

    // Mouse event handlers
    const handleDraw = useCallback((event) => {
        if (!isDrawing.current) return
        const videoElement = webcamRef.current?.video
        if (!videoElement) return
        const boundingRect = videoElement.getBoundingClientRect()
        const displayX = event.clientX - boundingRect.left
        const displayY = event.clientY - boundingRect.top

        // Convert to canvas coordinates
        const canvasCoords = convertToCanvasCoordinates(displayX, displayY)
        const brushSquares = getBrushSquares(canvasCoords.x, canvasCoords.y)

        setGridSquares(prev => {
            if (brushAddMode) {
                const newSquares = brushSquares.filter(bs => !prev.some(sq => sq.x === bs.x && sq.y === bs.y))
                return [...prev, ...newSquares]
            } else {
                return prev.filter(sq => !brushSquares.some(bs => bs.x === sq.x && bs.y === sq.y))
            }
        })
    }, [webcamRef, brushAddMode, setGridSquares, getBrushSquares, convertToCanvasCoordinates])

    const handleMouseDown = useCallback((event) => {
        const videoElement = webcamRef.current?.video
        if (!videoElement) return
        isDrawing.current = true
        handleDraw(event)
    }, [webcamRef, handleDraw])

    const handleMouseUp = useCallback(() => {
        isDrawing.current = false
    }, [])

    const handleMouseLeave = useCallback(() => {
        isDrawing.current = false
    }, [])

    // Touch event handlers
    const handleTouchStart = useCallback((event) => {
        event.preventDefault() // Prevent scrolling & other default actions
        const touch = event.touches[0]
        const videoElement = webcamRef.current?.video
        if (!videoElement) return
        isDrawing.current = true
        // Call handleTouchMove directly to register the first point
        // as handleDraw expects a similar event structure
        const mockEvent = { clientX: touch.clientX, clientY: touch.clientY }
        handleDraw(mockEvent)
    }, [webcamRef, handleDraw])

    const handleTouchMove = useCallback((event) => {
        event.preventDefault() // Prevent scrolling & other default actions
        if (!isDrawing.current) return
        const touch = event.touches[0]
        const mockEvent = { clientX: touch.clientX, clientY: touch.clientY }
        handleDraw(mockEvent)
    }, [webcamRef, handleDraw])

    const handleTouchEnd = useCallback((event) => {
        event.preventDefault() // Prevent scrolling & other default actions
        isDrawing.current = false
    }, [])

    const handleTouchCancel = useCallback((event) => {
        event.preventDefault() // Prevent scrolling & other default actions
        isDrawing.current = false
    }, [])

    const handleVideoClick = useCallback((event) => {
        try {
            const videoElement = webcamRef.current?.video
            if (!videoElement) return

            const boundingRect = videoElement.getBoundingClientRect()
            const displayX = event.clientX - boundingRect.left
            const displayY = event.clientY - boundingRect.top

            // Convert to canvas coordinates
            const canvasCoords = convertToCanvasCoordinates(displayX, displayY)
            const gridX = Math.round(canvasCoords.x / gridSize) * gridSize
            const gridY = Math.round(canvasCoords.y / gridSize) * gridSize

            setGridSquares(prev => {
                const exists = prev.some(sq => sq.x === gridX && sq.y === gridY)
                if (brushAddMode) {
                    if (!exists) return [...prev, { x: gridX, y: gridY }]
                    return prev
                } else {
                    if (exists) return prev.filter(sq => !(sq.x === gridX && sq.y === gridY))
                    return prev
                }
            })
        } catch (error) {
            console.error('Error handling video click:', error)
        }
    }, [webcamRef, brushAddMode, setGridSquares, gridSize, convertToCanvasCoordinates])

    // Continuously sample colors for all selected grid squares
    useEffect(() => {
        let isMounted = true
        const updateColors = () => {
            const canvas = canvasRef.current
            if (!canvas) {
                animationFrameRef.current = requestAnimationFrame(updateColors)
                return
            }

            const context = canvas.getContext('2d', { willReadFrequently: true })
            const colors = sampleGridSquares(gridSquares, canvas, context)

            if (isMounted) {
                const newColors = {}
                let sumR = 0, sumG = 0, sumB = 0, count = 0

                for (const { x, y } of gridSquares) {
                    const color = colors[`${x},${y}`] || [0, 0, 0]
                    newColors[`${x},${y}`] = {
                        color,
                        shaft: isShaft(color)
                    }
                    sumR += color[0]
                    sumG += color[1]
                    sumB += color[2]
                    count++
                }

                setGridColors(newColors)
                if (count > 0) {
                    setGridAverageColor({
                        r: Math.round(sumR / count),
                        g: Math.round(sumG / count),
                        b: Math.round(sumB / count)
                    })
                } else {
                    setGridAverageColor({ r: 0, g: 0, b: 0 })
                }

                drawGridOutlines()
            }
            animationFrameRef.current = requestAnimationFrame(updateColors)
        }
        animationFrameRef.current = requestAnimationFrame(updateColors)
        return () => {
            isMounted = false
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
        }
    }, [gridSquares, canvasRef, sampleGridSquares, isShaft, setGridColors, setGridAverageColor, drawGridOutlines])

    // Update canvas size and position when dimensions change
    useEffect(() => {
        const canvas = outlineCanvasRef.current
        if (!canvas) return

        // Set canvas size to match the actual video resolution (same as hidden canvas)
        canvas.width = canvasDimensions.width
        canvas.height = canvasDimensions.height

        // Position the canvas to account for letterboxing
        const { width: actualWidth, height: actualHeight, offsetX, offsetY } = getActualVideoDisplayDimensions()

        canvas.style.width = `${actualWidth}px`
        canvas.style.height = `${actualHeight}px`
        canvas.style.left = `${offsetX}px`
        canvas.style.top = `${offsetY}px`

        drawGridOutlines()
    }, [canvasDimensions, drawGridOutlines, getActualVideoDisplayDimensions])

    return (
        <div className='row-centered' style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
                id="video-container"
                style={{
                    position: 'relative',
                    display: 'inline-block',
                    touchAction: 'none',
                    width: '100%',
                    maxWidth: '100vw',
                    maxHeight: '70vh'
                }}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onMouseMove={handleDraw}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
            >
                <Webcam
                    mirrored={true}
                    ref={webcamRef}
                    onClick={handleVideoClick}
                    style={{
                        width: '100%',
                        height: 'auto',
                        maxWidth: '100%',
                        maxHeight: '70vh',
                        objectFit: 'contain'
                    }}
                    audio={false}
                    videoConstraints={{ deviceId }}
                />

                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <canvas
                    ref={outlineCanvasRef}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        pointerEvents: 'none'
                    }}
                />

                <div style={{
                    position: 'absolute',
                    bottom: '10px',
                    right: '10px',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontFamily: 'monospace'
                }}>
                    {fps} FPS
                </div>
            </div>
            <div style={{ marginTop: '2px' }}>
                {devices.map((device, key) => (
                    <button
                        key={device.deviceId}
                        onClick={() => setDeviceId(device.deviceId)}
                    >
                        {device.label || `Device ${key + 1}`}
                    </button>
                ))}
            </div>
        </div>
    )
}

export default WebcamDisplay 