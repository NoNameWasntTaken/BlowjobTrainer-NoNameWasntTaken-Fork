import React, { useCallback, useRef, useEffect, useMemo, useState } from 'react'
import Webcam from 'react-webcam'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { 
    gridsAtom, 
    selectedGridAtom, 
    allGridSquaresAtom, 
    gridSquareOwnershipAtom,
    brushAddModeAtom, 
    gridColorsAtom, 
    gridAverageColorsAtom,
    isAllGridsModeAtom
} from '../../atoms/gridAtoms'
import useColorSampling from '../../hooks/useColorSampling'

const OUTLINE = 2

function WebcamDisplay({ webcamRef, canvasRef, canvasDimensions, scaleFactor, fps }) {
    const brushAddMode = useAtomValue(brushAddModeAtom)
    const grids = useAtomValue(gridsAtom)
    const selectedGrid = useAtomValue(selectedGridAtom)
    const isAllGridsMode = useAtomValue(isAllGridsModeAtom)
    const allGridSquares = useAtomValue(allGridSquaresAtom)
    const gridSquareOwnership = useAtomValue(gridSquareOwnershipAtom)
    const [gridColors, setGridColors] = useAtom(gridColorsAtom)
    const setGridAverageColors = useSetAtom(gridAverageColorsAtom)
    const setGrids = useSetAtom(gridsAtom)
    const animationFrameRef = useRef()
    const outlineCanvasRef = useRef()
    const isDrawing = useRef(false)
    const brushSize = 20
    const gridSize = 5
    const { sampleGridSquares } = useColorSampling()

    const [deviceId, setDeviceId] = useState(null);
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

    // Memoize neighbor maps per grid for performance
    const gridNeighborMaps = useMemo(() => {
        const maps = new Map()
        const safeGrids = Array.isArray(grids) ? grids : []
        
        safeGrids.forEach(grid => {
            const squaresSet = new Set(grid.squares.map(sq => `${sq.x},${sq.y}`))
            const map = new Map()
            
            for (const { x, y } of grid.squares) {
                const key = `${x},${y}`
                map.set(key, {
                    left: squaresSet.has(`${x - gridSize},${y}`),
                    right: squaresSet.has(`${x + gridSize},${y}`),
                    top: squaresSet.has(`${x},${y - gridSize}`),
                    bottom: squaresSet.has(`${x},${y + gridSize}`)
                })
            }
            
            maps.set(grid.id, map)
        })
        
        return maps
    }, [grids, gridSize])

    const drawGridOutlines = useCallback(() => {
        const canvas = outlineCanvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        const safeGrids = Array.isArray(grids) ? grids : []
        const activeGridId = selectedGrid?.id || null

        // Draw all grids
        safeGrids.forEach(grid => {
            const isActive = grid.id === activeGridId || isAllGridsMode
            const neighborMap = gridNeighborMaps.get(grid.id)
            if (!neighborMap) return

            // Determine color: amber for inactive grids, blue for active grids
            const regularColor = isActive ? '#2196f3' : '#FFB84D'
            ctx.strokeStyle = regularColor
            ctx.lineWidth = OUTLINE

            // Draw regular outlines for this grid
            for (const { x, y } of grid.squares) {
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

            // Draw shaft outlines only for active grids (or all grids in All Grids mode)
            if (isActive) {
                ctx.strokeStyle = '#ff4444'
                ctx.lineWidth = OUTLINE

                // Get squares for this grid's shaft detection
                const gridSquaresSet = new Set(grid.squares.map(sq => `${sq.x},${sq.y}`))
                
                for (const { x, y } of grid.squares) {
                    const key = `${x},${y}`
                    const colorEntry = gridColors[key]
                    
                    // Check if this square is detected as shaft for this grid
                    // In All Grids mode, check if the entry belongs to this grid
                    // In single grid mode, check if it's a shaft detection
                    const isShaftForThisGrid = colorEntry?.shaft && (
                        isAllGridsMode ? colorEntry?.gridId === grid.id : true
                    )
                    
                    if (!isShaftForThisGrid) continue

                    // Compute neighbors for this grid's shaft squares
                    const neighbors = {
                        left: gridSquaresSet.has(`${x - gridSize},${y}`) && 
                              gridColors[`${x - gridSize},${y}`]?.shaft && 
                              (isAllGridsMode ? gridColors[`${x - gridSize},${y}`]?.gridId === grid.id : true),
                        right: gridSquaresSet.has(`${x + gridSize},${y}`) && 
                               gridColors[`${x + gridSize},${y}`]?.shaft && 
                               (isAllGridsMode ? gridColors[`${x + gridSize},${y}`]?.gridId === grid.id : true),
                        top: gridSquaresSet.has(`${x},${y - gridSize}`) && 
                             gridColors[`${x},${y - gridSize}`]?.shaft && 
                             (isAllGridsMode ? gridColors[`${x},${y - gridSize}`]?.gridId === grid.id : true),
                        bottom: gridSquaresSet.has(`${x},${y + gridSize}`) && 
                                gridColors[`${x},${y + gridSize}`]?.shaft && 
                                (isAllGridsMode ? gridColors[`${x},${y + gridSize}`]?.gridId === grid.id : true)
                    }

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
            }
        })
    }, [grids, selectedGrid, isAllGridsMode, gridNeighborMaps, gridSize, gridColors])

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
    const isShaft = useCallback((color, gridId) => {
        if (!color || !gridId) return false
        const grid = grids.find(g => g.id === gridId)
        if (!grid) return false
        const { baseColor, sensitivity } = grid
        return (
            Math.abs(color[0] - baseColor.r) <= sensitivity.r &&
            Math.abs(color[1] - baseColor.g) <= sensitivity.g &&
            Math.abs(color[2] - baseColor.b) <= sensitivity.b
        )
    }, [grids])

    // Mouse event handlers
    const handleDraw = useCallback((event) => {
        // Early return if in All Grids mode
        if (isAllGridsMode) {
            isDrawing.current = false
            return
        }
        if (!isDrawing.current || !selectedGrid) return
        const videoElement = webcamRef.current?.video
        if (!videoElement) return
        const boundingRect = videoElement.getBoundingClientRect()
        const displayX = event.clientX - boundingRect.left
        const displayY = event.clientY - boundingRect.top

        // Convert to canvas coordinates
        const canvasCoords = convertToCanvasCoordinates(displayX, displayY)
        const brushSquares = getBrushSquares(canvasCoords.x, canvasCoords.y)

        setGrids(prev => {
            return prev.map(grid => {
                if (grid.id !== selectedGrid.id) return grid
                
                if (brushAddMode) {
                    // Filter out squares already owned by other grids
                    const newSquares = brushSquares.filter(bs => {
                        const key = `${bs.x},${bs.y}`
                        const owner = gridSquareOwnership.get(key)
                        // Only add if not owned or owned by this grid
                        return !owner || owner === grid.id
                    }).filter(bs => {
                        // Also filter out squares already in this grid
                        return !grid.squares.some(sq => sq.x === bs.x && sq.y === bs.y)
                    })
                    return {
                        ...grid,
                        squares: [...grid.squares, ...newSquares]
                    }
                } else {
                    // Remove only from this grid
                    return {
                        ...grid,
                        squares: grid.squares.filter(sq => !brushSquares.some(bs => bs.x === sq.x && bs.y === sq.y))
                    }
                }
            })
        })
    }, [webcamRef, brushAddMode, isAllGridsMode, selectedGrid, setGrids, gridSquareOwnership, getBrushSquares, convertToCanvasCoordinates])

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
        // Early return if in All Grids mode
        if (isAllGridsMode) return
        const touch = event.touches[0]
        const videoElement = webcamRef.current?.video
        if (!videoElement) return
        isDrawing.current = true
        // Call handleTouchMove directly to register the first point
        // as handleDraw expects a similar event structure
        const mockEvent = { clientX: touch.clientX, clientY: touch.clientY }
        handleDraw(mockEvent)
    }, [webcamRef, isAllGridsMode, handleDraw])

    const handleTouchMove = useCallback((event) => {
        event.preventDefault() // Prevent scrolling & other default actions
        if (!isDrawing.current) return
        const touch = event.touches[0]
        const mockEvent = { clientX: touch.clientX, clientY: touch.clientY }
        handleDraw(mockEvent)
    }, [handleDraw])

    const handleTouchEnd = useCallback((event) => {
        event.preventDefault() // Prevent scrolling & other default actions
        isDrawing.current = false
    }, [])

    const handleTouchCancel = useCallback((event) => {
        event.preventDefault() // Prevent scrolling & other default actions
        isDrawing.current = false
    }, [])

    // Interrupt drawing if user switches to All Grids mode
    useEffect(() => {
        if (isAllGridsMode && isDrawing.current) {
            isDrawing.current = false
        }
    }, [isAllGridsMode])

    const handleVideoClick = useCallback((event) => {
        try {
            // Early return if in All Grids mode
            if (isAllGridsMode || !selectedGrid) return
            
            const videoElement = webcamRef.current?.video
            if (!videoElement) return

            const boundingRect = videoElement.getBoundingClientRect()
            const displayX = event.clientX - boundingRect.left
            const displayY = event.clientY - boundingRect.top

            // Convert to canvas coordinates
            const canvasCoords = convertToCanvasCoordinates(displayX, displayY)
            const gridX = Math.round(canvasCoords.x / gridSize) * gridSize
            const gridY = Math.round(canvasCoords.y / gridSize) * gridSize

            setGrids(prev => {
                return prev.map(grid => {
                    if (grid.id !== selectedGrid.id) return grid
                    
                    const exists = grid.squares.some(sq => sq.x === gridX && sq.y === gridY)
                    if (brushAddMode) {
                        // Check if square is already owned by another grid
                        const key = `${gridX},${gridY}`
                        const owner = gridSquareOwnership.get(key)
                        if (owner && owner !== grid.id) return grid // Can't claim owned square
                        if (!exists) {
                            return {
                                ...grid,
                                squares: [...grid.squares, { x: gridX, y: gridY }]
                            }
                        }
                        return grid
                    } else {
                        if (exists) {
                            return {
                                ...grid,
                                squares: grid.squares.filter(sq => !(sq.x === gridX && sq.y === gridY))
                            }
                        }
                        return grid
                    }
                })
            })
        } catch (error) {
            console.error('Error handling video click:', error)
        }
    }, [webcamRef, brushAddMode, isAllGridsMode, selectedGrid, setGrids, gridSquareOwnership, gridSize, convertToCanvasCoordinates])

    // Continuously sample colors for all grid squares
    useEffect(() => {
        let isMounted = true
        const updateColors = () => {
            const canvas = canvasRef.current
            if (!canvas) {
                animationFrameRef.current = requestAnimationFrame(updateColors)
                return
            }

            const context = canvas.getContext('2d', { willReadFrequently: true })
            // Sample all squares from all grids
            const colors = sampleGridSquares(allGridSquares, canvas, context)

            if (isMounted) {
                const newColors = {}
                const newAverageColors = {}

                // Process each grid separately
                grids.forEach(grid => {
                    let sumR = 0, sumG = 0, sumB = 0, count = 0

                    for (const { x, y } of grid.squares) {
                        const key = `${x},${y}`
                        const color = colors[key] || [0, 0, 0]
                        const gridId = gridSquareOwnership.get(key) || grid.id
                        newColors[key] = {
                            gridId,
                            color,
                            shaft: isShaft(color, gridId)
                        }
                        sumR += color[0]
                        sumG += color[1]
                        sumB += color[2]
                        count++
                    }

                    // Calculate per-grid average
                    if (count > 0) {
                        newAverageColors[grid.id] = {
                            r: Math.round(sumR / count),
                            g: Math.round(sumG / count),
                            b: Math.round(sumB / count)
                        }
                    } else {
                        newAverageColors[grid.id] = { r: 0, g: 0, b: 0 }
                    }
                })

                setGridColors(newColors)
                setGridAverageColors(newAverageColors)
                drawGridOutlines()
            }
            animationFrameRef.current = requestAnimationFrame(updateColors)
        }
        animationFrameRef.current = requestAnimationFrame(updateColors)
        return () => {
            isMounted = false
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
        }
    }, [allGridSquares, grids, gridSquareOwnership, canvasRef, sampleGridSquares, isShaft, setGridColors, setGridAverageColors, drawGridOutlines])

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
                    videoConstraints={deviceId ? { deviceId } : { facingMode: 'user' }}
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