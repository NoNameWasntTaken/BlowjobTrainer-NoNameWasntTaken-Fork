/**
 * Evaluates level prerequisites (default + custom) against a profile's session stats.
 */

import { Rank } from '../atoms/taskAtom'
import { DEFAULT_LEVEL_PREREQUISITES } from '../constants/defaultLevelPrerequisites'
import { levelManager } from './levelManager'
import {
    normalizePrerequisiteRules,
    thresholdLabelForMinRank,
} from '../utils/levelPrerequisitesUtils'
import { isHiddenRecord } from '../utils/hiddenContentVisibility'
import { DEFAULT_PROFILE_ID } from '../atoms/playerProfilesModel'

/**
 * @param {string} targetLevelId
 * @returns {Array<{ levelId: string, minRank: number, thresholdLabel: string }>}
 */
export function getPrerequisiteRulesForTarget(targetLevelId) {
    if (levelManager.isDefaultLevel(targetLevelId)) {
        return DEFAULT_LEVEL_PREREQUISITES[targetLevelId] || []
    }
    const lvl = levelManager.getLevel(targetLevelId)
    if (!lvl || levelManager.isDefaultLevel(targetLevelId)) {
        return []
    }
    const exists = (id) => levelManager.getLevel(id) != null
    return normalizePrerequisiteRules(
        targetLevelId,
        lvl.prerequisites || [],
        exists
    ).map(({ levelId, minRank }) => ({
        levelId,
        minRank,
        thresholdLabel: thresholdLabelForMinRank(minRank),
    }))
}

/**
 * @param {number|undefined|null} achievedRank
 * @param {number} minimumRank
 */
export function rankMeetsMinimum(achievedRank, minimumRank) {
    if (achievedRank == null || achievedRank <= Rank.FAILED) return false
    return achievedRank >= minimumRank
}

/**
 * @param {object} profile
 * @param {string} levelId
 * @returns {number}
 */
export function getBestRankForLevel(profile, levelId) {
    const entry = profile?.sessionStats?.levelScores?.[levelId]
    return entry?.rank ?? Rank.FAILED
}

/**
 * @param {object} profile
 * @param {string} levelId - target level to play
 * @param {boolean} [showHiddenContent=false]
 * @returns {{ qualified: boolean, requirements: Array<{ levelId: string, levelOrder: number, levelTitle: string, minRank: number, thresholdLabel: string, met: boolean, achievedRank: number, displayAsUnknown: boolean, prerequisiteIsDefault: boolean }> }}
 */
export function evaluateLevelQualification(
    profile,
    levelId,
    showHiddenContent = false
) {
    const rules = getPrerequisiteRulesForTarget(levelId)
    if (!rules.length) {
        return { qualified: true, requirements: [] }
    }

    const requirements = rules.map((rule) => {
        const achievedRank = getBestRankForLevel(profile, rule.levelId)
        const met = rankMeetsMinimum(achievedRank, rule.minRank)
        const depLevel = levelManager.getLevel(rule.levelId)
        const isDefault = levelManager.isDefaultLevel(rule.levelId)
        const displayAsUnknown =
            !showHiddenContent &&
            !isDefault &&
            depLevel != null &&
            isHiddenRecord(depLevel)

        return {
            levelId: rule.levelId,
            levelOrder: depLevel?.order ?? 0,
            levelTitle: depLevel?.title ?? rule.levelId,
            minRank: rule.minRank,
            thresholdLabel: rule.thresholdLabel,
            met,
            achievedRank,
            displayAsUnknown,
            prerequisiteIsDefault: isDefault,
        }
    })

    const qualified = requirements.every((r) => r.met)
    return { qualified, requirements }
}

/**
 * Skip prerequisite enforcement when bypass is on and (hidden content is visible, or default profile).
 * @param {object} profile
 * @param {boolean} showHiddenContent
 */
export function shouldEnforcePrerequisites(profile, showHiddenContent) {
    if (profile?.bypassLevelRequirements !== true) return true
    if (showHiddenContent) return false
    if (profile?.id === DEFAULT_PROFILE_ID) return false
    return true
}

/**
 * Default + custom levels that were not qualified before this profile update but are after.
 *
 * @param {object} prevProfile
 * @param {object} nextProfile
 * @param {boolean} showHiddenContent
 * @returns {Array<{ id: string, title: string, order: number }>}
 */
export function getLevelsNewlyUnlockedByPrerequisites(
    prevProfile,
    nextProfile,
    showHiddenContent
) {
    if (
        !shouldEnforcePrerequisites(prevProfile, showHiddenContent) ||
        !shouldEnforcePrerequisites(nextProfile, showHiddenContent)
    ) {
        return []
    }

    const targets = [
        ...levelManager.getDefaultLevels(),
        ...levelManager.getCustomLevels(),
    ]
    const out = []
    const seen = new Set()
    for (const level of targets) {
        if (seen.has(level.id)) continue
        seen.add(level.id)
        const rules = getPrerequisiteRulesForTarget(level.id)
        if (!rules.length) continue

        const before = evaluateLevelQualification(
            prevProfile,
            level.id,
            showHiddenContent
        )
        const after = evaluateLevelQualification(
            nextProfile,
            level.id,
            showHiddenContent
        )
        if (!before.qualified && after.qualified) {
            out.push({
                id: level.id,
                title: level.title,
                order: level.order ?? 999,
            })
        }
    }
    out.sort((a, b) => a.order - b.order)
    return out
}
