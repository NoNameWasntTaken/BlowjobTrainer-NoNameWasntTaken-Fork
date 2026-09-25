/** Legacy Category.KEY string → canonical ref */
export const AUDIO_REF_ALIASES = {
    'Lvl_begint.START': 'Level.BEGINT_1_START',
    'Lvl_begint.END_BAD': 'Rank.BEGINT_1_END_BAD',
    'Lvl_begint.END_GOOD': 'Rank.BEGINT_1_END_GOOD',
    'Lvl_begint.END_PERFECT': 'Rank.BEGINT_1_END_PERFECT',
    'Lvl_quickbg.START': 'Level.QUICKBG_2_START',
    'Lvl_quickbg.END_BAD': 'Rank.QUICKBG_2_END_BAD',
    'Lvl_quickbg.END_GOOD': 'Rank.QUICKBG_2_END_GOOD',
    'Lvl_quickbg.END_PERFECT': 'Rank.QUICKBG_2_END_PERFECT',
    'Lvl_basicr.START': 'Level.BASICR_3_START',
    'Lvl_basicr.PRE_RELEASE': 'Release.BASICR_3_PRE_RELEASE',
    'Lvl_basicr.POST_RELEASE': 'Release.BASICR_3_POST_RELEASE',
    'Lvl_cockw.START': 'Level.COCKW_4_START',
    'Lvl_cockw.PRE_RELEASE_1': 'Release.COCKW_4_PRE_RELEASE_1',
    'Lvl_cockw.PRE_RELEASE_2': 'Release.COCKW_4_PRE_RELEASE_2',
    'Lvl_cockw.PRE_RELEASE_3': 'Release.COCKW_4_PRE_RELEASE_3',
    'Lvl_cockw.POST_RELEASE': 'Release.COCKW_4_POST_RELEASE',
    'Lvl_cockw.END': 'Rank.COCKW_4_END_PERFECT',
    'Level.BEGINT_START': 'Level.BEGINT_1_START',
    'Level.QUICKBG_START': 'Level.QUICKBG_2_START',
    'Level.BASICR_START': 'Level.BASICR_3_START',
    'Level.COCKW_START': 'Level.COCKW_4_START',
    'Rank.BEGINT_END_BAD': 'Rank.BEGINT_1_END_BAD',
    'Rank.BEGINT_END_GOOD': 'Rank.BEGINT_1_END_GOOD',
    'Rank.BEGINT_END_PERFECT': 'Rank.BEGINT_1_END_PERFECT',
    'Rank.QUICKBG_END_BAD': 'Rank.QUICKBG_2_END_BAD',
    'Rank.QUICKBG_END_GOOD': 'Rank.QUICKBG_2_END_GOOD',
    'Rank.QUICKBG_END_PERFECT': 'Rank.QUICKBG_2_END_PERFECT',
    'Rank.COCKW_END': 'Rank.COCKW_4_END_PERFECT',
    'Rank.COCKW_END_PERFECT': 'Rank.COCKW_4_END_PERFECT',
    'Release.BASICR_PRE_RELEASE': 'Release.BASICR_3_PRE_RELEASE',
    'Release.BASICR_POST_RELEASE': 'Release.BASICR_3_POST_RELEASE',
    'Release.COCKW_PRE_RELEASE_1': 'Release.COCKW_4_PRE_RELEASE_1',
    'Release.COCKW_PRE_RELEASE_2': 'Release.COCKW_4_PRE_RELEASE_2',
    'Release.COCKW_PRE_RELEASE_3': 'Release.COCKW_4_PRE_RELEASE_3',
    'Release.COCKW_POST_RELEASE': 'Release.COCKW_4_POST_RELEASE',
    'Level.INTMED_5': 'Level.INTMED_5_START',
    'Level.ENDURANCE_6': 'Level.ENDURANCE_6_START',
    'Level.DEEPFOCUS_7': 'Level.DEEPFOCUS_7_START',
    'Level.SPEED_8': 'Level.SPEED_8_START',
    'Level.DEVOTION_9': 'Level.DEVOTION_9_START',
    'Level.MAXDEPTH_10': 'Level.MAXDEPTH_10_START',
    'Level.ELITE_11': 'Level.ELITE_11_START',
    'Level.MANYLOAD_12': 'Level.MANYLOAD_12_START',
}

/**
 * Resolve a Category.KEY reference.
 * Pack aliases (Custom.old → Custom.new) are applied first so a renamed key
 * still plays for levels that store the previous key. Static legacy aliases run after that.
 * @param {string} ref
 * @param {Record<string, string>|null} [packAliases]
 * @returns {string}
 */
export function normalizeAudioRef(ref, packAliases) {
    if (typeof ref !== 'string') {
        return ref
    }
    let current = ref
    if (packAliases && typeof packAliases === 'object') {
        const seen = new Set()
        while (typeof packAliases[current] === 'string' && !seen.has(current)) {
            seen.add(current)
            current = packAliases[current]
        }
    }
    return AUDIO_REF_ALIASES[current] ?? current
}
