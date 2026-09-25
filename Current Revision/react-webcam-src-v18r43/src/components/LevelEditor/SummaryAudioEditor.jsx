import React, { useMemo } from 'react'
import AudioSelector from './AudioSelector'
import { buildSummaryAudioRowOptions, getSummaryModeDefaultCue } from './taskAudioConfig'

/**
 * Maps UI labels to level.summaryAudio keys (see getSummaryAudioRef).
 */
const SUMMARY_ROWS = [
    { key: 'failed', label: 'Failed' },
    { key: 'apprentice', label: 'Pass' },
    { key: 'journeyman', label: 'Good' },
    { key: 'master', label: 'Perfect' },
]

/**
 * Session-end voice lines per rank. None = fall back to Rank.* (see getSummaryAudioRef).
 */
function SummaryAudioEditor({ summaryAudio, summaryAudioShowCustom, onRankChange, onShowCustomChange, audioPackId }) {
    const optionsByRank = useMemo(() => {
        const out = {}
        for (const { key } of SUMMARY_ROWS) {
            out[key] = buildSummaryAudioRowOptions(
                summaryAudio,
                summaryAudioShowCustom,
                key,
                audioPackId
            )
        }
        return out
    }, [summaryAudio, summaryAudioShowCustom, audioPackId])

    return (
        <div className="border-grey margin-y padding-x padding-y-md">
            <h3>Session Summary Voice</h3>
            <p className="margin-y-sm" style={{ color: 'var(--muted)', fontSize: '13px', maxWidth: '48rem' }}>
                Choose voice lines for feedback on level completion, by rank.
            </p>
            <div
                className="summary-voice-list margin-y-sm"
            >
                {SUMMARY_ROWS.map(({ key, label }) => {
                    const isCustom = !!summaryAudioShowCustom?.[key]
                    const toggleMode = () => {
                        const nextCustom = !isCustom
                        onShowCustomChange(key, nextCustom)
                        onRankChange(key, getSummaryModeDefaultCue(key, nextCustom, audioPackId))
                    }
                    return (
                        <div key={key} className="summary-voice-row">
                            <AudioSelector
                                label={label}
                                value={summaryAudio?.[key] ?? ''}
                                onChange={(v) => onRankChange(key, v)}
                                audioPackId={audioPackId}
                                allowedOptions={optionsByRank[key]}
                                summaryStyle
                                summaryExtra={(
                                    <div className="summary-voice-type">
                                        <span className="summary-voice-type-label">Type:</span>
                                        <button
                                            type="button"
                                            className="control-compact summary-voice-mode-toggle"
                                            aria-pressed={isCustom}
                                            aria-label={
                                                isCustom
                                                    ? 'Type Custom. Press to show summary audio.'
                                                    : 'Type Summary. Press to show custom voice lines.'
                                            }
                                            onClick={toggleMode}
                                        >
                                            {isCustom ? 'Custom' : 'Summary'}
                                        </button>
                                    </div>
                                )}
                            />
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default SummaryAudioEditor
