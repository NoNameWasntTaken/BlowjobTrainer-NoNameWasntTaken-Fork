import { AUDIO } from "./audio";


// split tasks into basic types.
// a task will then be a mix of type, repetitions, duration, tempo
// - hold for 10s x 3
// - up and down x 30 fast
export const TaskType = {
    BLANK: 'blank',
    CALIBRATION: 'calibration',
    GETREADY: 'get ready',
    REST: 'rest', // most resting is this
    REST_BALL: 'rest ball', // at higher difficulty this rest state is more likely.
    HOLDPOSITION: 'hold',
    UPANDDOWN: 'updown',
    HITDEPTH: 'hitdepth',
    CLAP: 'clap',
    HOLDANDCLAP: 'holdandclap',
    FINISH: 'finish',
    ENDLESS: 'endless',
};

// dive speed constants in BPM
export const Tempo = {
    SLOW: 30,  // matches SLOW in Diving.js
    MEDIUM: 60, // matches MED in Diving.js
    FAST: 90,  // matches FAST in Diving.js
};


export function createRESTTask(options = {}) {
    // set default time to 10s
    if (!options.time) {
        options.time = 10
    }

    // timeLimit is same as time for rest tasks
    if (!options.timeLimit) {
        options.timeLimit = options.time
    }
    // Select audio event based on rest type
    if (!options.audio) {
        options.audio = options.useBall ? 'Rest.REST_BALL' : 'Rest.REST'
    }

    return {
        ...options,
        type: options.useBall ? TaskType.REST_BALL : TaskType.REST,
        desc: options.desc || (options.useBall ? "rest with ball" : "rest"),
        ballsBonus: options.ballsBonus ?? false
    }
}

export function createFINISHTask(options = {}) {
    if (!options.time) {
        options.time = 15
    }
    // timeLimit is same as time for finish tasks
    if (!options.timeLimit) {
        options.timeLimit = options.time
    }
    // Select audio event based on rest type
    if (!options.audio) {
        options.audio = 'Finish.CLEAN'
    }
    return {
        ...options,
        type: TaskType.FINISH,
        desc: options.desc || "Clean up"
    }
}

/** Hold - defaults to time:10 repeat:1 targetDepth:1 */
export function createHOLDTask(options = {}) {

    // set default targetDepth to 1
    if (!options.targetDepth) {
        options.targetDepth = 1
    }
    // set default repeat to 1
    if (!options.repeat) {
        options.repeat = 1
    }
    // set default time to 10
    if (!options.time) {
        options.time = 10
    }
    // calculate time limit based on depth and repeat if we don't have one
    if (!options.timeLimit) {
        options.timeLimit = (10 + options.repeat * (options.time + 5))
    }

    // Convert numeric depth to word format (1->ONE, 2->TWO, etc.)
    const depthWords = {
        1: 'ONE',
        2: 'TWO',
        3: 'THREE',
        4: 'FOUR'
    }
    const wordKey = depthWords[options.targetDepth] || 'ONE'

    // Select audio event based on depth (HOLD_0 to HOLD_4), fallback to HOLD_1 if not found
    if (!options.audio) {
        options.audio = `Hold.${wordKey}`
    }

    // Add halfway audio based on depth
    options.audioHalfway = `Hold.${wordKey}_HALF`

    // Add three-quarter audio based on depth for long holds
    options.audioThreeQuarter = `Hold.${wordKey}_3Q`

    return {
        ...options,
        type: TaskType.HOLDPOSITION,
        desc: options.desc || "worship",
    }
}

