import React from 'react'
import { useAtom } from 'jotai'
import { mirrorModeAtom } from '../atoms/mirrorModeAtom'
import { Repeat } from 'react-feather'

function MirrorToggle({ compact = true }) {
    const [mirrorEnabled, setMirrorEnabled] = useAtom(mirrorModeAtom)

    return (
        <button
            className={`button margin-x-sm padding-x ${mirrorEnabled ? 'button-primary' : ''}`}
            style={compact ? { height: '28px', padding: '0 12px', fontSize: '10px' } : undefined}
            onClick={() => setMirrorEnabled(prev => !prev)}
            title={mirrorEnabled ? 'Mirror mode on' : 'Mirror mode off'}
        >
            <Repeat size={14} className="margin-xr-sm" />
            {mirrorEnabled ? 'Mirror On' : 'Mirror Off'}
        </button>
    )
}

export default MirrorToggle
