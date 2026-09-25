import React from 'react'
import { useAtom } from 'jotai'
import { cameraEnabledAtom } from '../../atoms/cameraAtom'
import { Video, VideoOff } from 'react-feather'

function CameraToggle() {
    const [cameraEnabled, setCameraEnabled] = useAtom(cameraEnabledAtom)

    return (
        <button
            className="button"
            onClick={() => setCameraEnabled(prev => !prev)}
            title={cameraEnabled ? 'Camera On' : 'Camera Off'}
        >
            {cameraEnabled ? <Video size={14} className="margin-xr-sm" /> : <VideoOff size={14} className="margin-xr-sm" />}
            {cameraEnabled ? 'Camera On' : 'Camera Off'}
        </button>
    )
}

export default CameraToggle
