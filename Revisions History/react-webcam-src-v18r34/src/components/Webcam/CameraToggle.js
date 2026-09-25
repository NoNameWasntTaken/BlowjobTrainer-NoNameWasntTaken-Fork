import React from 'react'
import { useAtom } from 'jotai'
import { cameraEnabledAtom } from '../../atoms/cameraAtom'
import { Video, VideoOff } from 'react-feather'

function CameraToggle() {
    const [cameraEnabled, setCameraEnabled] = useAtom(cameraEnabledAtom)

    return (
        <button
            className="button margin-x-sm padding-x"
            style={{ height: '28px', padding: '0 12px', fontSize: '10px' }}
            onClick={() => setCameraEnabled(prev => !prev)}
            title={cameraEnabled ? 'Camera On' : 'Camera Off'}
        >
            {cameraEnabled ? <Video size={14} className="margin-xr-sm" /> : <VideoOff size={14} className="margin-xr-sm" />}
            {cameraEnabled ? 'Camera On' : 'Camera Off'}
        </button>
    )
}

export default CameraToggle
