import React from 'react'
import { useAtom } from 'jotai'
import { RotateCw } from 'react-feather'
import { cameraRotationAtom } from '../atoms/cameraRotationAtom'

function CameraRotationToggle() {
    const [rotation, setRotation] = useAtom(cameraRotationAtom)
    const cycle = () => setRotation(prev => (prev + 90) % 360)
    return (
        <button
            className={`button margin-x-sm padding-x ${rotation !== 0 ? 'button-primary' : ''}`}
            style={{ height: '28px', padding: '0 12px', fontSize: '10px' }}
            onClick={cycle}
            title={`Rotate camera (${rotation}°)`}
        >
            <RotateCw size={14} className="margin-xr-sm" />
            {rotation}°
        </button>
    )
}

export default CameraRotationToggle
