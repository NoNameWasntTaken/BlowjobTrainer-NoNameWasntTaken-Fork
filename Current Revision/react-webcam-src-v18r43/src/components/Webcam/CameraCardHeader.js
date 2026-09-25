import React from 'react'

function CameraCardHeader({ fps }) {
    return (
        <div className="camera-card-header">
            <div>
                <h2>Camera Preview</h2>
            </div>
            {fps != null && (
                <div className="camera-status"><span /> {fps} FPS</div>
            )}
        </div>
    )
}

export default CameraCardHeader
