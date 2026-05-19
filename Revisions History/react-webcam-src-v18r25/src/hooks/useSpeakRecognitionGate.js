import { useEffect } from 'react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { currentLevelAtom } from '../atoms/taskAtom'
import {
    speakPcmFeedAllowedAtom,
    speakRecognitionAllowedAtom,
    taskInstructionVoicePhaseAtom,
} from '../atoms/audioAtom'
import { TaskType } from '../components/Tasks/task'

/**
 * Speak tasks:
 * - PCM feed: false while instruction audio is playing (until overlap fires in AudioPlayer or clip ends);
 *   true immediately if there is no instruction clip.
 * - Match/scoring: true only when `taskInstructionVoicePhase === 'ready'` (after instruction + 200 ms tail,
 *   or 200 ms when there is no instruction clip).
 */
export function useSpeakRecognitionGate() {
    const currentLevel = useAtomValue(currentLevelAtom)
    const task = currentLevel?.currentTask
    const [phase, setPhase] = useAtom(taskInstructionVoicePhaseAtom)
    const setMatchAllowed = useSetAtom(speakRecognitionAllowedAtom)
    const setPcmFeedAllowed = useSetAtom(speakPcmFeedAllowedAtom)

    useEffect(() => {
        if (!task) {
            setPhase('idle')
            setPcmFeedAllowed(true)
            return
        }
        if (task.type !== TaskType.SPEAK) {
            setPhase('idle')
            setPcmFeedAllowed(true)
            return
        }
        setPhase('pending')
        if (String(task.audio ?? '').trim()) {
            setPcmFeedAllowed(false)
        } else {
            setPcmFeedAllowed(true)
        }
    }, [task, setPhase, setPcmFeedAllowed])

    useEffect(() => {
        if (!task || task.type !== TaskType.SPEAK) {
            setMatchAllowed(true)
            return
        }
        const audio = String(task.audio ?? '').trim()
        if (!audio) {
            setMatchAllowed(false)
            const tm = setTimeout(() => {
                setPhase('ready')
                setMatchAllowed(true)
            }, 200)
            return () => clearTimeout(tm)
        }
        setMatchAllowed(phase === 'ready')
    }, [task, phase, setMatchAllowed, setPhase])
}
