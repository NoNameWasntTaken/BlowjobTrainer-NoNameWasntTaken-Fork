import React from 'react'
import { X } from 'react-feather'
import { STR } from '../../constants/stringsreplace'
import { Rank } from '../../atoms/taskAtom'
import '../ContentLibrary/ContentLibrary.css'

function formatAchievedRank(rank) {
    if (rank == null || rank <= Rank.FAILED) return 'Not completed'
    return STR.rankStr(rank)
}

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} props.targetTitle
 * @param {Array<{ levelId: string, levelOrder: number, levelTitle: string, minRank: number, thresholdLabel: string, met: boolean, achievedRank: number, displayAsUnknown?: boolean, prerequisiteIsDefault?: boolean }>} props.requirements
 */
export default function LevelPrerequisitesModal({
    open,
    onClose,
    targetTitle,
    requirements,
}) {
    if (!open) return null

    const hasUnknownHiddenPrerequisite = requirements.some(
        (req) => req.displayAsUnknown === true
    )
    const knownRequirements = requirements.filter((req) => req.displayAsUnknown !== true)

    return (
        <div
            className="import-dialog-overlay"
            role="presentation"
            onClick={onClose}
        >
            <div
                className="import-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="level-prereq-modal-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="dialog-header">
                    <h3 id="level-prereq-modal-title">Missing Requirements</h3>
                    <button
                        type="button"
                        className="button-icon"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="dialog-content" style={{ marginTop: 0 }}>
                    <p className="margin-y-sm" style={{ opacity: 0.9 }}>
                        Complete the following level(s) to unlock{' '}
                        <strong>{targetTitle}:</strong>
                    </p>
                    <ul
                        style={{
                            listStyleType: 'disc',
                            listStylePosition: 'outside',
                            paddingLeft: '1.25rem',
                            margin: '12px 0 0',
                        }}
                    >
                        {knownRequirements.map((req) => (
                            <li
                                key={`${req.levelId}-${req.thresholdLabel}`}
                                className="margin-y-sm"
                                style={{ lineHeight: 1.4 }}
                            >
                                {(req.prerequisiteIsDefault ?? true)
                                    ? 'Level'
                                    : 'Custom Level'}{' '}
                                {req.levelOrder}:{' '}
                                <strong>{req.levelTitle}</strong> — {req.thresholdLabel}
                                {req.minRank === Rank.MASTER ? '' : ' (or better)'}
                                <span
                                    style={{
                                        display: 'block',
                                        fontSize: '0.85em',
                                        opacity: 0.85,
                                    }}
                                >
                                    Your best: {formatAchievedRank(req.achievedRank)}
                                </span>
                            </li>
                        ))}
                        {hasUnknownHiddenPrerequisite ? (
                            <li
                                key="prerequisite-unknown-hidden-once"
                                className="margin-y-sm"
                                style={{ lineHeight: 1.4 }}
                            >
                                <strong>Unknown Level</strong>
                            </li>
                        ) : null}
                    </ul>
                    <div
                        className="row-centered margin-y-sm"
                        style={{ justifyContent: 'flex-end', marginTop: '16px' }}
                    >
                        <button type="button" className="button button-primary" onClick={onClose}>
                            OK
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
