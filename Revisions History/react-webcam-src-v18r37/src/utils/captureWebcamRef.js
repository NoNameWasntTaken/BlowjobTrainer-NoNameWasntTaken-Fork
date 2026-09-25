let _webcamRef = null
let _canvasRef = null

/** @param {import('react').MutableRefObject<any>} webcamRef */
/** @param {import('react').MutableRefObject<any>} canvasRef */
export function setCaptureRefs(webcamRef, canvasRef) {
    _webcamRef = webcamRef
    _canvasRef = canvasRef
}

export function clearCaptureRefs() {
    _webcamRef = null
    _canvasRef = null
}

export function getCaptureRefs() {
    return { webcamRef: _webcamRef, canvasRef: _canvasRef }
}
