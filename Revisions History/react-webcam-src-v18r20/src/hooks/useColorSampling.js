import { useCallback } from 'react'

function useColorSampling() {

    const sampleGridSquares = useCallback((squares, canvas, context) => {
        if (!squares.length) return {}

        const colors = {}

        for (const { x, y } of squares) {
            // For mirrored video, we need to flip the x coordinate
            // Test without the -5 offset
            const xMirror = canvas.width - x

            // Ensure we're within canvas bounds
            if (xMirror < 0 || xMirror >= canvas.width - 5 || y < 0 || y >= canvas.height - 5) {
                continue
            }

            try {
                // Sample a 5x5 area
                const imageData = context.getImageData(xMirror, y, 5, 5)
                const data = imageData.data

                let sumRed = 0
                let sumGreen = 0
                let sumBlue = 0
                let numPixels = 0

                // Sample all pixels in the 5x5 area
                for (let i = 0; i < data.length; i += 4) {
                    sumRed += data[i]
                    sumGreen += data[i + 1]
                    sumBlue += data[i + 2]
                    numPixels++
                }

                if (numPixels > 0) {
                    colors[`${x},${y}`] = [
                        Math.round(sumRed / numPixels),
                        Math.round(sumGreen / numPixels),
                        Math.round(sumBlue / numPixels)
                    ]
                }
            } catch (error) {
                console.error('Error sampling grid square at', x, y, ':', error)
            }
        }

        return colors
    }, [])

    return {
        sampleGridSquares
    }
}

export default useColorSampling 