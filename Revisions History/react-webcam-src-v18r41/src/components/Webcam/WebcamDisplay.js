import React, { useCallback, useRef, useEffect, useLayoutEffect, useMemo, useState } from 'react'
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
import CameraToggle from './CameraToggle'
import MirrorToggle from '../MirrorToggle'
import CameraRotationToggle from '../CameraRotationToggle'
import { currentLevelAtom } from '../../atoms/taskAtom'
import { TaskType } from '../Tasks/task'
import { effectiveMirrorAtom } from '../../atoms/mirrorModeAtom'
import { cameraRotationAtom } from '../../atoms/cameraRotationAtom'
import {
    cameraVideoDeviceIdAtom,
    cameraViewportHeightCapAtom,
    CAMERA_VIEWPORT_HEIGHT_CAP_MIN,
    CAMERA_VIEWPORT_HEIGHT_CAP_MAX,
} from '../../atoms/cameraAtom'
import { previewToBufferCoords } from '../../utils/previewToBufferCoords'

const OUTLINE = 2
const BALLS_PURPLE = '#9d4edd'
const BALLS_RED = '#ff4444'

// Preview is selfie-flipped by default (natural self-view). Mirror Mode during
// play flips the REST of the UI so it reads correctly through a physical mirror;
// that effectively cancels the selfie flip on the camera feed, so the net
// preview mirror is `selfie XOR effectiveMirror`.
const SELFIE_MIRROR = true

