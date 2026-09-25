import {
    Clock,
    Coffee,
    Droplet,
    PlayCircle,
    Award,
    Target,
    Anchor,
    Activity,
    CheckCircle,
    Music,
    BarChart2,
    Star,
    Zap,
} from 'react-feather'

import { STR } from '../../constants/stringsreplace'

export const achievements = [

    // Overall Time Based Achievements
    {
        icon: Clock,
        name: STR.Achievement.training_dedication,
        id: 'training_dedication',
        description: "Accumulate 10 hours of total play time",
        type: 'time',
        current: 0,
        total: 36000, // 10 hours in seconds
        inDevelopment: false,
        order: 1
    },

    // Perfect Score Achievements
    {
        icon: CheckCircle,
        name: "Good dive",
        id: 'good_dive',
        description: "Perfect score on single level",
        type: 'bool',
        passed: false,
        inDevelopment: false,
        order: 10
    },
    {
        icon: Star,
        name: "Level Master",
        id: 'level_master',
        description: "Perfect score on 3 levels",
        type: 'count',
        current: 0,
        total: 3,
        inDevelopment: false,
        order: 11
    },
    {
        icon: Star,
        name: "Advanced Master",
        id: 'advanced_master',
        description: "Perfect score on 6 levels",
        type: 'count',
        current: 0,
        total: 6,
        inDevelopment: false,
        order: 12
    },
    {
        icon: Star,
        name: "Completionist",
        id: 'completionist',
        description: "Perfect score on 12 levels",
        type: 'count',
        current: 0,
        total: 12,
        inDevelopment: false,
        order: 13
    },

    // Session based achievements
    {
        icon: Activity,
        name: STR.Achievement.session_master,
        id: 'session_master',
        description: "Perform 3 levels in one day",
        type: 'count',
        current: 0,
        total: 3,
        inDevelopment: false,
        order: 20
    },
    {
        icon: Coffee,
        name: STR.Achievement.daily_diver,
        id: 'daily_diver',
        description: "Complete at least one level per day for 7 days",
        type: 'count',
        current: 0,
        total: 7,
        inDevelopment: false,
        order: 21
    },
    {
        icon: Droplet,
        name: STR.Achievement.dozen,
        id: 'dozen',
        description: "Play twelve times with at least a passing rank.",
        type: 'count',
        current: 0,
        total: 12,
        inDevelopment: false,
        order: 22
    },
    {
        icon: PlayCircle,
        name: STR.Achievement.sixtynine,
        id: 'sixtynine',
        description: "Play 69 times with at least a passing rank.",
        type: 'count',
        current: 0,
        total: 69,
        inDevelopment: false,
        order: 23
    },



    // Depth-Specific Hold Times
    {
        icon: Clock,
        name: STR.Achievement.in_love_with_the_sea,
        id: 'in_love_with_the_sea',
        description: "Total hold time of 30 mins",
        type: 'time',
        current: 0,
        total: 1800, // 30 minutes in seconds
        inDevelopment: false,
        order: 30
    },
    {
        icon: Anchor,
        name: STR.Achievement.deep_master,
        id: 'deep_master',
        description: "Total hold time at depth 4 of 10 mins",
        type: 'time',
        current: 0,
        total: 600, // 10 minutes in seconds
        inDevelopment: false,
        order: 31
    },
    // Count Based Achievements
    {
        icon: Award,
        name: STR.Achievement.deep_100,
        id: 'deep_100',
        description: "Accumulate 100 successful depth 4 hits",
        type: 'count',
        current: 0,
        total: 100,
        inDevelopment: true,
        order: 32
    },
    // Depth Specific Achievements
    {
        icon: Target,
        name: "Getting Comfortable",
        id: 'getting_comfortable',
        description: "First time holding at base depth 3 for 10 seconds",
        type: 'bool',
        passed: false,
        inDevelopment: false,
        order: 33
    },
    {
        icon: Target,
        name: "Getting Uncomfortable",
        id: 'getting_uncomfortable',
        description: "First time holding depth 4 for 10 seconds",
        type: 'bool',
        passed: false,
        inDevelopment: false,
        order: 34
    },






    // // Task Mastery
    // {
    //     icon: TrendingUp,
    //     name: "Perfect Flow",
    //     id: 'perfect_flow',
    //     description: "Complete 6 tasks in a row with perfect execution (excluding rests)",
    //     type: 'count',
    //     current: 0,
    //     total: 6,
    //     inDevelopment: true,
    //     order: 40
    // },
    {
        icon: Zap,
        name: STR.Achievement.clap,
        id: 'clap',
        description: "clap yourself 200 times",
        type: 'count',
        current: 0,
        total: 200,
        inDevelopment: false,
        order: 41
    },
    {
        icon: BarChart2,
        name: STR.Achievement.surface_avoider,
        id: 'surface_avoider',
        description: "Complete a level with less than 1 unauthorized surfacing per task",
        type: 'bool',
        passed: false,
        inDevelopment: false,
        order: 41
    },

    // Tempo Mastery
    {
        icon: Music,
        name: "Hypnotic",
        id: 'hypno',
        description: "At slow temp, gain a perfect streak of 15",
        type: 'count',
        current: 0,
        total: 15,
        inDevelopment: false,
        order: 42
    },
    {
        icon: Music,
        name: "Metronome",
        id: 'metronome',
        description: "At medium temp, gain a perfect streak of 20",
        type: 'count',
        current: 0,
        total: 20,
        inDevelopment: false,
        order: 43
    },
    {
        icon: Music,
        name: "Speed Demon",
        id: 'speed_demon',
        description: "At fast temp, gain a perfect streak of 40",
        type: 'count',
        current: 0,
        total: 40,
        inDevelopment: false,
        order: 44
    }
]
