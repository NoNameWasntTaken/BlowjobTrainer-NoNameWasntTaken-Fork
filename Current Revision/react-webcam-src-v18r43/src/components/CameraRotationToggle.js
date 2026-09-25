import React from 'react'
import { useAtom } from 'jotai'
import { RotateCw } from 'react-feather'
import { cameraRotationAtom } from '../atoms/cameraRotationAtom'

function CameraRotationToggle() {
    const [rotation, setRotation] = useAtom(cameraRotationAtom)
    const cycle = () => setRotation(prev => (prev + 90) % 360)
    return (
        <button
            className={`button ${rotation !== 0 ? 'button-primary' : ''}`}
            onClick={cycle}
            title={`Rotate camera (${rotation}°)`}
        >
            <RotateCw size={14} className="margin-xr-sm" />
            {rotation}°
        </button>
    )
}

export default CameraRotationToggle
