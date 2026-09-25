import React, { useMemo } from 'react'
import AudioSelector from './AudioSelector'
import { buildSummaryAudioRowOptions } from './taskAudioConfig'

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
            <p className="margin-y-sm" style={{ color: '#666', fontSize: '13px', maxWidth: '48rem' }}>
                Choose voice lines for feedback on level completion, by rank.
            </p>
            <div
                className="margin-y-sm"
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    alignItems: 'stretch',
                    maxWidth: 'min(100%, 58rem)',
                    paddingLeft: '6rem',
                }}
            >
                {SUMMARY_ROWS.map(({ key, label }) => (
                    <div key={key} style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <AudioSelector
                            label={label}
                            value={summaryAudio?.[key] ?? ''}
                            onChange={(v) => onRankChange(key, v)}
                            audioPackId={audioPackId}
                            allowedOptions={optionsByRank[key]}
                            summaryStyle
                            summaryExtra={(
                                <label
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '14px',
                                        lineHeight: 1.2,
                                        margin: 0,
                                        cursor: 'pointer',
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={!!summaryAudioShowCustom?.[key]}
                                        onChange={(e) => onShowCustomChange(key, e.target.checked)}
                                        style={{ margin: 0, flexShrink: 0, verticalAlign: 'middle' }}
                                    />
                                    Show Custom Voice Lines
                                </label>
                            )}
                        />
                    </div>
                ))}
            </div>
        </div>
    )
}

export default SummaryAudioEditor
