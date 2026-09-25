import React from 'react'
import { useAtomValue } from 'jotai'
import { taskInstructionVoicePhaseAtom } from '../../atoms/audioAtom'

/**
 * Instruction-line lifecycle (Speak / Clap / Hold-and-Clap): show hold copy while
 * `taskInstructionVoicePhaseAtom` is pending, playing, or cooldown.
 *
 * @param {object} props
 * @param {boolean} props.enabled When false (e.g. calibration), render nothing.
 * @param {boolean} [props.hasInstructionAudio=true] If false, hide the `pending` line to avoid a flash when there is no instruction clip.
 */
function InstructionPhaseBanner({ enabled, hasInstructionAudio = true }) {
    const phase = useAtomValue(taskInstructionVoicePhaseAtom)

    if (!enabled) return null

    const showPending = phase === 'pending' && hasInstructionAudio
    const showPlaying = phase === 'playing'
    const showCooldown = phase === 'cooldown'

    if (!showPending && !showPlaying && !showCooldown) return null

    let message = ''
    if (showPending) message = 'Wait for instruction…'
    else if (showPlaying) message = 'Wait for instruction…'
    else message = 'Get ready…'

    return <p className="help margin-y-sm">{message}</p>
}

export default InstructionPhaseBanner
