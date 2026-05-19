// common format time object

/**
 * Formats time in seconds to a human readable string
 * @param {number} seconds - The number of seconds to format
 * @param {boolean} [showMillis=false] - Whether to show milliseconds
 * @returns {string} Formatted time string
 */
export function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`
    }
    if (minutes > 0) {
        return `${minutes}m ${secs}s`
    }
    return `${secs}s`
}

/**
 * Calculates the longest streak of consecutive days from an array of dates
 * @param {string[]} dates - Array of date strings
 * @returns {number} The longest streak in days
 */
export function calculateLongestStreak(dates) {
    if (!dates || dates.length === 0) return 0

    const sortedDates = dates.sort()
    let currentStreak = 1
    let maxStreak = 1

    for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = new Date(sortedDates[i - 1])
        const currDate = new Date(sortedDates[i])
        const diffDays = (currDate - prevDate) / (1000 * 60 * 60 * 24)

        if (diffDays === 1) {
            currentStreak++
            maxStreak = Math.max(maxStreak, currentStreak)
        } else {
            currentStreak = 1
        }
    }
    return maxStreak
}