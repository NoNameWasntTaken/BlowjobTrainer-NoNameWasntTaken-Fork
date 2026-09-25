export const AUDIO_HELPER = {
    Calibration: {
        desc: 'Calibration position feedback',
        ZERO: { description: 'Calibration position zero', defaultText: 'Zero' },
        ONE: { description: 'Calibration position one', defaultText: 'One' },
        TWO: { description: 'Calibration position two', defaultText: 'Two' },
        THREE: { description: 'Calibration position three', defaultText: 'Three' },
        FOUR: { description: 'Calibration position four', defaultText: 'Four' },
        BALL: { description: 'Calibration with balls', defaultText: 'Zero' },
    },

    Feedback: {
        desc: 'General performance feedback during exercises',
        PERFECT: { description: 'Perfect performance feedback', defaultText: 'Perfect' },
        SURFACE_PENALTY_SOFT: { description: 'Stopped sucking (soft)', defaultText: 'Back to work.' },
        SURFACE_PENALTY_HARD: { description: 'Stopped sucking (hard)', defaultText: 'Back to work.' },
        TOO_FAST: { description: 'Too fast feedback', defaultText: 'Not so fast' },
        TOO_SLOW: { description: 'Too slow feedback', defaultText: 'Too slow' },
        WAY_TOO_FAST: { description: 'Way too fast feedback', defaultText: 'Way too fast' },
        WAY_TOO_SLOW: { description: 'Way too slow feedback', defaultText: 'Way too slow' },
        SHALLOW_DESCENT: { description: "Didn't suck deep enough", defaultText: 'Go deeper' },
        DEEP_DESCENT: { description: 'Sucked too deep', defaultText: 'Too deep' },
        SHALLOW_ASCENT: { description: 'Shallow ascent feedback', defaultText: 'Not so high, fill your mouth' },
        DEEP_ASCENT: { description: 'Deep ascent feedback', defaultText: 'Come further up' },
    },

    Hold: {
        desc: 'Hold position and encouragement',
        ONE: { description: 'Hold position one', defaultText: 'Hold' },
        TWO: { description: 'Hold position two', defaultText: 'Hold' },
        THREE: { description: 'Hold position three', defaultText: 'Hold' },
        FOUR: { description: 'Hold position four', defaultText: 'Hold' },
        ONE_HALF: { description: 'Halfway through hold position one', defaultText: 'Keep going' },
        TWO_HALF: { description: 'Halfway through hold position two', defaultText: 'Keep going' },
        THREE_HALF: { description: 'Halfway through hold position three', defaultText: 'Keep going' },
        FOUR_HALF: { description: 'Halfway through hold position four', defaultText: 'Keep going' },
        ONE_3Q: { description: 'Three quarters through hold position one', defaultText: 'Almost there' },
        TWO_3Q: { description: 'Three quarters through hold position two', defaultText: 'Almost there' },
        THREE_3Q: { description: 'Three quarters through hold position three', defaultText: 'Almost there' },
        FOUR_3Q: { description: 'Three quarters through hold position four', defaultText: 'Almost there' },
    },

    UpDown: {
        desc: 'Up and down movement feedback and transitions',
        SLOW: { description: 'Slow up and down movement', defaultText: 'Slow' },
        MED: { description: 'Medium speed up and down movement', defaultText: 'Medium' },
        FAST: { description: 'Fast up and down movement', defaultText: 'Fast' },
        DEEP: { description: 'Deep up and down movement', defaultText: 'Deep' },
        ONE_TWO_FAST: { description: 'Fast transition from position one to two', defaultText: 'One to two' },
        ONE_TWO_MED: { description: 'Medium speed transition from position one to two', defaultText: 'One to two' },
        ONE_TWO_SLOW: { description: 'Slow transition from position one to two', defaultText: 'One to two' },
        ONE_THREE_FAST: { description: 'Fast transition from position one to three', defaultText: 'One to three' },
        ONE_THREE_MEDIUM: { description: 'Medium speed transition from position one to three', defaultText: 'One to three' },
        ONE_THREE_SLOW: { description: 'Slow transition from position one to three', defaultText: 'One to three' },
        ONE_FOUR_FAST: { description: 'Fast transition from position one to four', defaultText: 'One to four' },
        ONE_FOUR_MEDIUM: { description: 'Medium speed transition from position one to four', defaultText: 'One to four' },
        ONE_FOUR_SLOW: { description: 'Slow transition from position one to four', defaultText: 'One to four' },
        TWO_THREE_FAST: { description: 'Fast transition from position two to three', defaultText: 'Two to three' },
        TWO_THREE_MED: { description: 'Medium speed transition from position two to three', defaultText: 'Two to three' },
        TWO_THREE_SLOW: { description: 'Slow transition from position two to three', defaultText: 'Two to three' },
        TWO_FOUR_FAST: { description: 'Fast transition from position two to four', defaultText: 'Two to four' },
        TWO_FOUR_MED: { description: 'Medium speed transition from position two to four', defaultText: 'Two to four' },
        TWO_FOUR_SLOW: { description: 'Slow transition from position two to four', defaultText: 'Two to four' },
        THREE_FOUR_FAST: { description: 'Fast transition from position three to four', defaultText: 'Three to four' },
        THREE_FOUR_MED: { description: 'Medium speed transition from position three to four', defaultText: 'Three to four' },
        THREE_FOUR_SLOW: { description: 'Slow transition from position three to four', defaultText: 'Three to four' },
    },

    Hit: {
        desc: 'Hit position sounds',
        ONE: { description: 'Hit position one', defaultText: 'Hit' },
        TWO: { description: 'Hit position two', defaultText: 'Hit' },
        THREE: { description: 'Hit position three', defaultText: 'Hit' },
        FOUR: { description: 'Hit position four', defaultText: 'Hit' },
    },

    Clap: {
        desc: 'Clap sounds and encouragement',
        FACE: { description: 'Clap on face', defaultText: 'Clap' },
        BELOW: { description: 'Clap below', defaultText: 'Clap below' },
        KEEPGOING: { description: 'Keep going encouragement', defaultText: 'Keep going' },
    },

    Rest: {
        desc: 'Rest period and breathing sounds',
        SHORT_REST: { description: 'Short rest or breath', defaultText: 'Breathe' },
        REST: { description: 'Rest period', defaultText: 'Rest' },
        REST_BALL: { description: 'Rest with balls', defaultText: 'Rest' },
    },

    Task: {
        desc: 'Task completion feedback',
        GOOD: { description: 'Good task completion', defaultText: 'Good' },
        BAD: { description: 'Bad task completion', defaultText: 'Bad' },
    },

    Finish: {
        desc: 'Finish and completion sounds',
        CLEAN: { description: 'Clean finish', defaultText: 'Finish' },
    },

    Release: {
        desc: 'Pre and post-release instructions and feedback',
        PRE_RELEASE: { description: 'Pre-release instruction', defaultText: 'Get ready' },
        POST_RELEASE: { description: 'Post-release feedback', defaultText: 'Well done' },
        POST_RELEASE_FOUR: { description: 'Post-release feedback for position four', defaultText: 'Well done' },
        POST_RELEASE_ZERO: { description: 'Post-release feedback for position zero', defaultText: 'Well done' },
        BASICR_3_PRE_RELEASE: { description: 'Suck Basics pre-release', defaultText: 'Get ready' },
        BASICR_3_POST_RELEASE: { description: 'Suck Basics post-release', defaultText: 'Well done' },
        COCKW_4_PRE_RELEASE_1: { description: 'Cock Worship 101 pre-release 1', defaultText: 'Get ready' },
        COCKW_4_PRE_RELEASE_2: { description: 'Cock Worship 101 pre-release 2', defaultText: 'Get ready' },
        COCKW_4_PRE_RELEASE_3: { description: 'Cock Worship 101 pre-release 3', defaultText: 'Get ready' },
        COCKW_4_POST_RELEASE: { description: 'Cock Worship 101 post-release', defaultText: 'Well done' },
    },

    Warmup: {
        desc: 'Warmup exercise sounds',
        HIT_THREE: { description: 'Warmup hit position three', defaultText: 'Hit three' },
        HIT_FOUR: { description: 'Warmup hit position four', defaultText: 'Hit four' },
    },

    Rank: {
        desc: 'End of exercise ranking and evaluation feedback',
        END_BAD_SOFT: { description: 'End ranking: bad (soft)', defaultText: 'Bad' },
        END_BAD: { description: 'End ranking: bad', defaultText: 'Bad' },
        END_PASS: { description: 'End ranking: pass', defaultText: 'Pass' },
        END_GOOD: { description: 'End ranking: good', defaultText: 'Good' },
        END_PERFECT_SOFT: { description: 'End ranking: perfect (soft)', defaultText: 'Perfect' },
        END_PERFECT: { description: 'End ranking: perfect', defaultText: 'Perfect' },
        BEGINT_1_END_BAD: { description: 'Beginner Training end: bad', defaultText: 'Bad' },
        BEGINT_1_END_GOOD: { description: 'Beginner Training end: good', defaultText: 'Good' },
        BEGINT_1_END_PERFECT: { description: 'Beginner Training end: perfect', defaultText: 'Perfect' },
        QUICKBG_2_END_BAD: { description: 'Quick Blow and Go end: bad', defaultText: 'Bad' },
        QUICKBG_2_END_GOOD: { description: 'Quick Blow and Go end: good', defaultText: 'Good' },
        QUICKBG_2_END_PERFECT: { description: 'Quick Blow and Go end: perfect', defaultText: 'Perfect' },
        COCKW_4_END_PERFECT: { description: 'Cock Worship 101 end: perfect', defaultText: 'Well done' },
    },

    Endless: {
        desc: 'Endless task start',
        ENDLESS: { description: 'Endless task start', defaultText: 'Begin' },
    },

    Level: {
        desc: 'Level start and phase sounds',
        BEGINT_1_START: { description: 'Beginner Training start', defaultText: 'Welcome to beginner training' },
        QUICKBG_2_START: { description: 'Quick Blow and Go start', defaultText: 'Quick blow and go' },
        BASICR_3_START: { description: 'Suck Basics start', defaultText: 'Suck basics' },
        COCKW_4_START: { description: 'Cock Worship 101 start', defaultText: 'Cock worship 101' },
        INTMED_5_START: { description: 'Intermediate level 5 start', defaultText: 'Intermediate' },
        ENDURANCE_6_START: { description: 'Endurance level 6 start', defaultText: 'Endurance' },
        DEEPFOCUS_7_START: { description: 'Deep focus level 7 start', defaultText: 'Deep focus' },
        SPEED_8_START: { description: 'Speed level 8 start', defaultText: 'Speed' },
        DEVOTION_9_START: { description: 'Devotion level 9 start', defaultText: 'Devotion' },
        MAXDEPTH_10_START: { description: 'Max depth level 10 start', defaultText: 'Max depth' },
        ELITE_11_START: { description: 'Elite level 11 start', defaultText: 'Elite' },
        MANYLOAD_12_START: { description: 'Many load level 12 start', defaultText: 'Begin' },
        MANYLOAD_12_PHASE2: { description: 'Many load level 12 phase 2', defaultText: 'Phase two' },
        MANYLOAD_12_PHASE3: { description: 'Many load level 12 phase 3', defaultText: 'Phase three' },
        MANYLOAD_12_WELLDONE: { description: 'Many load level 12 well done', defaultText: 'Well done' },
    },

    Speak: {
        desc: 'Speak task instruction lines',
        Speak1: { description: 'Speak instruction 1', defaultText: 'Speak' },
        Speak2: { description: 'Speak instruction 2', defaultText: 'Speak' },
        Speak3: { description: 'Speak instruction 3', defaultText: 'Speak' },
        Speak4: { description: 'Speak instruction 4', defaultText: 'Speak' },
        Speak5: { description: 'Speak instruction 5', defaultText: 'Speak' },
    },

    HoldAndClap: {
        desc: 'Hold and clap task hold positions',
        ONE: { description: 'Hold position one', defaultText: 'Hold' },
        TWO: { description: 'Hold position two', defaultText: 'Hold' },
        THREE: { description: 'Hold position three', defaultText: 'Hold' },
        FOUR: { description: 'Hold position four', defaultText: 'Hold' },
    },

    Custom: {
        desc: 'Custom voice slots (Custom1–Custom40). Enter your own text.',
    },
}

export function getCategoryDescription(category) {
    return AUDIO_HELPER[category]?.desc ?? ''
}

export function getDefaultText(category, key) {
    return AUDIO_HELPER[category]?.[key]?.defaultText ?? ''
}

export function getKeyDescription(category, key) {
    return AUDIO_HELPER[category]?.[key]?.description ?? ''
}
