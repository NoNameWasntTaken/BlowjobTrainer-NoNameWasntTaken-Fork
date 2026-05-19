import { useEffect } from 'react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { currentLevelAtom } from '../atoms/taskAtom'
import {
    speakRecognitionAllowedAtom,
    taskInstructionVoicePhaseAtom,
} from '../atoms/audioAtom'
import { TaskType } from '../components/Tasks/task'

/**
 * Speak tasks: recognition allowed only when `taskInstructionVoicePhase === 'ready'`
 * (after instruction audio + 200 ms tail, or 200 ms when there is no instruction clip).
 * On every task id change, phase resets to `pending` for Speak or `idle` otherwise.
 */
export function useSpeakRecognitionGate() {
    const currentLevel = useAtomValue(currentLevelAtom)
    const task = currentLevel?.currentTask
    const [phase, setPhase] = useAtom(taskInstructionVoicePhaseAtom)
    const setAllowed = useSetAtom(speakRecognitionAllowedAtom)

    useEffect(() => {
        if (!task) {
            setPhase('idle')
            return
        }
        if (task.type !== TaskType.SPEAK) {
            setPhase('idle')
            return
        }
        setPhase('pending')
    }, [task?.id, setPhase])

    useEffect(() => {
        if (!task || task.type !== TaskType.SPEAK) {
            setAllowed(true)
            return
        }
        const audio = String(task.audio ?? '').trim()
        if (!audio) {
            setAllowed(false)
            const tm = setTimeout(() => {
                setPhase('ready')
                setAllowed(true)
            }, 200)
            return () => clearTimeout(tm)
        }
        setAllowed(phase === 'ready')
    }, [task?.id, task?.type, phase, setAllowed, setPhase])
}
