/**
 * Session-end rank from level definition tasks and achieved score.
 * Mirrors Gameover threshold logic; keep in sync with any future ranking changes.
 */

import { Rank } from '../atoms/taskAtom';
import { levelManager } from '../services/levelManager';
import { TaskType } from '../components/Tasks/task';
import {
    calcPerfectHitScore,
    calcPassHitScore,
    calcPerfectHoldScore,
    calcPassHoldScore,
    calcPerfectDivingScore,
    calcPassDivingScore,
    calcPerfectClapScore,
    calcPassClapScore,
    calcPerfectHoldAndClapScore,
    calcPassHoldAndClapScore,
    calcPerfectEndlessScore,
    calcPassEndlessScore,
    calcPerfectSpeakScore,
    calcPassSpeakScore,
} from '../components/Training/scores';

/**
 * @param {object|null|undefined} currentLevel
 * @returns {{ perfect: number, pass: number }}
 */
export function getLevelPerfectPassTotals(currentLevel) {
    let totalPerfect = 0;
    let totalPass = 0;

    if (!currentLevel) {
        return { perfect: 0, pass: 0 };
    }

    const levelDefinition = levelManager.getLevel(currentLevel.id);
    const tasks = levelDefinition?.tasks ?? currentLevel.tasks ?? [];
    if (!tasks.length) {
        return { perfect: 0, pass: 0 };
    }

    tasks.forEach((task) => {
        switch (task.type) {
            case TaskType.HOLDPOSITION:
                totalPerfect += calcPerfectHoldScore(task);
                totalPass += calcPassHoldScore(task);
                break;
            case TaskType.UPANDDOWN:
                totalPerfect += calcPerfectDivingScore(task);
                totalPass += calcPassDivingScore(task);
                break;
            case TaskType.HITDEPTH:
                totalPerfect += calcPerfectHitScore(task);
                totalPass += calcPassHitScore(task);
                break;
            case TaskType.CLAP:
                totalPerfect += calcPerfectClapScore(task);
                totalPass += calcPassClapScore(task);
                break;
            case TaskType.HOLDANDCLAP:
                totalPerfect += calcPerfectHoldAndClapScore(task);
                totalPass += calcPassHoldAndClapScore(task);
                break;
            case TaskType.ENDLESS:
                totalPerfect += calcPerfectEndlessScore(task);
                totalPass += calcPassEndlessScore(task);
                break;
            case TaskType.SPEAK:
                totalPerfect += calcPerfectSpeakScore(task);
                totalPass += calcPassSpeakScore(task);
                break;
            default:
                break;
        }
    });

    return { perfect: totalPerfect, pass: totalPass };
}

/**
 * Full evaluation for Gameover UI thresholds + rank in one pass over tasks.
 * @param {object|null|undefined} currentLevel
 * @returns {{
 *   perfect: number,
 *   pass: number,
 *   roundedPass: number,
 *   roundedMaster: number,
 *   roundedJourneyman: number,
 *   rank: number
 * }}
 */
export function evaluateSessionEnd(currentLevel) {
    const { perfect, pass } = getLevelPerfectPassTotals(currentLevel);

    const masterThresh = perfect * 0.9;
    const journeymanThresh = pass + (masterThresh - pass) / 2;

    const roundedPass = Math.floor(pass / 10) * 10;
    const roundedMaster = Math.floor(masterThresh / 10) * 10;
    const roundedJourneyman = Math.floor(journeymanThresh / 10) * 10;

    const playerScore = currentLevel?.currentScore || 0;

    let rank = Rank.DISQUALIFIED;
    if (playerScore >= roundedMaster) {
        rank = Rank.MASTER;
    } else if (playerScore >= roundedJourneyman) {
        rank = Rank.JOURNEYMAN;
    } else if (playerScore >= roundedPass) {
        rank = Rank.APPRENTICE;
    } else if (playerScore >= perfect * 0.1) {
        rank = Rank.FAILED;
    }

    return {
        perfect,
        pass,
        roundedPass,
        roundedMaster,
        roundedJourneyman,
        rank,
    };
}

/**
 * @param {object|null|undefined} currentLevel
 * @returns {number} Rank.* constant
 */
export function computeSessionEndRank(currentLevel) {
    return evaluateSessionEnd(currentLevel).rank;
}
