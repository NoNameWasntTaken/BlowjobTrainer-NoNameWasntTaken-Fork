import React, { useEffect, useRef } from 'react'
import { audioManager } from '../services/audioManager'
import { useAtom, useAtomValue } from 'jotai'
import { feedbackAtom, sfxAtom, sfxVolumeAtom, voiceVolumeAtom, stopVoiceRequestAtom } from '../atoms/audioAtom'
import { currentLevelAtom } from '../atoms/taskAtom'

function AudioPlayer() {
    const [sfx, setSfx] = useAtom(sfxAtom)
    const [feedback, setFeedback] = useAtom(feedbackAtom)
    const stopVoiceRequest = useAtomValue(stopVoiceRequestAtom)
    const currentLevel = useAtomValue(currentLevelAtom)
    const sfxVolume = useAtomValue(sfxVolumeAtom)
    const voiceVolume = useAtomValue(voiceVolumeAtom)
    
    // Separate refs for SFX and voice channels so they don't interrupt each other
    const sfxAudioRef = useRef(null)
    const voiceAudioRef = useRef(null)
    const instructionPlayingRef = useRef(false)

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
    // Optional signal: when aborted, stops playback immediately
    // Returns a Promise that resolves when playback ends (naturally or via abort)
    const playVoice = (soundFile, { onEnded, signal } = {}) => {
        if (!soundFile) return Promise.resolve()

        // Stop previous voice only
        if (voiceAudioRef.current) {
            voiceAudioRef.current.pause()
            voiceAudioRef.current = null
        }

        return audioManager.getAudioFile(soundFile).then((audioUrl) => {
            if (!audioUrl) {
                console.error(`Could not resolve voice audio: ${soundFile}`)
                return
            }

            if (signal?.aborted) return

            const audio = new Audio(audioUrl)
            audio.volume = voiceVolume
            voiceAudioRef.current = audio
            audio.onerror = () => console.error(`Error loading voice file: ${audioUrl}`)

            return new Promise((resolve) => {
                const handleEnded = () => {
                    voiceAudioRef.current = null
                    onEnded?.()
                    resolve()
                }

                if (signal) {
                    signal.addEventListener('abort', () => {
                        if (voiceAudioRef.current === audio) {
                            voiceAudioRef.current.pause()
                            voiceAudioRef.current = null
                            handleEnded()
                        }
                    })
                }

                audio.onended = handleEnded
                audio.play().catch(error => console.error("Error playing voice:", error))
            })
        })
    }

    // Apply volume changes to currently playing audio
    useEffect(() => {
        if (sfxAudioRef.current) sfxAudioRef.current.volume = sfxVolume
    }, [sfxVolume])

    useEffect(() => {
        if (voiceAudioRef.current) voiceAudioRef.current.volume = voiceVolume
    }, [voiceVolume])

    // When stopVoiceRequest increments, stop voice channel and clear feedback
    useEffect(() => {
        if (stopVoiceRequest === 0) return
        if (voiceAudioRef.current) {
            voiceAudioRef.current.pause()
            voiceAudioRef.current = null
        }
        instructionPlayingRef.current = false
        setFeedback(0)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stopVoiceRequest])

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
        instructionPlayingRef.current = true
        
        const playAudio = async () => {
            if (!cancelled) {
                await playVoice(currentLevel.currentTask.audio, {
                    onEnded: () => {
                        instructionPlayingRef.current = false
                    }
                })
            }
        }
        
        playAudio()
        
        return () => {
            cancelled = true
            instructionPlayingRef.current = false
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentLevel?.currentTask])

    // Handle feedback audio (rank announcements, calibration feedback, etc.)
    // Uses AbortController so cleanup can stop in-flight playback immediately
    useEffect(() => {
        if (!feedback) return
        
        if (instructionPlayingRef.current) {
            setFeedback(0)
            return
        }
        
        const controller = new AbortController()
        const { signal } = controller
        
        const playAudio = async () => {
            if (signal.aborted) return
            await playVoice(feedback, { signal })
            if (!signal.aborted) {
                setFeedback(0)
            }
        }
        
        playAudio()
        
        return () => {
            controller.abort()
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