/** HitDepth - defaults to targetDepth:4 repeat:1 */
export function createHITTask(options = {}) {
    // set default targetDepth to 4
    if (!options.targetDepth) {
        options.targetDepth = 4
    }
    // set default repeat to 5
    if (!options.repeat) {
        options.repeat = 1
    }
    // calculate time limit based on repeats if we don't have one
    if (!options.timeLimit) {
        // for level 4, use a multiple of 15s with a max of 90s
        // for level 3, use a multiple of 10s with a max of 60s
        if (options.targetDepth === 4) {
            options.timeLimit = Math.min(options.repeat * 15, 90)
        } else if (options.targetDepth === 3) {
            options.timeLimit = Math.min(options.repeat * 10, 60)
        } else {
            options.timeLimit = Math.min(options.repeat * 5, 60)
        }
    }
    // Select audio event based on depth (HIT_2 to HIT_4), fallback to HIT_4 if not found
    if (!options.audio) {
        // Convert numeric depth to word format (1->ONE, 2->TWO, etc.)
        const depthWords = {
            1: 'ONE',
            2: 'TWO',
            3: 'THREE',
            4: 'FOUR'
        }
        const wordKey = depthWords[options.targetDepth] || 'FOUR'
        options.audio = `Hit.${wordKey}`
    }

    return {
        ...options,
        type: TaskType.HITDEPTH,
        desc: options.desc || "hit that depth"
    }
}

/** UpAndDown - defaults to minDepth:1 maxDepth:2 tempo:SLOW time:30 */
export function createUPANDDOWNTask(options = {}) {
    // set default depths
    if (!options.minDepth) {
        options.minDepth = 1
    }
    if (!options.maxDepth) {
        options.maxDepth = 2
    }
    // ensure maxDepth doesn't exceed 4
    options.maxDepth = Math.min(options.maxDepth, 4)

    // set default tempo to SLOW
    if (!options.tempo) {
        options.tempo = Tempo.SLOW
    }

    // default is 30s
    if (!options.timeLimit) {
        options.timeLimit = 30
    }

    // Select audio based on maxDepth and tempo
    if (!options.audio) {
        const tempoMap = {
            [Tempo.SLOW]: 'SLOW',
            [Tempo.MEDIUM]: 'MED',
            [Tempo.FAST]: 'FAST'
        }

        const tempoKey = tempoMap[options.tempo] || 'SLOW'

        // Convert numeric depth to word format (1->ONE, 2->TWO, etc.)
        const depthWords = {
            1: 'ONE',
            2: 'TWO',
            3: 'THREE',
            4: 'FOUR'
        }
        const wordKeyStart = depthWords[options.minDepth] || 'ONE'
        const wordKeyEND = depthWords[options.maxDepth] || 'TWO'

        const key = `${wordKeyStart}_${wordKeyEND}_${tempoKey}`
        options.audio = AUDIO.UpDown[key] ? `UpDown.${key}` : 'UpDown.MED'
    }

    return {
        ...options,
        type: TaskType.UPANDDOWN,
        desc: options.desc || "dive"
    }
}

/** HoldAndClap - defaults to targetDepth:1 claps:3 repeat:3 */
export function createHOLDANDCLAPTask(options = {}) {
    if (!options.targetDepth) options.targetDepth = 1
    if (!options.claps) options.claps = 3
    if (!options.repeat) options.repeat = 3
    if (!options.timeLimit) {
        options.timeLimit = 10 + options.repeat * (options.claps * 3 + 5)
    }
    const depthWords = { 1: 'ONE', 2: 'TWO', 3: 'THREE', 4: 'FOUR' }
    const wordKey = depthWords[options.targetDepth] || 'ONE'
    if (!options.audio) {
        options.audio = `HoldAndClap.${wordKey}`
    }
    return {
        ...options,
        type: TaskType.HOLDANDCLAP,
        desc: options.desc || "hold and clap",
    }
}

/** Clap - defaults to repeat:3 timeLimit:30 */
export function createCLAPTask(options = {}) {
    // set default repeat to 3
    if (!options.repeat) {
        options.repeat = 3
    }
    // calculate time limit based on repeats if we don't have one
    if (!options.timeLimit) {
        // give roughly 3 seconds per clap needed
        options.timeLimit = Math.max(options.repeat * 3, 30)
    }

    // Select audio event
    if (!options.audio) {
        options.audio = 'Clap.FACE'
    }

    return {
        ...options,
        type: TaskType.CLAP,
        desc: options.desc || "clap"
    }
}

/** Clap - defaults to repeat:3 timeLimit:30 */
export function createENDLESSTask(options = {}) {
    // set default repeat to 3
    if (!options.repeat) {
        options.repeat = 3
    }
    // calculate time limit based on repeats if we don't have one
    if (!options.timeLimit) {
        // give roughly 3 seconds per clap needed
        options.timeLimit = 999
    }

    // Select audio event
    if (!options.audio) {
        options.audio = 'Endless.ENDLESS'
    }

    return {
        ...options,
        type: TaskType.ENDLESS,
        desc: options.desc || "endless"
    }
}

