import React from 'react'
import { Grade } from '../../atoms/taskAtom'
import { X } from 'react-feather'

function Score({ score, isLatest }) {
    if (score.grade === Grade.PENALTY) {
        return (
            <div className={`score-item penalty ${isLatest ? 'latest' : ''}`}>
                <div className="score-main">
                    <span className="score-points">{score.score} pts</span>
                    {/* <X size={18} strokeWidth={5} className='margin-xr-sm' /> */}
                    <span className="score-grade penalty"> ~ PENALTY</span>
                </div>
            </div>
        )
    }

    if (score.grade === Grade.FAIL) {
        return (
            <div className={`score-item failed ${isLatest ? 'latest' : ''}`}>
                <div className="score-main failed">
                    <X size={18} strokeWidth={5} className='margin-xr-sm' />
                    <span className="score-grade fail">FAILED</span>
                    {score.issues?.length > 0 && (
                        <div className="dive-issues">{score.issues.join(', ').replace(/_/g, ' ')}</div>
                    )}
                </div>
            </div>
        )
    }

    const useDisplayScore =
        typeof score.displayScore === 'number' && Number.isFinite(score.displayScore)
    let mainPts = useDisplayScore ? score.displayScore : score.score
    if (!useDisplayScore && score.type === 'dive') {
        const raw = typeof score.score === 'number' && Number.isFinite(score.score) ? score.score : 0
        const db = typeof score.depthBonus === 'number' && Number.isFinite(score.depthBonus) ? score.depthBonus : 0
        const rb = typeof score.rhythmBonus === 'number' && Number.isFinite(score.rhythmBonus) ? score.rhythmBonus : 0
        mainPts = raw + db + rb
    }
    const ptsLabel =
        (useDisplayScore || score.type === 'dive' || score.type === 'hold') &&
        typeof mainPts === 'number' &&
        Number.isFinite(mainPts)
            ? mainPts.toFixed(1)
            : mainPts

    return (
        <div className={`score-item ${isLatest ? 'latest' : ''}`}>
            <div className="score-main">
                <span className="score-points">{ptsLabel} pts</span>
                {score.grade !== Grade.PASS && (
                    <span className={`score-grade ${score.grade.toLowerCase()}`}> ~ {score.grade}</span>
                )}
                {score.bonus > 0 && (
                    <span className="score-bonus">+{score.bonus}</span>
                )}
                {score.grade !== Grade.PERFECT && score.grade !== Grade.PERFECT_DEEP && score.issues?.length > 0 && (
                    <div className="dive-issues">{score.issues.join(', ').replace(/_/g, ' ')}</div>
                )}
            </div>
        </div>
    )
}

function ScoreList({ scores }) {
    return (
        <div className="score-list">
            {[...scores].reverse().map((score, index) => (
                <Score key={index} score={score} isLatest={index === 0} />
            ))}
        </div>
    )
}

export { Score, ScoreList } 