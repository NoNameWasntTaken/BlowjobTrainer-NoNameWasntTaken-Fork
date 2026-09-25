import React from 'react'

/**
 * Hold-task progress bar shell. Width, fill color, and seconds label are
 * updated imperatively by useHoldProgress (not via React props/state).
 */
function HoldProgressBar({ barRef }) {
    const setFillRef = (el) => {
        barRef.current.fillEl = el
    }
    const setLabelRef = (el) => {
        barRef.current.labelEl = el
    }

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
                <div
                    ref={setFillRef}
                    style={{
                        width: '0%',
                        height: '100%',
                        backgroundColor: '#ccc',
                        borderRadius: '10px',
                        transition: 'width 0.1s ease-out'
                    }}
                />
            </div>

            <pre ref={setLabelRef} className='margin-y-sm'>0s</pre>
        </>
    )
}

export default HoldProgressBar
