import React, { useEffect, useRef } from 'react'
import { audioManager } from '../services/audioManager'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import {
    feedbackAtom,
    sfxAtom,
    sfxVolumeAtom,
    voiceVolumeAtom,
    stopVoiceRequestAtom,
    musicPlaybackSessionAtom,
    musicVolumeAtom,
    musicFadeInEnabledAtom,
    musicFadeInDurationAtom,
    musicFadeOutEnabledAtom,
    musicFadeOutDurationAtom,
    taskInstructionVoicePhaseAtom,
} from '../atoms/audioAtom'
import { currentLevelAtom } from '../atoms/taskAtom'
import { TaskType } from './Tasks/task'
import { audioProcessingService } from '../services/audioProcessingService'
import {
    consumeInstructionWarmup,
    makeInstructionWarmupKey,
} from '../services/instructionAudioWarmup'

/** ~150 ms silence through destination after MediaElementSource starts — stabilizes output before first instruction voice. */
function settleOutputPipelineAfterMediaElementStart(ctx) {
    return new Promise((resolve) => {
        try {
            const settleLen = Math.ceil(ctx.sampleRate * 0.15)
            const buf = ctx.createBuffer(1, settleLen, ctx.sampleRate)
            const src = ctx.createBufferSource()
            src.buffer = buf
            src.connect(ctx.destination)
            src.onended = resolve
            src.start(0)
        } catch {
            resolve()
        }
    })
}

