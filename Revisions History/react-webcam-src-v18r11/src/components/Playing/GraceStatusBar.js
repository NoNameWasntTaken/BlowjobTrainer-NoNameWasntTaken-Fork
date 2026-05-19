import React from 'react';

/**
 * Grace time status bar for Endless tasks.
 * - Full bar = maxGrace (30s), empty = 0s
 * - Green = standard grace only (fills left to right)
 * - Bluish-purple overlay = temporary grace only (on top of green from left, shrinks right as it decays)
 * - Grey background; red when empty, at surface, and penalties active
 */
function GraceStatusBar({ standardGrace, tempGrace, atSurface, maxGrace }) {
    const standardPercent = Math.min(100, (standardGrace / maxGrace) * 100);
    const tempPercent = Math.min(100, (tempGrace / maxGrace) * 100);
    const isPenaltyActive = atSurface && standardGrace <= 0 && tempGrace <= 0;

    return (
        <div className="margin-y-sm" style={{ width: '100%', maxWidth: '450px' }}>
            <div style={{
                width: '100%',
                height: '32px',
                backgroundColor: isPenaltyActive ? '#ef4444' : '#e0e0e0',
                borderRadius: '16px',
                overflow: 'hidden',
                position: 'relative'
            }}>
                {/* Green: standard grace only (fills left to right) */}
                {!isPenaltyActive && (
                    <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${standardPercent}%`,
                        backgroundColor: '#22c55e',
                        borderRadius: standardPercent >= 99 ? '16px' : '16px 0 0 16px',
                        transition: 'width 0.1s ease-out',
                        zIndex: 1
                    }} />
                )}
                {/* Bluish-purple overlay: temp grace only (on top of green from left, shrinks right as temp decays) */}
                {!isPenaltyActive && tempGrace > 0 && (
                    <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${tempPercent}%`,
                        backgroundColor: '#7c3aed',
                        borderRadius: tempPercent >= 99 ? '16px' : '16px 0 0 16px',
                        transition: 'width 0.1s ease-out',
                        zIndex: 2
                    }} />
                )}
            </div>
        </div>
    );
}

export default GraceStatusBar;
