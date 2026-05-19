import React, { useEffect, useRef } from 'react'
import { audioManager } from '../services/audioManager'
import { useAtom, useAtomValue } from 'jotai'
import { feedbackAtom, sfxAtom, sfxVolumeAtom, voiceVolumeAtom } from '../atoms/audioAtom'
import { currentLevelAtom } from '../atoms/taskAtom'

function AudioPlayer() {
    const [sfx, setSfx] = useAtom(sfxAtom)
    const [feedback, setFeedback] = useAtom(feedbackAtom)
    const currentLevel = useAtomValue(currentLevelAtom)
    const sfxVolume = useAtomValue(sfxVolumeAtom)
    const voiceVolume = useAtomValue(voiceVolumeAtom)
    
    // Separate refs for SFX and voice channels so they don't interrupt each other
    const sfxAudioRef = useRef(null)
    const voiceAudioRef = useRef(null)

    // Play SFX on its own channel (doesn't interrupt voice)
    const playSfx = async (soundFile) => {
        if (!soundFile) return
        
        // Stop previous SFX only
        if (sfxAudioRef.current) {
            sfxAudioRef.current.pause()
            sfxAudioRef.current = null
        }

        const audioUrl = await audioManager.getAudioFile(soundFile)
        if (!audioUrl) {
            console.error(`Could not resolve SFX audio: ${soundFile}`)
            return
        }

        const audio = new Audio(audioUrl)
        audio.volume = sfxVolume
        sfxAudioRef.current = audio
        audio.onerror = () => console.error(`Error loading SFX file: ${audioUrl}`)
        audio.onended = () => { sfxAudioRef.current = null }
        audio.play().catch(error => console.error("Error playing SFX:", error))
    }

    // Play voice/feedback on its own channel (doesn't interrupt SFX)
    const playVoice = async (soundFile) => {
        if (!soundFile) return
        
        // Stop previous voice only
        if (voiceAudioRef.current) {
            voiceAudioRef.current.pause()
            voiceAudioRef.current = null
        }

        const audioUrl = await audioManager.getAudioFile(soundFile)
        if (!audioUrl) {
            console.error(`Could not resolve voice audio: ${soundFile}`)
            return
        }

        const audio = new Audio(audioUrl)
        audio.volume = voiceVolume
        voiceAudioRef.current = audio
        audio.onerror = () => console.error(`Error loading voice file: ${audioUrl}`)
        audio.onended = () => { voiceAudioRef.current = null }
        audio.play().catch(error => console.error("Error playing voice:", error))
    }

    // Apply volume changes to currently playing audio
    useEffect(() => {
        if (sfxAudioRef.current) sfxAudioRef.current.volume = sfxVolume
    }, [sfxVolume])

    useEffect(() => {
        if (voiceAudioRef.current) voiceAudioRef.current.volume = voiceVolume
    }, [voiceVolume])

    // Handle SFX sounds (metronome ticks, etc.)
    useEffect(() => {
        if (!sfx) return
        
        let cancelled = false
        
        const playAudio = async () => {
            if (!cancelled) {
                await playSfx(sfx)
            }
            if (!cancelled) {
                setSfx(0)
            }
        }
        
        playAudio()
        
        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sfx, setSfx])

    // Handle level-based audio (task instructions)
    useEffect(() => {
        if (!currentLevel?.currentTask?.audio) return
        
        let cancelled = false
        
        const playAudio = async () => {
            if (!cancelled) {
                await playVoice(currentLevel.currentTask.audio)
            }
        }
        
        playAudio()
        
        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentLevel?.currentTask])

    // Handle feedback audio (rank announcements, calibration feedback, etc.)
    useEffect(() => {
        if (!feedback) return
        
        let cancelled = false
        
        const playAudio = async () => {
            if (!cancelled) {
                await playVoice(feedback)
            }
            if (!cancelled) {
                setFeedback(0)
            }
        }
        
        playAudio()
        
        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [feedback, setFeedback])

    // Cleanup both channels on unmount
    useEffect(() => {
        return () => {
            if (sfxAudioRef.current) {
                sfxAudioRef.current.pause()
                sfxAudioRef.current = null
            }
            if (voiceAudioRef.current) {
                voiceAudioRef.current.pause()
                voiceAudioRef.current = null
            }
        }
    }, [])

    // this is a purely functional component, so it doesn't need to return anything
    return <></>
}

export default AudioPlayer