function AudioPlayer() {
    const [sfx, setSfx] = useAtom(sfxAtom)
    const [feedback, setFeedback] = useAtom(feedbackAtom)
    const stopVoiceRequest = useAtomValue(stopVoiceRequestAtom)
    const currentLevel = useAtomValue(currentLevelAtom)
    const setTaskInstructionVoicePhase = useSetAtom(taskInstructionVoicePhaseAtom)
    const sfxVolume = useAtomValue(sfxVolumeAtom)
    const voiceVolume = useAtomValue(voiceVolumeAtom)

    const musicSession = useAtomValue(musicPlaybackSessionAtom)
    const musicVolume = useAtomValue(musicVolumeAtom)
    const fadeInEnabled = useAtomValue(musicFadeInEnabledAtom)
    const fadeInSec = useAtomValue(musicFadeInDurationAtom)
    const fadeOutEnabled = useAtomValue(musicFadeOutEnabledAtom)
    const fadeOutSec = useAtomValue(musicFadeOutDurationAtom)

    const sfxAudioRef = useRef(null)
    const voiceAudioRef = useRef(null)
    const instructionPlayingRef = useRef(false)
    const instructionTailTimerRef = useRef(null)

    const musicAudioRef = useRef(null)
    const musicGainRef = useRef(null)
    const musicSessionUrlRef = useRef(null)
    const musicRevokeUrlRef = useRef(null)
    const fadeRafRef = useRef(null)
    const fadeOutTimeoutRef = useRef(null)
    const fadeOutResolveRef = useRef(null)
    /** Latest session for effect cleanup (skip teardown when next run will fade out). */
    const musicSessionRef = useRef(musicSession)
    musicSessionRef.current = musicSession

    /** First-task instruction awaits this after BGM `audio.play()` + pipeline settle; null when no level music. */
    const musicStartedPromiseRef = useRef(null)
    const musicStartedResolveRef = useRef(null)

    const resolveMusicStartedGate = () => {
        const r = musicStartedResolveRef.current
        musicStartedResolveRef.current = null
        r?.()
    }

    const createMusicStartedGate = () => {
        resolveMusicStartedGate()
        musicStartedPromiseRef.current = new Promise((resolve) => {
            musicStartedResolveRef.current = resolve
        })
    }

    const voiceBufferSourceRef = useRef(null)
    const voiceWebGainRef = useRef(null)

    const disconnectVoiceWebAudio = () => {
        if (voiceBufferSourceRef.current) {
            try {
                voiceBufferSourceRef.current.stop()
            } catch {
                /* already stopped */
            }
            try {
                voiceBufferSourceRef.current.disconnect()
            } catch {
                /* ignore */
            }
            voiceBufferSourceRef.current = null
        }
        if (voiceWebGainRef.current) {
            try {
                voiceWebGainRef.current.disconnect()
            } catch {
                /* ignore */
            }
            voiceWebGainRef.current = null
        }
    }

    const playSfx = async (soundFile) => {
        if (!soundFile) return

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
        audio.onended = () => {
            sfxAudioRef.current = null
        }
        audio.play().catch((error) => console.error('Error playing SFX:', error))
    }

    const playVoice = (soundFile, { onEnded, signal, resolvedUrl } = {}) => {
        if (!soundFile && !resolvedUrl) return Promise.resolve()

        if (voiceAudioRef.current) {
            voiceAudioRef.current.pause()
            voiceAudioRef.current = null
        }
        disconnectVoiceWebAudio()

        const runWithUrl = async (audioUrl) => {
            if (!audioUrl) {
                console.error(`Could not resolve voice audio: ${soundFile}`)
                return
            }
            if (signal?.aborted) return

            try {
                const ctx = await audioProcessingService.ensureAudioContext()
                if (ctx.state === 'suspended') await ctx.resume()
                if (signal?.aborted) return

                const response = await fetch(audioUrl)
                if (!response.ok) throw new Error(`Voice fetch ${response.status}`)
                const arrayBuffer = await response.arrayBuffer()
                if (signal?.aborted) return

                const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0))
                if (signal?.aborted) return

                const source = ctx.createBufferSource()
                const gain = ctx.createGain()
                gain.gain.value = voiceVolume
                source.buffer = audioBuffer
                source.connect(gain)
                gain.connect(ctx.destination)

                voiceBufferSourceRef.current = source
                voiceWebGainRef.current = gain

                if (ctx.state !== 'running') await ctx.resume()

                await new Promise((resolve) => {
                    let settled = false
                    const handleEnded = () => {
                        if (settled) return
                        settled = true
                        disconnectVoiceWebAudio()
                        onEnded?.()
                        resolve()
                    }

                    if (signal) {
                        signal.addEventListener('abort', () => {
                            disconnectVoiceWebAudio()
                            handleEnded()
                        })
                    }

                    source.onended = handleEnded
                    source.start(0)
                })
                return
            } catch (e) {
                console.warn('Voice Web Audio path failed, falling back to HTMLAudioElement:', e)
            }

            if (signal?.aborted) return

            const audio = new Audio(audioUrl)
            audio.volume = voiceVolume
            voiceAudioRef.current = audio
            audio.onerror = () => console.error(`Error loading voice file: ${audioUrl}`)

            await new Promise((resolve) => {
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
                audio.play().catch((error) => {
                    console.error('Error playing voice:', error)
                    handleEnded()
                })
            })
        }

        if (resolvedUrl) {
            return runWithUrl(resolvedUrl)
        }

        return audioManager.getAudioFile(soundFile).then((audioUrl) => runWithUrl(audioUrl))
    }

    useEffect(() => {
        if (sfxAudioRef.current) sfxAudioRef.current.volume = sfxVolume
    }, [sfxVolume])

    useEffect(() => {
        if (voiceAudioRef.current) voiceAudioRef.current.volume = voiceVolume
        if (voiceWebGainRef.current) voiceWebGainRef.current.gain.value = voiceVolume
    }, [voiceVolume])

    useEffect(() => {
        if (stopVoiceRequest === 0) return
        if (instructionTailTimerRef.current) {
            clearTimeout(instructionTailTimerRef.current)
            instructionTailTimerRef.current = null
        }
        disconnectVoiceWebAudio()
        if (voiceAudioRef.current) {
            voiceAudioRef.current.pause()
            voiceAudioRef.current = null
        }
        instructionPlayingRef.current = false
        setFeedback(0)

        const task = currentLevel?.currentTask
        if (task?.type === TaskType.SPEAK && String(task.audio ?? '').trim()) {
            setTaskInstructionVoicePhase('cooldown')
            instructionTailTimerRef.current = setTimeout(() => {
                instructionTailTimerRef.current = null
                setTaskInstructionVoicePhase('ready')
            }, 200)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stopVoiceRequest])

    /** Disconnect music graph; does not clear fade timeout or resolve pending fade promise. */
    const disconnectMusicGraph = () => {
        if (fadeRafRef.current) {
            cancelAnimationFrame(fadeRafRef.current)
            fadeRafRef.current = null
        }
        audioProcessingService.disconnectMusicReference()
        if (musicAudioRef.current) {
            try {
                musicAudioRef.current.pause()
            } catch (e) {
                /* ignore */
            }
            musicAudioRef.current.src = ''
            musicAudioRef.current = null
        }
        musicGainRef.current = null
        if (musicRevokeUrlRef.current) {
            try {
                URL.revokeObjectURL(musicRevokeUrlRef.current)
            } catch (e) {
                /* ignore */
            }
            musicRevokeUrlRef.current = null
        }
        musicSessionUrlRef.current = null
    }

    /** Clears fade-out timer, resolves any in-flight fade promise, then disconnects. */
    const teardownMusic = () => {
        if (fadeOutTimeoutRef.current) {
            clearTimeout(fadeOutTimeoutRef.current)
            fadeOutTimeoutRef.current = null
        }
        const pendingResolve = fadeOutResolveRef.current
        if (pendingResolve) {
            fadeOutResolveRef.current = null
        }
        disconnectMusicGraph()
        pendingResolve?.()
    }

    const fadeOutThenTeardown = () =>
        new Promise((resolve) => {
            if (fadeOutTimeoutRef.current) {
                clearTimeout(fadeOutTimeoutRef.current)
                fadeOutTimeoutRef.current = null
            }
            const pendingFadeResolve = fadeOutResolveRef.current
            if (pendingFadeResolve) {
                fadeOutResolveRef.current = null
                disconnectMusicGraph()
                pendingFadeResolve()
            }
            const gainNode = musicGainRef.current
            if (!gainNode || !fadeOutEnabled || fadeOutSec <= 0) {
                disconnectMusicGraph()
                resolve()
                return
            }
            // Prefer AudioNode.context — AudioParam.context can be undefined in some environments.
            const ctx = gainNode.context || gainNode.gain?.context
            if (!ctx) {
                disconnectMusicGraph()
                resolve()
                return
            }
            const gainParam = gainNode.gain
            fadeOutResolveRef.current = resolve
            const now = ctx.currentTime
            const start = gainParam.value
            gainParam.cancelScheduledValues(now)
            gainParam.setValueAtTime(start, now)
            gainParam.linearRampToValueAtTime(0, now + fadeOutSec)
            fadeOutTimeoutRef.current = setTimeout(() => {
                fadeOutTimeoutRef.current = null
                const r = fadeOutResolveRef.current
                fadeOutResolveRef.current = null
                disconnectMusicGraph()
                r?.()
            }, fadeOutSec * 1000 + 50)
        })

    useEffect(() => {
        const { url, stopFade } = musicSession
        let cancelled = false

        const startMusic = async () => {
            if (!url) {
                resolveMusicStartedGate()
                musicStartedPromiseRef.current = null
                if (stopFade && musicAudioRef.current && musicGainRef.current) {
                    await fadeOutThenTeardown()
                    if (cancelled) return
                } else {
                    teardownMusic()
                }
                return
            }

            createMusicStartedGate()
            teardownMusic()
            if (cancelled) {
                resolveMusicStartedGate()
                return
            }

            try {
                const ctx = await audioProcessingService.ensureAudioContext()
                await ctx.resume()
                if (cancelled) return

                const audio = new Audio(url)
                audio.loop = true
                audio.volume = 1.0
                musicAudioRef.current = audio
                musicSessionUrlRef.current = url

                const gain = ctx.createGain()
                musicGainRef.current = gain
                const target = Math.max(0, Math.min(1, musicVolume))
                if (fadeInEnabled && fadeInSec > 0) {
                    gain.gain.value = 0
                    audioProcessingService.connectMusicReference(audio, gain)
                    const t0 = ctx.currentTime
                    gain.gain.setValueAtTime(0, t0)
                    gain.gain.linearRampToValueAtTime(target, t0 + fadeInSec)
                } else {
                    gain.gain.value = target
                    audioProcessingService.connectMusicReference(audio, gain)
                }

                await audio.play()
                if (!cancelled) {
                    await settleOutputPipelineAfterMediaElementStart(ctx)
                }
            } catch (e) {
                if (!cancelled) console.error('Background music playback error:', e)
                teardownMusic()
            } finally {
                resolveMusicStartedGate()
            }
        }

        startMusic()

        return () => {
            cancelled = true
            const ms = musicSessionRef.current
            // Stop with fade: next effect run will fade using existing graph — do not tear down here.
            if (ms.url === null && ms.stopFade) {
                resolveMusicStartedGate()
                return
            }
            resolveMusicStartedGate()
            if (!ms.url) {
                musicStartedPromiseRef.current = null
            }
            teardownMusic()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [musicSession.generation])

    useEffect(() => {
        if (!musicGainRef.current || !musicSessionUrlRef.current) return
        const gainNode = musicGainRef.current
        const g = gainNode.gain
        const ctx = gainNode.context || g.context
        if (!ctx) return
        const target = Math.max(0, Math.min(1, musicVolume))
        const t = ctx.currentTime
        g.cancelScheduledValues(t)
        g.setValueAtTime(g.value, t)
        g.linearRampToValueAtTime(target, t + 0.05)
    }, [musicVolume])

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

    useEffect(() => {
        const task = currentLevel?.currentTask
        if (!task?.audio) return

        let cancelled = false
        instructionPlayingRef.current = true
        const isSpeak = task.type === TaskType.SPEAK
        if (isSpeak) {
            setTaskInstructionVoicePhase('playing')
        }

        const isFirstTask =
            Array.isArray(currentLevel?.completedTasks) &&
            currentLevel.completedTasks.length === 0

        let instructionResolvedUrl = null
        if (
            isFirstTask &&
            currentLevel?.id != null &&
            task?.id != null &&
            task?.audio != null
        ) {
            const key = makeInstructionWarmupKey(currentLevel.id, task.id, task.audio)
            instructionResolvedUrl = consumeInstructionWarmup(key)
        }

        const playAudio = async () => {
            if (cancelled) return
            const musicGate = musicStartedPromiseRef.current
            if (isFirstTask && musicGate) {
                await musicGate
                if (cancelled) return
            }
            await playVoice(task.audio, {
                resolvedUrl: instructionResolvedUrl || undefined,
                onEnded: () => {
                    instructionPlayingRef.current = false
                    if (cancelled || !isSpeak) return
                    setTaskInstructionVoicePhase('cooldown')
                    if (instructionTailTimerRef.current) {
                        clearTimeout(instructionTailTimerRef.current)
                    }
                    instructionTailTimerRef.current = setTimeout(() => {
                        instructionTailTimerRef.current = null
                        if (!cancelled) setTaskInstructionVoicePhase('ready')
                    }, 200)
                },
            })
        }

        playAudio()

        return () => {
            cancelled = true
            instructionPlayingRef.current = false
            if (instructionTailTimerRef.current) {
                clearTimeout(instructionTailTimerRef.current)
                instructionTailTimerRef.current = null
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        currentLevel?.id,
        currentLevel?.completedTasks?.length,
        currentLevel?.currentTask?.id,
        currentLevel?.currentTask?.audio,
        currentLevel?.currentTask?.type,
    ])

    useEffect(() => {
        if (!feedback) return

        if (currentLevel?.currentTask?.type === TaskType.SPEAK) {
            setFeedback(0)
            return
        }

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

    useEffect(() => {
        return () => {
            resolveMusicStartedGate()
            musicStartedPromiseRef.current = null
            if (sfxAudioRef.current) {
                sfxAudioRef.current.pause()
                sfxAudioRef.current = null
            }
            disconnectVoiceWebAudio()
            if (voiceAudioRef.current) {
                voiceAudioRef.current.pause()
                voiceAudioRef.current = null
            }
            teardownMusic()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return <></>
}

export default AudioPlayer
