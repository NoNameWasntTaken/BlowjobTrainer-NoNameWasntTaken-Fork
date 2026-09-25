import { TaskType, Tempo, createHOLDTask, createUPANDDOWNTask, createRESTTask, createHITTask, createCLAPTask, createFINISHTask } from "../Tasks/task";
import { AUDIO } from "../Tasks/audio";

/** Baseline session-end lines (per-level overrides in next step). Disqualified / early cancel: no summary key — no audio. */
const BASELINE_SUMMARY_AUDIO = Object.freeze({
    failed: AUDIO.Rank.END_BAD,
    apprentice: AUDIO.Rank.END_PASS,
    journeyman: AUDIO.Rank.END_GOOD,
    master: AUDIO.Rank.END_PERFECT,
});

/** Softer failed / perfect lines for levels with `soft: true`. */
const SOFT_SUMMARY_AUDIO = Object.freeze({
    failed: AUDIO.Rank.END_BAD_SOFT,
    apprentice: AUDIO.Rank.END_PASS,
    journeyman: AUDIO.Rank.END_GOOD,
    master: AUDIO.Rank.END_PERFECT_SOFT,
});

export const levels = [
    // {
    //     id: 'test',
    //     order: -1,
    //     title: 'Test Setup',
    //     image: 'https://via.placeholder.com/200',
    //     description: 'Short simple session to test the calibration',
    //     tasks: [
    //         { type: TaskType.GETREADY, audio: 'Level.BEGINT_1_START', desc: "get ready", time: 3, timeLimit: 10 },
    //         createCLAPTask({ repeat: 20 }),
    //         createCLAPTask({ repeat: 12, audio: 'Clap.BELOW' }),
    //         // createHITTask({ targetDepth: 2, time: 1, repeat: 2 }),
    //         // createHITTask({ targetDepth: 3, repeat: 2 }),
    //         // createHITTask({ targetDepth: 2, time: 1, repeat: 100 }),
    //         // createHOLDTask({ targetDepth: 2, time: 2, repeat: 2 }),
    //         // createHOLDTask({ targetDepth: 2, time: 2, repeat: 2 }),
    //         // createHOLDTask({ targetDepth: 3, time: 15, repeat: 2 }),
    //         // createHOLDTask({ targetDepth: 4, time: 8, repeat: 2 }),
    //         // createCLAPTask({ repeat: 99, timeLimit: 999 }),
    //         // createUPANDDOWNTask({ minDepth: 1, maxDepth: 2, tempo: Tempo.SLOW, timeLimit: 1000 }),
    //         // createUPANDDOWNTask({ minDepth: 2, maxDepth: 3, tempo: Tempo.SLOW, timeLimit: 1000 }),
    //         // createUPANDDOWNTask({ minDepth: 3, maxDepth: 4, tempo: Tempo.SLOW, timeLimit: 1000 }),
    //         // createUPANDDOWNTask({ minDepth: 1, maxDepth: 4, tempo: Tempo.SLOW, timeLimit: 1000 }),
    //         // createCLAPTask({ repeat: 99, timeLimit: 999 }),
    //         // createHOLDTask({ targetDepth: 1, time: 5, repeat: 2 }),
    //         // createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.SLOW, audio: 'UpDown.ONE_THREE_SLOW', timeLimit: 20 }),
    //         // createHITTask({ targetDepth: 4, repeat: 2 }),
    //         // createRESTTask({ audio: 'Rest.REST', timeLimit: 8 }),
    //         // createHOLDTask({ targetDepth: 3, time: 10, repeat: 2, timeLimit: 15 }),
    //         createFINISHTask({}),
    //     ]
    // },

    // {
    //     id: 'test',
    //     order: -1,
    //     title: 'Test Endless Setup',
    //     image: 'https://via.placeholder.com/200',
    //     description: 'Test endless mode',
    //     tasks: [
    //         { type: TaskType.GETREADY, audio: 'Level.BEGINT_1_START', desc: "get ready", time: 3, timeLimit: 10 },
    //         createHOLDTask({ targetDepth: 1, time: 5, repeat: 3 }),
    //         createHOLDTask({ targetDepth: 4, time: 8, repeat: 3 }),
    //         createHITTask({ targetDepth: 4, repeat: 10, audio: 'Warmup.HIT_FOUR' }),
    //         createUPANDDOWNTask({ minDepth: 1, maxDepth: 4, tempo: Tempo.SLOW, timeLimit: 1000 }),
    //         createENDLESSTask({}),
    //         createFINISHTask({}),
    //     ]
    // },

    // Beginner Training 
    // A beginner-friendly session focusing on shallow depths and basic techniques
    {
        id: 'begint',
        order: 1,
        title: 'Beginner Training',
        image: 'https://via.placeholder.com/200',
        description: 'A beginner-friendly session focusing on shallow depths and basic techniques',
        summaryAudio: {
            failed: AUDIO.Rank.BEGINT_1_END_BAD,
            apprentice: AUDIO.Rank.END_PASS,
            journeyman: AUDIO.Rank.BEGINT_1_END_GOOD,
            master: AUDIO.Rank.BEGINT_1_END_PERFECT,
        },
        soft: true,
        tasks: [
            { type: TaskType.GETREADY, audio: 'Level.BEGINT_1_START', desc: "get ready", time: 15, timeLimit: 15 },
            createHOLDTask({ targetDepth: 1, time: 5, repeat: 3 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 10 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 2, tempo: Tempo.SLOW, audio: 'UpDown.ONE_TWO_SLOW', timeLimit: 60 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 10 }),
            createHITTask({ targetDepth: 2, repeat: 5 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 10 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.SLOW, timeLimit: 60 }),
            createRESTTask({ audio: 'Rest.REST_BALL', timeLimit: 15 }),
            createHOLDTask({ targetDepth: 2, time: 10, repeat: 3, timeLimit: 45 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 10 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.MEDIUM, timeLimit: 60 }),
            createHOLDTask({ targetDepth: 3, time: 5, repeat: 2, timeLimit: 30 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 2, tempo: Tempo.MEDIUM, audio: 'Release.PRE_RELEASE', timeLimit: 30 }),
            createHOLDTask({ targetDepth: 1, time: 10, repeat: 1, audio: 'Release.POST_RELEASE' }),
            createFINISHTask({}),
        ]
    },

    // Quick Blow and Go (Existing)
    // A quick blow and go session, nothing too heavy, perfect for building initial confidence
    {
        id: 'quickbg',
        order: 2,
        title: 'Quick Blow and Go',
        image: 'https://via.placeholder.com/200',
        description: 'A quick blow and go session, nothing too heavy',
        summaryAudio: {
            failed: AUDIO.Rank.QUICKBG_2_END_BAD,
            apprentice: AUDIO.Rank.END_PASS,
            journeyman: AUDIO.Rank.QUICKBG_2_END_GOOD,
            master: AUDIO.Rank.QUICKBG_2_END_PERFECT,
        },
        soft: true,
        tasks: [
            { type: TaskType.GETREADY, audio: 'Level.QUICKBG_2_START', desc: "get ready", timeLimit: 10 },
            createHOLDTask({ targetDepth: 1, time: 10, repeat: 3 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 2, tempo: Tempo.SLOW, audio: 'UpDown.SLOW', timeLimit: 45 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 15 }),
            createHITTask({ targetDepth: 3, repeat: 10, audio: 'Warmup.HIT_THREE' }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.MEDIUM, audio: 'UpDown.ONE_THREE_MEDIUM', timeLimit: 30 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.FAST, audio: 'UpDown.ONE_THREE_FAST', timeLimit: 30 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 10 }),
            createHITTask({ targetDepth: 4, repeat: 4, audio: 'Warmup.HIT_FOUR' }),
            createRESTTask({ audio: 'Rest.SHORT_REST', timeLimit: 5 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.FAST, audio: 'UpDown.ONE_THREE_FAST', timeLimit: 20 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.FAST, audio: 'Release.PRE_RELEASE', timeLimit: 20 }),
            createHOLDTask({ targetDepth: 1, time: 15, audio: 'Release.POST_RELEASE', repeat: 1 }),
            createFINISHTask({}),
        ]
    },

    // Rhythm Basics
    // Focus on developing consistent rhythm and timing at shallow depths
    // Perfect for mastering the fundamentals of controlled movement
    {
        id: 'basicr',
        order: 3,
        title: 'Suck Basics',
        image: 'https://via.placeholder.com/200',
        description: 'Focus on developing consistent rhythm and timing at easier depths.',
        summaryAudio: { ...SOFT_SUMMARY_AUDIO },
        soft: true,
        tasks: [
            { type: TaskType.GETREADY, audio: 'Level.BASICR_3_START', desc: "get ready", timeLimit: 15 },
            // Start with basic holds to warm up
            createHOLDTask({ targetDepth: 1, time: 8, repeat: 3 }),
            createRESTTask({ audio: 'Rest.SHORT_REST', timeLimit: 5 }),
            // Introduce slow, controlled movements
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 2, tempo: Tempo.SLOW, timeLimit: 45 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 10 }),
            // Practice consistent depth hits
            createHITTask({ targetDepth: 2, repeat: 5 }),
            createRESTTask({ audio: 'Rest.SHORT_REST', timeLimit: 5 }),
            // Medium tempo practice
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 2, tempo: Tempo.MEDIUM, timeLimit: 45 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 10 }),
            // Hold practice at depth 2
            createHOLDTask({ targetDepth: 2, time: 10, repeat: 3 }),
            createRESTTask({ audio: 'Rest.SHORT_REST', timeLimit: 5 }),
            // Hold practice at depth 2
            createHOLDTask({ targetDepth: 3, time: 4, repeat: 4, audio: 'Warmup.HOLD_THREE' }),
            createRESTTask({ audio: 'Rest.SHORT_REST', timeLimit: 5 }),
            // Faster rhythm practice
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 2, tempo: Tempo.FAST, timeLimit: 30 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 10 }),
            // fast at deeper 
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.FAST, timeLimit: 30 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.MEDIUM, timeLimit: 30, audio: 'Release.BASICR_3_PRE_RELEASE' }),
            // Cool down with controlled movements
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 2, tempo: Tempo.MEDIUM, timeLimit: 15, audio: 'Release.BASICR_3_POST_RELEASE' }),
            createRESTTask({ audio: 'Release.POST_RELEASE_ZERO', timeLimit: 15 }),
            createFINISHTask({}),
        ]
    },

    // 4 - worship 101
    // A longer slow session, no dep throats, but be get comfy on your knees
    {
        id: 'dive101',
        order: 4,
        title: 'Cock Worship 101',
        image: 'https://via.placeholder.com/200',
        description: 'A longer slow session, no deep throats, but get comfy on your knees',
        summaryAudio: {
            ...SOFT_SUMMARY_AUDIO,
            master: AUDIO.Rank.COCKW_4_END_PERFECT,
        },
        soft: true,
        tasks: [
            { type: TaskType.GETREADY, audio: 'Level.COCKW_4_START', desc: "get ready", timeLimit: 15 },
            // Warm up with shallow holds
            createHOLDTask({ targetDepth: 2, time: 6, repeat: 6 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 10 }),
            // Gradual depth increase
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 2, tempo: Tempo.SLOW, timeLimit: 60 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 10 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 2, tempo: Tempo.MEDIUM, timeLimit: 60 }),
            // Practice depth control
            createHOLDTask({ targetDepth: 1, time: 20, repeat: 1 }),
            createRESTTask({ audio: 'Rest.SHORT_REST', timeLimit: 10 }),
            createHOLDTask({ targetDepth: 2, time: 10, repeat: 2 }),
            createRESTTask({ audio: 'Rest.SHORT_REST', timeLimit: 10 }),
            createHOLDTask({ targetDepth: 3, time: 5, repeat: 4 }),
            // Sustained practice at depth 2
            createRESTTask({ audio: 'Rest.REST', timeLimit: 15 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 2, tempo: Tempo.MEDIUM, timeLimit: 45 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 15 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 2, tempo: Tempo.FAST, timeLimit: 45 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 15 }),
            // Introduce depth 3
            createHITTask({ targetDepth: 3, repeat: 10 }),
            // Mix of depths
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.SLOW, timeLimit: 60 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 15 }),
            // Endurance building
            createHOLDTask({ targetDepth: 3, time: 12, repeat: 4 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 15 }),
            // Cool down phase
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.MEDIUM, timeLimit: 30, audio: 'Release.COCKW_4_PRE_RELEASE_1' }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.MEDIUM, timeLimit: 15, audio: 'Release.COCKW_4_PRE_RELEASE_2' }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.MEDIUM, timeLimit: 15, audio: 'Release.COCKW_4_PRE_RELEASE_3' }),
            createRESTTask({ audio: 'Release.COCKW_4_POST_RELEASE', timeLimit: 15 }),
            createFINISHTask({}),
        ]
    },

    // 5 - Intermediate Challenge (Existing)
    // Step up your training with more challenging depths and tempos
    {
        id: 'intmed',
        order: 5,
        title: 'Intermediate Challenge',
        image: 'https://via.placeholder.com/200',
        description: 'Step up your training slut with more challenging depths and tempos',
        summaryAudio: { ...BASELINE_SUMMARY_AUDIO },
        tasks: [
            // intro
            { type: TaskType.GETREADY, audio: 'Level.INTMED_5_START', desc: "get ready", time: 15, timeLimit: 15 },
            createHOLDTask({ targetDepth: 2, time: 5, repeat: 4 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 2, tempo: Tempo.MEDIUM, timeLimit: 45 }),
            createRESTTask({ audio: 'Rest.SHORT_REST', timeLimit: 5 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 2, tempo: Tempo.MEDIUM, timeLimit: 30 }),
            createHITTask({ targetDepth: 3, repeat: 6, audio: 'Warmup.HIT_THREE' }),
            createRESTTask({ audio: 'Rest.REST_BALL', timeLimit: 10 }),
            // down to throat
            createHOLDTask({ targetDepth: 3, time: 8, repeat: 4, audio: 'Hold.THREE' }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.MEDIUM, timeLimit: 30 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.FAST, timeLimit: 30 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 10 }),
            // deep
            createHITTask({ targetDepth: 4, repeat: 4, audio: 'Warmup.HIT_FOUR' }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 10 }),
            // again
            createHITTask({ targetDepth: 4, repeat: 4, audio: 'Hit.FOUR' }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 10 }),
            // new task!
            createCLAPTask({ repeat: 12 }),
            // createCLAPTask({ repeat: 12, audio: 'Clap.BELOW' }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 4, tempo: Tempo.SLOW, timeLimit: 30 }),
            createRESTTask({ audio: 'Rest.SHORT_REST', timeLimit: 5 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.FAST, timeLimit: 30 }),
            createRESTTask({ audio: 'Rest.REST_BALL', timeLimit: 20 }),
            // deeper challenge
            createUPANDDOWNTask({ minDepth: 2, maxDepth: 3, tempo: Tempo.MEDIUM, timeLimit: 30 }),
            createUPANDDOWNTask({ minDepth: 3, maxDepth: 3, tempo: Tempo.FAST, timeLimit: 30 }),
            createCLAPTask({ repeat: 12 }),
            createRESTTask({ audio: 'Rest.REST_BALL', timeLimit: 20 }),
            // finale time
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.FAST, timeLimit: 30 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.FAST, audio: 'Release.PRE_RELEASE', timeLimit: 15 }),
            createHOLDTask({ targetDepth: 2, time: 15, repeat: 1, audio: 'Release.POST_RELEASE' }),
            createFINISHTask({}),
        ]
    },

    // 6 - Endurance Builder
    {
        id: 'endurance',
        order: 6,
        title: 'Endurance Builder',
        image: 'https://via.placeholder.com/200',
        description: 'Longer session for true sluts, this is why it\'s called a blowjob!',
        summaryAudio: { ...BASELINE_SUMMARY_AUDIO },
        tasks: [
            { type: TaskType.GETREADY, audio: 'Level.ENDURANCE_6_START', desc: "get ready", timeLimit: 15 },
            // Warm up phase
            createHOLDTask({ targetDepth: 2, time: 8, repeat: 4 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 2, tempo: Tempo.SLOW, timeLimit: 60 }),
            createRESTTask({ audio: 'Rest.SHORT_REST', timeLimit: 10 }),
            // Building phase
            createHOLDTask({ targetDepth: 3, time: 12, repeat: 4 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.MEDIUM, timeLimit: 90 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 15 }),
            createCLAPTask({ repeat: 20, audio: 'Clap.BELOW' }),
            // Endurance challenge
            createHOLDTask({ targetDepth: 2, time: 20, repeat: 3 }),
            createRESTTask({ audio: 'Rest.REST_BALL', timeLimit: 20 }),
            createUPANDDOWNTask({ minDepth: 2, maxDepth: 3, tempo: Tempo.MEDIUM, timeLimit: 90 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 15 }),
            // Stamina building
            createHITTask({ targetDepth: 3, repeat: 15 }),
            createRESTTask({ audio: 'Rest.SHORT_REST', timeLimit: 10 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.MEDIUM, timeLimit: 60 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 15 }),
            // Deep challenge
            createCLAPTask({ repeat: 10 }),
            createHOLDTask({ targetDepth: 4, time: 4, repeat: 6, audio: 'Warmup.HOLD_FOUR' }),
            createUPANDDOWNTask({ minDepth: 2, maxDepth: 4, tempo: Tempo.SLOW, timeLimit: 60 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 20 }),
            // Final push
            createCLAPTask({ repeat: 20, audio: 'Clap.BELOW' }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.FAST, timeLimit: 45 }),
            createHOLDTask({ targetDepth: 3, time: 15, repeat: 2 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.MEDIUM, timeLimit: 30 }),
            // Final sequence
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.MEDIUM, timeLimit: 30 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.MEDIUM, audio: 'Release.PRE_RELEASE', timeLimit: 15 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.SLOW, audio: 'Release.POST_RELEASE', timeLimit: 15 }),
            createFINISHTask({}),
        ]
    },

    // 7 - Deep Focus
    {
        id: 'deepfocus',
        order: 7,
        title: 'Deep Focus',
        image: 'https://via.placeholder.com/200',
        description: 'Specialized training focusing on training that throat with extended holds',
        summaryAudio: { ...BASELINE_SUMMARY_AUDIO },
        tasks: [
            { type: TaskType.GETREADY, audio: 'Level.DEEPFOCUS_7_START', desc: "get ready", timeLimit: 15 },
            // Initial warm-up
            createHOLDTask({ targetDepth: 2, time: 10, repeat: 3 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.SLOW, timeLimit: 45 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 15 }),
            // Deep preparation
            createHITTask({ targetDepth: 4, repeat: 8 }),
            createRESTTask({ audio: 'Rest.REST_BALL', timeLimit: 20 }),
            // Deep work
            createHOLDTask({ targetDepth: 4, time: 4, repeat: 6 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 20 }),
            createUPANDDOWNTask({ minDepth: 2, maxDepth: 4, tempo: Tempo.SLOW, timeLimit: 45 }),
            createRESTTask({ audio: 'Rest.REST_BALL', timeLimit: 20 }),
            // Sustained deep practice
            createHOLDTask({ targetDepth: 4, time: 6, repeat: 6 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 15 }),
            createCLAPTask({ repeat: 10 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 4, tempo: Tempo.SLOW, timeLimit: 45 }),
            createHOLDTask({ targetDepth: 4, time: 12, repeat: 1 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 20 }),
            // Deep rhythm work
            createUPANDDOWNTask({ minDepth: 2, maxDepth: 4, tempo: Tempo.MEDIUM, timeLimit: 45 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 15 }),
            // Cool down
            createUPANDDOWNTask({ minDepth: 2, maxDepth: 3, tempo: Tempo.MEDIUM, timeLimit: 60 }),
            createUPANDDOWNTask({ minDepth: 2, maxDepth: 3, tempo: Tempo.MEDIUM, timeLimit: 15, audio: 'Release.PRE_RELEASE' }),
            createHOLDTask({ targetDepth: 4, time: 6, repeat: 1, audio: 'Release.POST_RELEASE_FOUR' }),
            // finish
            createFINISHTask({}),
        ]
    },

    // 8 - Speed Training
    {
        id: 'speed',
        order: 8,
        title: 'Face Fucking',
        image: 'https://via.placeholder.com/200',
        description: 'Fast-paced session, hard and fast for when he wants to use your mouth',
        summaryAudio: { ...BASELINE_SUMMARY_AUDIO },
        tasks: [
            { type: TaskType.GETREADY, audio: 'Level.SPEED_8_START', desc: "get ready", timeLimit: 10 },
            // Quick warm-up
            createCLAPTask({ repeat: 10 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 2, tempo: Tempo.FAST, timeLimit: 30 }),
            createHOLDTask({ targetDepth: 2, time: 5, repeat: 3 }),
            createRESTTask({ audio: 'Rest.SHORT_REST', timeLimit: 5 }),
            // Speed drills
            createHITTask({ targetDepth: 3, repeat: 12 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.FAST, timeLimit: 45 }),
            createRESTTask({ audio: 'Rest.SHORT_REST', timeLimit: 5 }),
            // Rapid depth changes
            createCLAPTask({ repeat: 15 }),
            createUPANDDOWNTask({ minDepth: 2, maxDepth: 3, tempo: Tempo.FAST, timeLimit: 30 }),
            createRESTTask({ audio: 'Rest.SHORT_REST', timeLimit: 5 }),
            // Intensity building
            createHITTask({ targetDepth: 4, repeat: 8 }),
            createUPANDDOWNTask({ minDepth: 2, maxDepth: 4, tempo: Tempo.FAST, timeLimit: 30 }),
            createRESTTask({ audio: 'Rest.SHORT_REST', timeLimit: 5 }),
            // Final sprint
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.FAST, timeLimit: 45 }),
            createCLAPTask({ repeat: 10 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.FAST, timeLimit: 20 }),
            // Final sequence
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.FAST, timeLimit: 30 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.FAST, audio: 'Release.PRE_RELEASE', timeLimit: 15 }),
            createRESTTask({ audio: 'Release.POST_RELEASE_ZERO', timeLimit: 15 }),
            createFINISHTask({}),
        ]
    },

    // 9 - Diver devotion
    {
        id: 'devotion',
        order: 9,
        title: 'Cock Devotion',
        image: 'https://via.placeholder.com/200',
        description: 'Longer session with some deepthroat holds and lots of sucking.',
        summaryAudio: { ...BASELINE_SUMMARY_AUDIO },
        tasks: [
            { type: TaskType.GETREADY, audio: 'Level.DEVOTION_9_START', desc: "get ready", timeLimit: 15 },
            // Warm up phase
            createCLAPTask({ repeat: 12 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 2, tempo: Tempo.MEDIUM, timeLimit: 45 }),
            createRESTTask({ audio: 'Rest.SHORT_REST', timeLimit: 10 }),
            // Building phase
            createHOLDTask({ targetDepth: 3, time: 8, repeat: 4 }),
            createUPANDDOWNTask({ minDepth: 2, maxDepth: 3, tempo: Tempo.MEDIUM, timeLimit: 60 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 15 }),
            // Deep work
            createHITTask({ targetDepth: 4, repeat: 6 }),
            createHOLDTask({ targetDepth: 4, time: 4, repeat: 4, audio: 'Warmup.HOLD_FOUR' }),
            createRESTTask({ audio: 'Rest.REST_BALL', timeLimit: 20 }),
            // Rhythm section
            createUPANDDOWNTask({ minDepth: 2, maxDepth: 4, tempo: Tempo.SLOW, timeLimit: 60 }),
            createCLAPTask({ repeat: 10, audio: 'Clap.BELOW' }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 15 }),
            // Endurance building
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.MEDIUM, timeLimit: 90 }),
            createHOLDTask({ targetDepth: 4, time: 6, repeat: 4 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 20 }),
            // Deep challenge
            createUPANDDOWNTask({ minDepth: 2, maxDepth: 4, tempo: Tempo.MEDIUM, timeLimit: 45 }),
            createHOLDTask({ targetDepth: 4, time: 8, repeat: 3 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 15 }),
            // Final sequence
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.MEDIUM, timeLimit: 30 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.MEDIUM, audio: 'Release.PRE_RELEASE', timeLimit: 15 }),
            createHOLDTask({ targetDepth: 2, time: 15, repeat: 1, audio: 'Release.POST_RELEASE' }),
            createFINISHTask({}),
        ]
    },

    // 10 - Max Depth Master
    {
        id: 'maxdepth',
        order: 10,
        title: 'Deepthroat Master',
        image: 'https://via.placeholder.com/200',
        description: 'Focused deepthroat training, expect gagging and choking while you are used.',
        summaryAudio: { ...BASELINE_SUMMARY_AUDIO },
        tasks: [
            { type: TaskType.GETREADY, audio: 'Level.MAXDEPTH_10_START', desc: "get ready", timeLimit: 15 },
            // Initial warm-up
            createCLAPTask({ repeat: 10 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 2, tempo: Tempo.MEDIUM, timeLimit: 45 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 15 }),
            // Depth progression
            createHOLDTask({ targetDepth: 3, time: 6, repeat: 4 }),
            createUPANDDOWNTask({ minDepth: 2, maxDepth: 3, tempo: Tempo.SLOW, timeLimit: 45 }),
            createRESTTask({ audio: 'Rest.REST_BALL', timeLimit: 20 }),
            // Max depth preparation
            createHITTask({ targetDepth: 4, repeat: 6, audio: 'Warmup.HIT_FOUR' }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 15 }),
            // Deep work phase 1
            createHOLDTask({ targetDepth: 4, time: 4, repeat: 6 }),
            createUPANDDOWNTask({ minDepth: 2, maxDepth: 4, tempo: Tempo.SLOW, timeLimit: 45 }),
            createRESTTask({ audio: 'Rest.REST_BALL', timeLimit: 20 }),
            // Deep work phase 2
            createHOLDTask({ targetDepth: 4, time: 6, repeat: 4 }),
            createCLAPTask({ repeat: 8 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 20 }),
            // Max depth challenge
            createHOLDTask({ targetDepth: 4, time: 8, repeat: 3 }),
            createUPANDDOWNTask({ minDepth: 3, maxDepth: 4, tempo: Tempo.SLOW, timeLimit: 30 }),
            createRESTTask({ audio: 'Rest.REST_BALL', timeLimit: 20 }),
            // Cool down
            createUPANDDOWNTask({ minDepth: 3, maxDepth: 4, tempo: Tempo.MEDIUM, timeLimit: 45 }),
            createHOLDTask({ targetDepth: 2, time: 10, repeat: 2 }),
            // Final sequence
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.MEDIUM, timeLimit: 30 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.MEDIUM, audio: 'Release.PRE_RELEASE', timeLimit: 15 }),
            createHOLDTask({ targetDepth: 4, time: 20, repeat: 1, audio: 'Release.POST_RELEASE_FOUR' }),
            createCLAPTask({ repeat: 10 }),
            createFINISHTask({}),
        ]
    },

    // 11 - Elite Endurance
    {
        id: 'elite',
        order: 11,
        title: 'Elite Endurance',
        image: 'https://via.placeholder.com/200',
        description: 'Extended 20-minute session, imagining two cocks using your mouth.',
        summaryAudio: { ...BASELINE_SUMMARY_AUDIO },
        tasks: [
            { type: TaskType.GETREADY, audio: 'Level.ELITE_11_START', desc: "get ready", timeLimit: 15 },
            // First phase
            createCLAPTask({ repeat: 12 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.MEDIUM, timeLimit: 60 }),
            createHOLDTask({ targetDepth: 3, time: 15, repeat: 3 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 15 }),
            createUPANDDOWNTask({ minDepth: 2, maxDepth: 4, tempo: Tempo.MEDIUM, timeLimit: 45 }),
            createHITTask({ targetDepth: 4, repeat: 4 }),
            createHOLDTask({ targetDepth: 4, time: 4, repeat: 4 }),
            createCLAPTask({ repeat: 12 }),
            createUPANDDOWNTask({ minDepth: 2, maxDepth: 3, tempo: Tempo.FAST, timeLimit: 40 }),
            createRESTTask({ audio: 'Rest.REST_BALL', timeLimit: 20 }),
            createUPANDDOWNTask({ minDepth: 2, maxDepth: 3, tempo: Tempo.FAST, timeLimit: 40 }),
            createUPANDDOWNTask({ minDepth: 2, maxDepth: 3, tempo: Tempo.FAST, timeLimit: 15, audio: 'Release.PRE_RELEASE' }),
            createRESTTask({ audio: 'Release.POST_RELEASE_ZERO', timeLimit: 15 }),
            // Midpoint checkpoint
            createFINISHTask({}),
            // Second phase
            createCLAPTask({ repeat: 10, audio: 'Clap.BELOW' }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 4, tempo: Tempo.SLOW, timeLimit: 60 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 15 }),
            createUPANDDOWNTask({ minDepth: 3, maxDepth: 4, tempo: Tempo.SLOW, timeLimit: 60 }),
            createRESTTask({ audio: 'Rest.SHORT_REST', timeLimit: 5 }),
            createUPANDDOWNTask({ minDepth: 2, maxDepth: 3, tempo: Tempo.FAST, timeLimit: 30 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 4, tempo: Tempo.MEDIUM, timeLimit: 30 }),
            createRESTTask({ audio: 'Rest.SHORT_REST', timeLimit: 5 }),
            createCLAPTask({ repeat: 10, audio: 'Clap.BELOW' }),
            createHOLDTask({ targetDepth: 4, time: 10, repeat: 4 }),
            createUPANDDOWNTask({ minDepth: 2, maxDepth: 4, tempo: Tempo.FAST, timeLimit: 45 }),
            createRESTTask({ audio: 'Rest.REST_BALL', timeLimit: 20 }),
            createHITTask({ targetDepth: 4, repeat: 8 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.FAST, timeLimit: 45 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.FAST, timeLimit: 45, audio: 'Release.PRE_RELEASE' }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 2, tempo: Tempo.SLOW, timeLimit: 30, audio: 'Release.POST_RELEASE' }),
            createFINISHTask({}),
        ]
    },

    // 12 - Many Load Challenge
    {
        id: 'manyload',
        order: 12,
        title: 'Blowbang Challenge',
        image: 'https://via.placeholder.com/200',
        description: 'Ultimate 30-minute challenge, assume your place in the world servicing cocks.',
        summaryAudio: { ...BASELINE_SUMMARY_AUDIO },
        tasks: [
            { type: TaskType.GETREADY, audio: 'Level.MANYLOAD_12_START', desc: "get ready", timeLimit: 15 },
            // Phase 1 - Speed focus
            createCLAPTask({ repeat: 15 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 2, tempo: Tempo.FAST, timeLimit: 45 }),
            createHITTask({ targetDepth: 3, repeat: 8 }),
            createRESTTask({ audio: 'Rest.SHORT_REST', timeLimit: 10 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.FAST, timeLimit: 60 }),
            createHOLDTask({ targetDepth: 3, time: 6, repeat: 4 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 15 }),
            createCLAPTask({ repeat: 15, audio: 'Clap.BELOW' }),
            createUPANDDOWNTask({ minDepth: 2, maxDepth: 3, tempo: Tempo.MEDIUM, timeLimit: 45 }),
            createHITTask({ targetDepth: 4, repeat: 8 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 15 }),
            createUPANDDOWNTask({ minDepth: 2, maxDepth: 4, tempo: Tempo.MEDIUM, timeLimit: 45 }),
            createHOLDTask({ targetDepth: 3, time: 10, repeat: 3 }),
            createCLAPTask({ repeat: 10 }),
            // Final sequence - Phase 1
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.FAST, timeLimit: 30 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.FAST, audio: 'Release.PRE_RELEASE', timeLimit: 15 }),
            createHOLDTask({ targetDepth: 2, time: 15, repeat: 1, audio: 'Release.POST_RELEASE' }),
            createFINISHTask({}),
            { type: TaskType.GETREADY, audio: 'Level.MANYLOAD_12_PHASE2', desc: "get ready", timeLimit: 15 },

            // Phase 2 - Depth focus
            createCLAPTask({ repeat: 10, audio: 'Clap.BELOW' }),
            createHOLDTask({ targetDepth: 3, time: 8, repeat: 4 }),
            createUPANDDOWNTask({ minDepth: 2, maxDepth: 3, tempo: Tempo.MEDIUM, timeLimit: 45 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 15 }),
            createHITTask({ targetDepth: 4, repeat: 10, audio: 'Warmup.HIT_FOUR' }),
            createHOLDTask({ targetDepth: 4, time: 4, repeat: 5 }),
            createRESTTask({ audio: 'Rest.REST_BALL', timeLimit: 20 }),
            createUPANDDOWNTask({ minDepth: 2, maxDepth: 4, tempo: Tempo.MEDIUM, timeLimit: 60 }),
            createCLAPTask({ repeat: 8 }),
            createHOLDTask({ targetDepth: 4, time: 6, repeat: 5 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 15 }),
            createUPANDDOWNTask({ minDepth: 3, maxDepth: 4, tempo: Tempo.SLOW, timeLimit: 45 }),
            createHOLDTask({ targetDepth: 4, time: 8, repeat: 5 }),
            createRESTTask({ audio: 'Rest.REST_BALL', timeLimit: 20 }),
            // Final sequence - Phase 2
            createUPANDDOWNTask({ minDepth: 2, maxDepth: 4, tempo: Tempo.MEDIUM, timeLimit: 45 }),
            createUPANDDOWNTask({ minDepth: 2, maxDepth: 4, tempo: Tempo.MEDIUM, audio: 'Release.PRE_RELEASE', timeLimit: 15 }),
            createUPANDDOWNTask({ minDepth: 2, maxDepth: 4, tempo: Tempo.SLOW, audio: 'Release.POST_RELEASE', timeLimit: 15 }),
            createFINISHTask({}),
            { type: TaskType.GETREADY, audio: 'Level.MANYLOAD_12_PHASE3', desc: "get ready", timeLimit: 15 },

            // Phase 3 - Endurance focus
            createCLAPTask({ repeat: 4 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.MEDIUM, timeLimit: 90 }),
            createCLAPTask({ repeat: 4 }),
            createHOLDTask({ targetDepth: 3, time: 12, repeat: 3 }),
            createCLAPTask({ repeat: 4 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 15 }),
            createCLAPTask({ repeat: 8, audio: 'Clap.BELOW' }),
            createUPANDDOWNTask({ minDepth: 2, maxDepth: 4, tempo: Tempo.MEDIUM, timeLimit: 60 }),
            createHOLDTask({ targetDepth: 4, time: 6, repeat: 4 }),
            createRESTTask({ audio: 'Rest.REST_BALL', timeLimit: 20 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.MEDIUM, timeLimit: 90 }),
            createHITTask({ targetDepth: 4, repeat: 8 }),
            createRESTTask({ audio: 'Rest.REST', timeLimit: 15 }),
            createUPANDDOWNTask({ minDepth: 2, maxDepth: 4, tempo: Tempo.MEDIUM, timeLimit: 60 }),
            createHOLDTask({ targetDepth: 3, time: 15, repeat: 2 }),
            createCLAPTask({ repeat: 8 }),
            // Final sequence - Phase 3
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.MEDIUM, timeLimit: 30 }),
            createUPANDDOWNTask({ minDepth: 1, maxDepth: 3, tempo: Tempo.MEDIUM, audio: 'Release.PRE_RELEASE', timeLimit: 15 }),
            createRESTTask({ audio: 'Release.POST_RELEASE_ZERO', timeLimit: 30 }),
            createFINISHTask({}),
            { type: TaskType.GETREADY, audio: 'Level.MANYLOAD_12_WELLDONE', desc: "", timeLimit: 15 },
        ]
    }
];