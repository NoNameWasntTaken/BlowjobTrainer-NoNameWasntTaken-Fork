import React, { useEffect, useRef } from 'react'
import { audioManager } from '../services/audioManager'
import { useAtom, useAtomValue } from 'jotai'
import { feedbackAtom, sfxAtom } from '../atoms/audioAtom'
import { currentLevelAtom } from '../atoms/taskAtom'

function AudioPlayer() {
    const [sfx, setSfx] = useAtom(sfxAtom)
    const [feedback, setFeedback] = useAtom(feedbackAtom)
    const currentLevel = useAtomValue(currentLevelAtom)
    const audioRef = useRef(null)

    // main function to play a sound
    const playSound = async (soundFile) => {
        if (!soundFile) {
            console.error("No sound file provided")
            return
        }

        // Stop and cleanup previous audio
        if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current = null
        }

        // getAudioFile() always returns a single value (never an array)
        // Arrays are handled internally with all custom-content URLs resolved before random selection
        const audioUrl = await audioManager.getAudioFile(soundFile)
        if (!audioUrl) {
            console.error(`Could not resolve audio: ${soundFile}`)
            return
        }

        const audio = new Audio(audioUrl)
        audioRef.current = audio
        audio.onerror = () => console.error(`Error loading audio file: ${audioUrl}`)
        audio.onended = () => { audioRef.current = null }
        audio.play().catch(error => console.error("Error playing audio:", error))
    }

    // Handle SFX sounds
    useEffect(() => {
        if (!sfx) return
        
        let cancelled = false
        
        const playAudio = async () => {
            const audioPath = await audioManager.getAudioFile(sfx)
            if (!cancelled && audioPath) {
                await playSound(audioPath)
            }
            if (!cancelled) {
                setSfx(0)
            }
        }
        
        playAudio()
        
        return () => {
            cancelled = true
        }
    }, [sfx, setSfx])

    // Handle level-based audio
    useEffect(() => {
        if (!currentLevel?.currentTask?.audio) return
        
        let cancelled = false
        
        const playAudio = async () => {
            const audioPath = await audioManager.getAudioFile(currentLevel.currentTask.audio)
            if (!cancelled && audioPath) {
                await playSound(audioPath)
            }
        }
        
        playAudio()
        
        return () => {
            cancelled = true
        }
    }, [currentLevel?.currentTask])

    // Handle feedback audio
    useEffect(() => {
        if (!feedback) return
        
        let cancelled = false
        
        const playAudio = async () => {
            const audioPath = await audioManager.getAudioFile(feedback)
            if (!cancelled && audioPath) {
                await playSound(audioPath)
            }
            if (!cancelled) {
                setFeedback(0)
            }
        }
        
        playAudio()
        
        return () => {
            cancelled = true
        }
    }, [feedback, setFeedback])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause()
                audioRef.current = null
            }
        }
    }, [])

    // this is a purely functional component, so it doesn't need to return anything
    return <></>
}

export default AudioPlayer
