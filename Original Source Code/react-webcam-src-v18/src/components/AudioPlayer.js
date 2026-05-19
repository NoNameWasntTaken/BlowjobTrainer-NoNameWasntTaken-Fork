import React, { useEffect } from 'react'
import { audioManager } from '../services/audioManager'
import { audioFileService } from '../services/storageService'
import { useAtom, useAtomValue } from 'jotai'
import { feedbackAtom, sfxAtom } from '../atoms/audioAtom'
import { currentLevelAtom } from '../atoms/taskAtom'

function AudioPlayer() {
    const [sfx, setSfx] = useAtom(sfxAtom)
    const [feedback, setFeedback] = useAtom(feedbackAtom)
    const currentLevel = useAtomValue(currentLevelAtom)

    // main function to play a sound
    const playSound = async (soundFile) => {
        if (!soundFile) {
            console.error("No sound file provided")
            return
        }

        // Resolve custom content URLs if needed
        let audioUrl = soundFile
        if (soundFile && soundFile.startsWith('custom-content://')) {
            const resolvedUrl = await audioFileService.getAudioFile(soundFile)
            if (!resolvedUrl) {
                console.error(`Could not resolve custom audio: ${soundFile}`)
                return
            }
            audioUrl = resolvedUrl
        }

        const audio = new Audio(audioUrl)
        audio.onerror = () => console.error(`Error loading audio file: ${audioUrl}`)
        audio.play().catch(error => console.error("Error playing audio:", error))
    }

    // Handle SFX sounds
    useEffect(() => {
        if (!sfx) return
        const audioPath = audioManager.getAudioFileSync(sfx)
        if (audioPath) {
            playSound(audioPath)
        }
        setSfx(0)
    }, [sfx, setSfx])

    // Handle level-based audio
    useEffect(() => {
        if (!currentLevel?.currentTask?.audio) return
        const audioPath = audioManager.getAudioFileSync(currentLevel.currentTask.audio)
        if (audioPath) {
            playSound(audioPath)
        }
    }, [currentLevel?.currentTask])

    // Handle feedback audio
    useEffect(() => {
        if (!feedback) return
        const audioPath = audioManager.getAudioFileSync(feedback)
        if (audioPath) {
            playSound(audioPath)
        }
        setFeedback(0)
    }, [feedback, setFeedback])

    // this is a purely functional component, so it doesn't need to return anything
    return <></>
}

export default AudioPlayer
