import { atom } from "jotai";

export const PlayState = {
    NOT_PLAYING: 'NOT_PLAYING',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED'
}

export const Grade = {
    PERFECT_DEEP: 'PERFECT DEEP',
    PERFECT: 'PERFECT',
    GOOD: 'GOOD',
    PASS: 'PASS',
    FAIL: 'FAIL',
    PENALTY: 'PENALTY'
}

export const Rank = {
    MASTER: 4,
    JOURNEYMAN: 3,
    APPRENTICE: 2,
    FAILED: 1,
    DISQUALIFIED: -1
}

export const playStateAtom = atom(PlayState.NOT_PLAYING)
export const playTimeAtom = atom(0)
export const scoresAtom = atom([])

// a level is a collection of tasks
export const currentLevelAtom = atom(null)

/** Incremented when a new level run starts (Training / external PLAYING) for Gameover idempotency. */
export const levelRunGenerationAtom = atom(0)

// Main game state atom to track everything about the current game session


// Example of the level state shape when it's set:
/*
{
    // Overall game session state
    status: 'idle', // idle, playing, paused, complete
    startTime: null,
    totalTime: 0,
    currentScore: 0,

    // Task management
    tasks: [], // array of remaining tasks to complete
    currentTask: null,
    completedTasks: [], // array of completed tasks with their scores

    // Special states and achievements
    milestones: {
        firstDepth3: false,
        firstDepth4: false,
        consecutiveSuccesses: 0,
        perfectTasks: 0
    },

    // Task scoring info
    taskScores: {
        currentTaskScore: 0,
        multiplier: 1,
        penalties: 0
    },

    // Performance metrics
    metrics: {
        totalRestViolations: 0,
        maxDepthTime: 0,
        perfectTransitions: 0,
        avgDepthAccuracy: 0
    }
}
*/

// // what does playing back a level look like.
//   // "wait" - 10s
//   // "hold 1" - 10s  (wait until into state then hold) (allow for +10s to get into state?)
//   const [scenario, setScenario] = useState({
//     playback: 0, // current playback, 0 not started, 1 playing, 2 paused, 3 complete
//     overallTime: 2000,
//     elapsedTime: 0,
//     tasks: [],
//     completedTasks: [],
//     currentTask: null,
//     score: 0,
//   });
