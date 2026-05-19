import { Rank } from "../atoms/taskAtom"
export const STR = {

    Task: {
        DIVE: "Suck",
        HOLD: "Hold",
        HIT: "Hit",
        CLAP: "Slap",
        REST: "Rest",
    },

    Depth: {
        0: "off",
        1: "Tip",
        2: "Shaft",
        3: "Base",
        4: "Deepthroat",
    },

    Achievement: {
        // session
        session_master: "Eager Slut", // 3 sessions in a day
        daily_diver: "Daily Protein", // 1 a day for 7 days
        dozen: "Oral Service", // suck 12 cocks
        sixtynine: "Full of Cum", // suck 69 cocks
        // time
        training_dedication: "Dedicated Cocksucker", // 10 hour playtime
        in_love_with_the_sea: "In love with the cock", // hold time of 30mins
        deep_master: "Deepthroat Master", // depth 4 hold time of 10mins
        deep_100: "Throat Trained", // 100 depth 4 hits
        good_dive: "Good Girl", // perfect dive on 1 level
        level_master: "Wife Material", // perfect 3 levels
        advanced_master: "Perfect Cum Slut", // perfect on 6
        completionist: "Insatiable Whore", // perfect on 12 levels
        getting_comfortable: "Getting Comfortable",
        getting_uncomfortable: "Getting Uncomfortable",
        perfect_flow: "Obedient Perfection", // complete 6 tasks as pefect
        surface_avoider: "Work Bitch", // less than 1 penalty per task
        clap: "Hit Me Baby", // less than 1 penalty per task
        hypno: "Hypnoslut",
        metronome: "Metronome", // perfect medium temp for 60s
        speed_demon: "Face Fucked" // complete fast temp with no speed warnings
    },
    AchieveDesc: {
        // session
        session_master: "Take 3 cum loads in one day", // 3 sessions in a day
        daily_diver: "Take 1 load a day for 7 days straight", // 1 a day for 7 days
        dozen: "Suck 12 cocks", // suck 12 cocks
        sixtynine: "Take 69 loads of cum", // suck 69 cocks
        // time
        training_dedication: "Reach a combined ten hours of blowjob playtime", // 10 hour playtime
        in_love_with_the_sea: "Reach a total hold time of 30mins", // hold time of 30mins
        deep_master: "Reach a total deepthroat hold time of 10mins", // depth 4 hold time of 10mins
        deep_100: "Hit your deepthroat 100 times", // 100 depth 4 hits
        good_dive: "Perfect a single level", // perfect dive on 1 level
        level_master: "Gain Perfect rank on 3 levels", // perfect 3 levels
        advanced_master: "Gain Perfect rank on 6 levels", // perfect on 6
        completionist: "Gain Perfect rank on all 12 levels", // perfect on 12 levels
        perfect_flow: "Master 3 levels", // complete 6 tasks as pefect
        getting_comfortable: "Hold at cock base for 10 seconds",
        getting_uncomfortable: "Hold at deepthroat for 10 seconds",
        surface_avoider: "Complete a level with less than 1 surface penalty per task", // less than 1 penalty per task
        clap: "Slap or Spank yourself 200 times.", // less than 1 penalty per task
        hypno: "At slow tempo, gain a perfect streak of 15.", // perfect medium temp for 60s
        metronome: "At medium tempo, gain a perfect streak of 20.", // perfect medium temp for 60s
        speed_demon: "At fast tempo, gain a perfect streak of 40!" // complete fast tempo with no speed warnings
    },

    Stats: {
        your_diving_stats: "Blowjob Stats",
        achievements: "Achievements",
        reset_default_profile: "Reset Default Profile",
        delete_all_profiles: "Delete Custom Profiles",
        total_dive_time: "Total Blowjob Time",
        levels_completed: "Loads Swallowed",
        highest_daily_levels: "Most Loads Taken in One Day",
        longest_streak: "Longest Daily Streak",
        levels_today: "Loads Swallowed Today",
        total_dives: "Total Sucks",
        dive_stats: "Suck Stats",
        delete_all_custom_modal_title: "Delete all custom content?",
        delete_all_custom_modal_body:
            "This permanently removes imported voice packs, background tracks, custom levels, and profile data, then restores the app to its default state. This cannot be undone!",
        confirm_action: "Confirm",
        cancel_action: "Cancel",
    },

    rankStr(r) {
        switch (r) {
            case (Rank.DISQUALIFIED):
                return ("DISQUALIFIED")
            case (Rank.FAILED):
                return ("FAILED")
            case (Rank.APPRENTICE):
                return ("APPRENTICE mouth")
            case (Rank.JOURNEYMAN):
                return ("GOOD girl")
            case (Rank.MASTER):
                return ("PERFECT Slut")
            default:
                return "unknown"
        }

    }
}