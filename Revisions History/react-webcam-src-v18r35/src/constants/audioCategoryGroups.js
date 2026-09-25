import { AUDIO } from '../components/Tasks/audio'

export const CATEGORY_GROUPS = [
    {
        heading: 'Baseline',
        categories: ['Sfx', 'Calibration'],
    },
    {
        heading: 'Session Start',
        categories: ['Level', 'Lvl_begint', 'Lvl_quickbg', 'Lvl_basicr', 'Lvl_cockw'],
    },
    {
        heading: 'Task Assignment',
        categories: ['Warmup', 'Hit', 'UpDown', 'Hold', 'Clap', 'Rest', 'HoldAndClap', 'Speak', 'Endless'],
    },
    {
        heading: 'Performance',
        categories: ['Feedback', 'Task'],
    },
    {
        heading: 'Session End',
        categories: ['Release', 'Finish'],
    },
    {
        heading: 'Session Summary',
        categories: ['Rank'],
    },
    {
        heading: 'Custom',
        categories: ['Custom'],
    },
]

export function getProcessedCategoryGroups(includeCustom = true) {
    const allCategories = [
        ...Object.keys(AUDIO).filter((key) => typeof AUDIO[key] === 'object' && AUDIO[key] !== null),
        ...(includeCustom ? ['Custom'] : []),
    ]

    return CATEGORY_GROUPS.map((group) => ({
        ...group,
        categories: group.categories.filter((cat) => allCategories.includes(cat)),
    })).filter((group) => group.categories.length > 0)
}