function WebcamDisplay({ webcamRef, canvasRef, canvasDimensions, scaleFactor, fps, showCameraToggle }) {
    const [viewportHeightCap, setViewportHeightCap] = useAtom(cameraViewportHeightCapAtom)
    const cameraRotation = useAtomValue(cameraRotationAtom)
    const effectiveMirror = useAtomValue(effectiveMirrorAtom)
    const netMirror = SELFIE_MIRROR !== effectiveMirror
    const isSideways = cameraRotation === 90 || cameraRotation === 270

    const previewTransform = useMemo(
        () => `${netMirror ? 'scaleX(-1) ' : ''}rotate(${cameraRotation}deg)`,
        [netMirror, cameraRotation]
    )

    const containerRef = useRef(null)
    const [stage, setStage] = useState({ stageW: 0, stageH: 0, vW: 0, vH: 0 })

    useLayoutEffect(() => {
        const el = containerRef.current
        if (!el) return
        const update = () => {
            const bw = canvasDimensions.width
            const bh = canvasDimensions.height
            if (bw <= 0 || bh <= 0) return
            const aabbAspect = isSideways ? bh / bw : bw / bh
            const maxW = el.clientWidth || window.innerWidth
            const maxH = window.innerHeight * viewportHeightCap
            const heightFromWidth = maxW / aabbAspect
            let stageW
            let stageH
            if (heightFromWidth <= maxH) {
                stageW = maxW
                stageH = heightFromWidth
            } else {
                stageH = maxH
                stageW = maxH * aabbAspect
            }
            const vW = isSideways ? stageH : stageW
            const vH = isSideways ? stageW : stageH
            setStage(prev => (
                prev.stageW === stageW && prev.stageH === stageH && prev.vW === vW && prev.vH === vH
                    ? prev
                    : { stageW, stageH, vW, vH }
            ))
        }
        update()
        const ro = new ResizeObserver(update)
        ro.observe(el)
        window.addEventListener('resize', update)
        return () => {
            ro.disconnect()
            window.removeEventListener('resize', update)
        }
    }, [canvasDimensions.width, canvasDimensions.height, isSideways, viewportHeightCap])

    const brushAddMode = useAtomValue(brushAddModeAtom)
    const grids = useAtomValue(gridsAtom)
    const currentLevel = useAtomValue(currentLevelAtom)
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

    const [cameraVideoDeviceId, setCameraVideoDeviceId] = useAtom(cameraVideoDeviceIdAtom)
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

    // Viewport pointer → sensor-native buffer coords (inverts the single preview transform + object-fit).
    const convertToCanvasCoordinates = useCallback(
        (clientX, clientY) => {
            const videoEl = webcamRef.current?.video
            return previewToBufferCoords(
                clientX,
                clientY,
                videoEl,
                canvasDimensions.width,
                canvasDimensions.height,
                cameraRotation,
                netMirror
            )
        },
        [webcamRef, canvasDimensions.width, canvasDimensions.height, cameraRotation, netMirror]
    )

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
        const task = currentLevel?.currentTask
        const ballsBonusActive = (task?.type === TaskType.REST || task?.type === 'rest ball') && task?.ballsBonus === true

        // Draw all grids
        safeGrids.forEach(grid => {
            const isActive = grid.id === activeGridId || isAllGridsMode
            const neighborMap = gridNeighborMaps.get(grid.id)
            if (!neighborMap) return

            const isBallsGrid = grid.balls === true
            // Regular outline: shaft=blue when active, balls=purple or red when active
            let regularColor = '#FFB84D' // inactive = amber
            if (isActive) {
                if (isBallsGrid) {
                    regularColor = ballsBonusActive ? BALLS_RED : BALLS_PURPLE
                } else {
                    regularColor = '#2196f3' // shaft = blue
                }
            }
            ctx.strokeStyle = regularColor
            ctx.lineWidth = OUTLINE

            // Draw regular outlines for this grid
            for (const { x, y } of grid.squares) {
                const key = `${x},${y}`
                const neighbors = neighborMap.get(key)
                if (!neighbors) continue

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
                // Overlay: standard=red on shaft (covered); balls=blue on !shaft (covered, like standard)
                const overlayColor = isBallsGrid
                    ? '#2196f3'  // balls: blue when covered (hidden squares)
                    : '#ff4444'  // standard grid: red when covered
                ctx.strokeStyle = overlayColor
                ctx.lineWidth = OUTLINE

                // Get squares for this grid's shaft detection
                const gridSquaresSet = new Set(grid.squares.map(sq => `${sq.x},${sq.y}`))

                for (const { x, y } of grid.squares) {
                    const key = `${x},${y}`
                    const colorEntry = gridColors[key]

                    // Standard grid: overlay on shaft (covered). Balls grid: overlay on !shaft (covered, inverted)
                    const isShaftForThisGrid = colorEntry?.shaft && (
                        isAllGridsMode ? colorEntry?.gridId === grid.id : true
                    )
                    const isCoveredForBalls = colorEntry && (
                        isAllGridsMode ? colorEntry?.gridId === grid.id : true
                    ) && !colorEntry?.shaft
                    const shouldDrawOverlay = isBallsGrid ? isCoveredForBalls : isShaftForThisGrid

                    if (!shouldDrawOverlay) continue

                    // Compute neighbors: same coverage logic (shaft for standard, !shaft for balls)
                    const neighborCovered = (nx, ny) => {
                        const nKey = `${nx},${ny}`
                        const nEntry = gridColors[nKey]
                        if (!gridSquaresSet.has(nKey)) return false
                        if (isBallsGrid) return nEntry && !nEntry?.shaft && (isAllGridsMode ? nEntry?.gridId === grid.id : true)
                        return nEntry?.shaft && (isAllGridsMode ? nEntry?.gridId === grid.id : true)
                    }
                    const neighbors = {
                        left: neighborCovered(x - gridSize, y),
                        right: neighborCovered(x + gridSize, y),
                        top: neighborCovered(x, y - gridSize),
                        bottom: neighborCovered(x, y + gridSize)
                    }

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
    }, [grids, selectedGrid, isAllGridsMode, gridNeighborMaps, gridSize, gridColors, currentLevel])

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
        if (isAllGridsMode) {
            isDrawing.current = false
            return
        }
        if (!isDrawing.current || !selectedGrid) return
        const videoElement = webcamRef.current?.video
        if (!videoElement) return

        const canvasCoords = convertToCanvasCoordinates(event.clientX, event.clientY)
        if (!Number.isFinite(canvasCoords.x) || !Number.isFinite(canvasCoords.y)) return
        // Keep the brush disc fully inside the buffer so the visible stamp has
        // the same extent on both sides of the cursor near the preview edges.
        const radius = brushSize / 2
        const cx = Math.min(Math.max(canvasCoords.x, radius), canvasDimensions.width - radius)
        const cy = Math.min(Math.max(canvasCoords.y, radius), canvasDimensions.height - radius)
        const brushSquares = getBrushSquares(cx, cy)

        setGrids(prev => {
            return prev.map(grid => {
                if (grid.id !== selectedGrid.id) return grid

                if (brushAddMode) {
                    const newSquares = brushSquares.filter(bs => {
                        const key = `${bs.x},${bs.y}`
                        const owner = gridSquareOwnership.get(key)
                        return !owner || owner === grid.id
                    }).filter(bs => {
                        return !grid.squares.some(sq => sq.x === bs.x && sq.y === bs.y)
                    })
                    return {
                        ...grid,
                        squares: [...grid.squares, ...newSquares]
                    }
                } else {
                    return {
                        ...grid,
                        squares: grid.squares.filter(sq => !brushSquares.some(bs => bs.x === sq.x && bs.y === sq.y))
                    }
                }
            })
        })
    }, [webcamRef, brushAddMode, isAllGridsMode, selectedGrid, setGrids, gridSquareOwnership, getBrushSquares, convertToCanvasCoordinates, brushSize, canvasDimensions.width, canvasDimensions.height])

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
        event.preventDefault()
        if (isAllGridsMode) return
        const touch = event.touches[0]
        const videoElement = webcamRef.current?.video
        if (!videoElement) return
        isDrawing.current = true
        const mockEvent = { clientX: touch.clientX, clientY: touch.clientY }
        handleDraw(mockEvent)
    }, [webcamRef, isAllGridsMode, handleDraw])

    const handleTouchMove = useCallback((event) => {
        event.preventDefault()
        if (!isDrawing.current) return
        const touch = event.touches[0]
        const mockEvent = { clientX: touch.clientX, clientY: touch.clientY }
        handleDraw(mockEvent)
    }, [handleDraw])

    const handleTouchEnd = useCallback((event) => {
        event.preventDefault()
        isDrawing.current = false
    }, [])

    const handleTouchCancel = useCallback((event) => {
        event.preventDefault()
        isDrawing.current = false
    }, [])

    useEffect(() => {
        if (isAllGridsMode && isDrawing.current) {
            isDrawing.current = false
        }
    }, [isAllGridsMode])

    const handleVideoClick = useCallback((event) => {
        try {
            if (isAllGridsMode || !selectedGrid) return

            const videoElement = webcamRef.current?.video
            if (!videoElement) return

            const canvasCoords = convertToCanvasCoordinates(event.clientX, event.clientY)
            if (!Number.isFinite(canvasCoords.x) || !Number.isFinite(canvasCoords.y)) return
            const gridX = Math.round(canvasCoords.x / gridSize) * gridSize
            const gridY = Math.round(canvasCoords.y / gridSize) * gridSize

            setGrids(prev => {
                return prev.map(grid => {
                    if (grid.id !== selectedGrid.id) return grid

                    const exists = grid.squares.some(sq => sq.x === gridX && sq.y === gridY)
                    if (brushAddMode) {
                        const key = `${gridX},${gridY}`
                        const owner = gridSquareOwnership.get(key)
                        if (owner && owner !== grid.id) return grid
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
            const colors = sampleGridSquares(allGridSquares, canvas, context)

            if (isMounted) {
                const newColors = {}
                const newAverageColors = {}

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

    // Keep outline canvas intrinsic pixels matched to the sensor buffer. CSS scales
    // this to the preview's layout box and the shared transform handles rotation.
    useEffect(() => {
        const canvas = outlineCanvasRef.current
        if (!canvas) return
        canvas.width = canvasDimensions.width
        canvas.height = canvasDimensions.height
        drawGridOutlines()
    }, [canvasDimensions, drawGridOutlines])

    // All preview-transformed children (video + outline canvas) share this box so
    // hit-testing and visual overlay stay pixel-aligned regardless of rotation.
    // `maxWidth`/`maxHeight` are neutralized because global CSS (`canvas { max-width: 100% }`)
    // and browsers' default sizing otherwise caps the pre-rotation width to
    // the stage's width — which for sideways rotations (vW > stageW) collapses
    // the preview into a square, shifts the element's rotation center, and
    // introduces letterboxing that the inverse cannot reverse visually.
    const previewLayerStyle = useMemo(() => ({
        position: 'absolute',
        left: (stage.stageW - stage.vW) / 2,
        top: (stage.stageH - stage.vH) / 2,
        width: stage.vW,
        height: stage.vH,
        maxWidth: 'none',
        maxHeight: 'none',
        transform: previewTransform,
        transformOrigin: 'center center'
    }), [stage.stageW, stage.stageH, stage.vW, stage.vH, previewTransform])

    return (
        <div className='row-centered' style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            <div
                style={{
                    flexShrink: 0,
                    width: '100%',
                    maxHeight: `${viewportHeightCap * 100}vh`,
                    marginBottom: '6px'
                }}
            >
                <div
                    ref={containerRef}
                    id="video-container"
                    style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: '100vw',
                        display: 'flex',
                        justifyContent: 'center'
                    }}
                >
                    <div
                        style={{
                            position: 'relative',
                            width: stage.stageW || 0,
                            height: stage.stageH || 0,
                            overflow: 'hidden',
                            touchAction: 'none'
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
                            key={cameraVideoDeviceId || 'default-facing'}
                            mirrored={false}
                            ref={webcamRef}
                            onClick={handleVideoClick}
                            style={{
                                ...previewLayerStyle,
                                objectFit: 'contain',
                                display: 'block'
                            }}
                            audio={false}
                            videoConstraints={
                                cameraVideoDeviceId
                                    ? { deviceId: { exact: cameraVideoDeviceId } }
                                    : { facingMode: 'user' }
                            }
                        />

                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                        <canvas
                            ref={outlineCanvasRef}
                            style={{
                                ...previewLayerStyle,
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
                            fontFamily: 'monospace',
                            pointerEvents: 'none',
                            zIndex: 2
                        }}>
                            {fps} FPS
                        </div>
                    </div>
                </div>
            </div>
            {showCameraToggle && (
                <>
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <CameraToggle />
                        <CameraRotationToggle />
                    </div>
                    <label
                        htmlFor="camera-viewport-height-cap"
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            marginTop: '4px',
                            marginBottom: '2px',
                            fontSize: '11px',
                            color: '#555',
                            width: '100%',
                            maxWidth: 'min(360px, 94vw)',
                        }}
                    >
                        <span style={{ flex: '0 0 auto' }}>Height {Math.round(viewportHeightCap * 100)}%</span>
                        <input
                            id="camera-viewport-height-cap"
                            type="range"
                            min={CAMERA_VIEWPORT_HEIGHT_CAP_MIN}
                            max={CAMERA_VIEWPORT_HEIGHT_CAP_MAX}
                            step={0.01}
                            value={viewportHeightCap}
                            onChange={(e) => setViewportHeightCap(parseFloat(e.target.value))}
                            style={{ flex: '1 1 auto', minWidth: 0, height: '18px', verticalAlign: 'middle' }}
                        />
                    </label>
                </>
            )}
            <div style={{ marginTop: showCameraToggle ? '6px' : '12px' }}>
                {devices.map((device, key) => (
                    <button
                        key={device.deviceId}
                        onClick={() => setCameraVideoDeviceId(device.deviceId)}
                    >
                        {device.label || `Device ${key + 1}`}
                    </button>
                ))}
            </div>
            {showCameraToggle && (
                <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'center' }}>
                    <MirrorToggle />
                </div>
            )}
        </div>
    )
}

export default WebcamDisplay
