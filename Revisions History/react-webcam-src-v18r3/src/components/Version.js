import React, { useEffect, useState } from 'react'

const Version = () => {
    const [version, setVersion] = useState(null)

    useEffect(() => {
        // Fetch the version.json file
        fetch('/version.json')
            .then(response => response.json())
            .then(data => setVersion(data.version))
            .catch(error => console.error('Error loading version:', error))
    }, [])

    if (version === null) return null

    return (
        <div style={{
            position: 'fixed',
            bottom: '10px',
            lefy: '10px',
            fontSize: '10px',
            opacity: 0.6,
            zIndex: 1000
        }}>
            v {version}
        </div>
    )
}

export default Version 