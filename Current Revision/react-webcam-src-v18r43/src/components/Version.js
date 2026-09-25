import React, { useEffect, useState } from 'react'

const Version = () => {
    const [version, setVersion] = useState(null)

    useEffect(() => {
        // Fetch the version.json file
        fetch('/version.json')
            .then(response => response.json())
            .then(data => {
                const display = data.revision != null
                    ? `${data.version}r${data.revision}`
                    : data.version
                setVersion(display)
            })
            .catch(error => console.error('Error loading version:', error))
    }, [])

    if (version === null) return null

    return (
        <p className="app-version">v{version}</p>
    )
}

export default Version 