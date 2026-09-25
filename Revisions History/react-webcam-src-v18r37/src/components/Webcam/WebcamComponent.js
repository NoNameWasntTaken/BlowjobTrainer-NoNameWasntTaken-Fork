import React, { useState, useEffect } from 'react'
import { useAtomValue } from 'jotai'
import { gridMigrationDoneAtom } from '../../atoms/gridAtoms'
import { navAtom } from '../../atoms/navAtom'
import * as NAV from '../../atoms/navAtom'
import useWebcam from '../../hooks/useWebcam'
import WebcamDisplay from './WebcamDisplay'
import FrameProcessor from './FrameProcessor'
import useGridProcessor from '../../hooks/useGridProcessor'
import { setCaptureRefs, clearCaptureRefs } from '../../utils/captureWebcamRef'

function WebcamComponent() {
    const migrationDone = useAtomValue(gridMigrationDoneAtom)
    const nav = useAtomValue(navAtom)
    const showCameraToggle = nav !== NAV.PLAYING && nav !== NAV.GAMEOVER
    const { webcamRef, canvasRef, canvasDimensions, scaleFactor, drawVideoFrame } = useWebcam()
    const [fps, setFps] = useState(0)

    useEffect(() => {
        setCaptureRefs(webcamRef, canvasRef)
        return () => clearCaptureRefs()
    }, [webcamRef, canvasRef])
    
    // useGridProcessor now writes directly to currentStateAtom, no sync needed
    useGridProcessor()

    // Early return if migration not done
    if (!migrationDone) {
        return null
    }

    return (
        <>
            <FrameProcessor
                canvasRef={canvasRef}
                drawVideoFrame={drawVideoFrame}
                onFpsChange={setFps}
            />

            <WebcamDisplay
                webcamRef={webcamRef}
                canvasRef={canvasRef}
                canvasDimensions={canvasDimensions}
                scaleFactor={scaleFactor}
                fps={fps}
                showCameraToggle={showCameraToggle}
            />
        </>
    )
}

export default WebcamComponent
