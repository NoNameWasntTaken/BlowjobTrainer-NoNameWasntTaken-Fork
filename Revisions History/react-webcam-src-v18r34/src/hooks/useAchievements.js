import { useAtomValue } from 'jotai'
import { achievements as achievementsData } from '../components/Achievements/achievementsData'
import { achievementsStoredAtom } from '../atoms/playerAtom'

/**
 * Read-only achievement helpers for UI. Level completion persistence uses
 * `computeLevelCompletionUpdate` in Gameover (pure + single `playerProfilesAtom` write).
 * Subscribes to `achievementsStoredAtom` so profile switches re-render consumers.
 */
export const useAchievements = () => {
    const stored = useAtomValue(achievementsStoredAtom)

    const findAchievement = (id) => achievementsData.find((a) => a.id === id)

    const isUnlocked = (id) => stored.unlockedAchievements.includes(id)

    const getProgress = (id) => {
        const achievement = findAchievement(id)
        if (!achievement) return null

        let progress = stored.achievementProgress[id]
        if (progress == null) {
            switch (achievement.type) {
                case 'bool':
                    progress = false
                    break
                case 'count':
                case 'time':
                    progress = 0
                    break
                default:
                    return null
            }
        }
        return progress
    }

    return {
        findAchievement,
        isUnlocked,
        getProgress,
        newlyUnlocked: [],
        clearNewlyUnlocked: () => {},
    }
}
