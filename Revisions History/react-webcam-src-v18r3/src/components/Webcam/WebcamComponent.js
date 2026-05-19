import React, { useState } from 'react'
import { useAtom } from 'jotai'
import { currentStateAtom } from '../../atoms/markersAtoms'
import useWebcam from '../../hooks/useWebcam'
import WebcamDisplay from './WebcamDisplay'
import FrameProcessor from './FrameProcessor'
import useGridProcessor from '../../hooks/useGridProcessor'

function WebcamComponent() {
    const [currentState, setCurrentState] = useAtom(currentStateAtom)
    const { webcamRef, canvasRef, canvasDimensions, scaleFactor, drawVideoFrame } = useWebcam()
    const [fps, setFps] = useState(0)
    const tempState = useGridProcessor()

    // Move state update to useEffect
    React.useEffect(() => {
        if (tempState !== currentState) {
            setCurrentState(tempState)
        }
    }, [tempState, currentState, setCurrentState])

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
