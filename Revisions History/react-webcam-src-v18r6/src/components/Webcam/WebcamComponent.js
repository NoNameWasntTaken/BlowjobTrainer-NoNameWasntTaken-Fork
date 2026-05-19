import React, { useState } from 'react'
import { useAtomValue } from 'jotai'
import { gridMigrationDoneAtom } from '../../atoms/gridAtoms'
import useWebcam from '../../hooks/useWebcam'
import WebcamDisplay from './WebcamDisplay'
import FrameProcessor from './FrameProcessor'
import useGridProcessor from '../../hooks/useGridProcessor'

function WebcamComponent() {
    const migrationDone = useAtomValue(gridMigrationDoneAtom)
    const { webcamRef, canvasRef, canvasDimensions, scaleFactor, drawVideoFrame } = useWebcam()
    const [fps, setFps] = useState(0)
    
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
            />
        </>
    )
}

export default WebcamComponent
