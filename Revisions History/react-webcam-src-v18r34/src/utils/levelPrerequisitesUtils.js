/**
 * Custom level prerequisites: normalize, validate acyclic DAG into defaults / empty customs.
 */

import { Rank } from '../atoms/taskAtom'
import {
    PrerequisiteThreshold,
} from '../constants/defaultLevelPrerequisites'

const VALID_MIN_RANKS = new Set([
    Rank.APPRENTICE,
    Rank.JOURNEYMAN,
    Rank.MASTER,
])

/**
 * @param {number} minRank
 * @returns {string}
 */
export function thresholdLabelForMinRank(minRank) {
    if (minRank >= Rank.MASTER) return PrerequisiteThreshold.PERFECT
    if (minRank >= Rank.JOURNEYMAN) return PrerequisiteThreshold.GOOD
    return PrerequisiteThreshold.PASS
}

/**
 * @param {string} ownerLevelId
 * @param {Array<{ levelId?: string, minRank?: number }>} raw
 * @param {(levelId: string) => boolean} levelExists
 * @returns {Array<{ levelId: string, minRank: number }>}
 */
export function normalizePrerequisiteRules(ownerLevelId, raw, levelExists) {
    const bestById = new Map()
    for (const row of raw || []) {
        if (!row || typeof row.levelId !== 'string' || !row.levelId) continue
        if (row.levelId === ownerLevelId) continue
        if (!levelExists(row.levelId)) continue
        const mr = Number(row.minRank)
        if (!VALID_MIN_RANKS.has(mr)) continue
        const prev = bestById.get(row.levelId)
        if (prev == null || mr > prev) bestById.set(row.levelId, mr)
    }
    return [...bestById.entries()].map(([levelId, minRank]) => ({
        levelId,
        minRank,
    }))
}

/**
 * @param {object} proposedLevel - custom level about to be saved (with prerequisites)
 * @param {(levelId: string) => object | null} resolveLevel - proposedLevel when id matches, else stored custom or default from levelManager
 * @param {(levelId: string) => boolean} isDefaultLevel
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function validateCustomPrerequisiteDAG(
    proposedLevel,
    resolveLevel,
    isDefaultLevel
) {
    const rootId = proposedLevel.id
    const normalized = Array.isArray(proposedLevel.prerequisites)
        ? proposedLevel.prerequisites
        : []

    /**
     * @param {string} nodeId
     * @param {Set<string>} pathSet
     * @returns {{ ok: true } | { ok: false, error: string }}
     */
    function dfs(nodeId, pathSet) {
        if (isDefaultLevel(nodeId)) {
            return { ok: true }
        }
        if (pathSet.has(nodeId)) {
            return { ok: false, error: 'Prerequisites cannot form a cycle.' }
        }
        const node = resolveLevel(nodeId)
        if (!node) {
            return { ok: true }
        }
        const pr = Array.isArray(node.prerequisites) ? node.prerequisites : []
        if (pr.length === 0) {
            return { ok: true }
        }
        pathSet.add(nodeId)
        for (const { levelId } of pr) {
            if (!levelId || typeof levelId !== 'string') continue
            const next = dfs(levelId, pathSet)
            if (!next.ok) return next
        }
        pathSet.delete(nodeId)
        return { ok: true }
    }

    const pathSet = new Set([rootId])
    for (const { levelId } of normalized) {
        const r = dfs(levelId, pathSet)
        if (!r.ok) return r
    }
    return { ok: true }
}
