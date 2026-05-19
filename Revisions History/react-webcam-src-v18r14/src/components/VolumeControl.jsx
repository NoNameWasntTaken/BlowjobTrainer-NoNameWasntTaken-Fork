import React from 'react';
import { useAtom } from 'jotai';
import { Volume2, VolumeX } from 'react-feather';

function VolumeControl({ label, volumeAtom }) {
    const [volume, setVolume] = useAtom(volumeAtom);

    const handleChange = (e) => {
        setVolume(parseFloat(e.target.value));
    };

    const toggleMute = () => {
        setVolume(volume === 0 ? 1.0 : 0);
    };

    const isMuted = volume === 0;

    return (
        <div className="row-centered margin-y-sm" style={{ gap: '8px' }}>
            <button 
                className="button padding-x-sm" 
                onClick={toggleMute}
                title={isMuted ? 'Unmute' : 'Mute'}
                style={{ minWidth: '36px', padding: '4px 8px' }}
            >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <label style={{ minWidth: '50px' }}>{label}</label>
            <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={handleChange}
                style={{ width: '120px' }}
            />
            <span style={{ minWidth: '40px', textAlign: 'right' }}>{Math.round(volume * 100)}%</span>
        </div>
    );
}

export default VolumeControl;
