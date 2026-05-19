/**
 * Session Export Service
 * Handles formatting and exporting session results to JSON
 */

/**
 * Generate a UUID-like string
 */
function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback UUID v4 implementation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : ((r & 0x3) | 0x8);
        return v.toString(16);
    });
}

/**
 * Format session data from current level and play time
 */
export function formatSessionData(currentLevel, playTime, completionStatus) {
    if (!currentLevel) {
        return null;
    }

    // Calculate session stats
    const loads = currentLevel.finishedLoads || 0;
    
    // Calculate dives (from updown and hitdepth summaries)
    let dives = 0;
    if (currentLevel.summaries) {
        currentLevel.summaries.forEach(summary => {
            if (summary.type === 'updown' || summary.type === 'hitdepth' || 
                summary.type === 'UPANDDOWN' || summary.type === 'HITDEPTH') {
                dives += (summary.counts?.perfect || 0) + (summary.counts?.pass || 0);
            }
            if (summary.type === 'endless' || summary.type === 'ENDLESS') {
                dives += (summary.counts?.dives || 0);
            }
        });
    }
    
    // Calculate hold time (from hold summaries)
    let holdTime = 0;
    if (currentLevel.summaries) {
        currentLevel.summaries.forEach(summary => {
            if (summary.type === 'hold' || summary.type === 'HOLDPOSITION' || summary.type === 'holdandclap' || summary.type === 'HOLDANDCLAP') {
                holdTime += (summary.totalTimeHeld || 0);
            }
            if (summary.type === 'endless' || summary.type === 'ENDLESS') {
                holdTime += (summary.totalTimeHeld || 0);
            }
        });
    }
    
    // Calculate penalties
    let penalties = 0;
    if (currentLevel.summaries) {
        currentLevel.summaries.forEach(summary => {
            penalties += (summary.counts?.penalties || 0);
        });
    }

    // Format task details
    const taskDetails = (currentLevel.summaries || []).map(summary => {
        const taskType = summary.type || 'unknown';
        const completed = (summary.counts?.perfect || 0) + (summary.counts?.pass || 0) > 0;
        
        return {
            taskType: taskType,
            completed: completed,
            score: summary.score || 0,
            summary: summary
        };
    });

    return {
        sessionId: generateUUID(),
        timestamp: new Date().toISOString(),
        levelId: currentLevel.id || 'unknown',
        levelTitle: currentLevel.title || 'Unknown Level',
        completionStatus: completionStatus || 'completed',
        completed: completionStatus === 'completed',
        score: currentLevel.currentScore || 0,
        totalTime: playTime || 0,
        sessionStats: {
            loads: loads,
            dives: dives,
            holdTime: holdTime,
            penalties: penalties
        },
        taskDetails: taskDetails
    };
}

/**
 * Export session results to file via IPC
 */
export async function exportSessionResults(sessionData, outputPath) {
    if (!window.electronAPI || !window.electronAPI.writeSessionResults) {
        console.error('IPC not available for writing session results');
        return { success: false, error: 'IPC not available' };
    }

    try {
        const result = await window.electronAPI.writeSessionResults(outputPath, sessionData);
        return result;
    } catch (error) {
        console.error('Failed to export session results:', error);
        return { success: false, error: error.message };
    }
}

export const sessionExportService = {
    formatSessionData,
    exportSessionResults
};
