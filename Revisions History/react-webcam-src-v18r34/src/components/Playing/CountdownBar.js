import React from 'react'

function CountdownBar({
    currentProgress,
    secondsRemaining,
    atCorrectDepth,
    showTimeLabels = true,
    customLabel = null
}) {
    return (
        <>
            <div style={{
                width: '100%',
                height: '20px',
                backgroundColor: '#e0e0e0',
                borderRadius: '10px',
                marginTop: '10px',
                overflow: 'hidden'
            }}>
                <div style={{
                    width: `${currentProgress}%`,
                    height: '100%',
                    backgroundColor: atCorrectDepth ? '#33C3F0' : '#ccc',
                    borderRadius: '10px',
                    transition: 'width 0.1s ease-out'
                }} />
            </div>

            {showTimeLabels && (
                <pre className='margin-y-sm'>{secondsRemaining}s</pre>
            )}

            {customLabel && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    fontSize: '12px',
                    marginTop: '5px'
                }}>
                    {customLabel}
                </div>
            )}
        </>
    )
}

export default CountdownBar 