// Function to generate a random task
export const generateRandomTask = () => {
    const taskTypes = [TaskType.HOLDPOSITION, TaskType.UPANDDOWN, TaskType.REST, TaskType.REST_BALL];
    const randomTaskType = taskTypes[Math.floor(Math.random() * taskTypes.length)];

    let randomTask = { type: randomTaskType };

    if (randomTaskType === TaskType.HOLDPOSITION) {
        randomTask.targetDepth = Math.floor(Math.random() * 4) + 1; // random target depth (1-4)
    } else if (randomTaskType === TaskType.UPANDDOWN) {
        const max = Math.floor(Math.random() * 4) + 1;
        randomTask.minDepth = 1;
        randomTask.maxDepth = max;
    }

    return randomTask;
};

export const getTempoString = (tempoState) => {
    switch (tempoState) {
        case Tempo.SLOW:
            return 'slow';
        case Tempo.MEDIUM:
            return 'medium';
        case Tempo.FAST:
            return 'fast';
        default:
            return 'unknown';
    }
}

// Get tempo state (SLOW/MEDIUM/FAST)
export function getTempoState(tempo) {
    // get midpoint between MED and SLOW
    const midTempo = (Tempo.MEDIUM + Tempo.SLOW) / 2;
    if (tempo < midTempo) {
        return 'SLOW';
    }
    // get midpoint between MED and FAST
    const fastTempo = (Tempo.MEDIUM + Tempo.FAST) / 2;
    if (tempo > fastTempo) {
        return 'FAST';
    }
    return 'MEDIUM';
}


/**
 * Calculate the total duration of a level based on its tasks
 * @param {Array} tasks - Array of tasks in a level
 * @returns {string} - Duration as a string in the format "X min"
 */
export const calculateLevelDuration = (tasks, tenSecond = false) => {
    if (!tasks || tasks.length === 0) return "0 min"

    // Sum up all the timeLimit values
    const totalSeconds = tasks.reduce((sum, task) => {
        // Use timeLimit if available, otherwise fallback to time
        let taskDuration = task.timeLimit || task.time || 0
        if (task.type === TaskType.HOLDANDCLAP && !taskDuration) {
            taskDuration = 10 + (task.repeat || 3) * ((task.claps || 3) * 3 + 5)
        }
        return sum + taskDuration
    }, 0)

    // Floor to nearest 10 seconds if requested
    const adjustedSeconds = tenSecond ? Math.floor(totalSeconds / 10) * 10 : totalSeconds

    // Convert to minutes and seconds
    const minutes = Math.floor(adjustedSeconds / 60)
    const seconds = adjustedSeconds % 60

    // Format output
    if (tenSecond && seconds > 0) {
        return `${minutes} min, ${seconds}s`
    }
    return `${minutes} min`
}

export const getTaskSummary = (task) => {
    switch (task.type) {
        case TaskType.HITDEPTH:
            return `Hit depth ${task.targetDepth} x${task.repeat}`
        case TaskType.HOLDPOSITION:
            return `Hold depth ${task.targetDepth} for ${task.time}s x${task.repeat}`
        case TaskType.UPANDDOWN:
            const tempoName = task.tempo === Tempo.SLOW ? 'slow' :
                task.tempo === Tempo.FAST ? 'fast' : 'medium'
            return `Dive ${task.minDepth}-${task.maxDepth} for ${task.timeLimit}s at ${tempoName}`
        case TaskType.REST:
        case TaskType.REST_BALL:
            return `Rest for ${task.timeLimit}s${task.ballsBonus ? ' (balls bonus)' : ''}`
        case TaskType.CLAP:
            return `Clap ${task.repeat} times`
        case TaskType.HOLDANDCLAP:
            return `Hold depth ${task.targetDepth}, clap ${task.claps} x${task.repeat}`
        case TaskType.ENDLESS:
            return `Endless for ${task.timeLimit || 999}s`
        default:
            return task.type
    }
}