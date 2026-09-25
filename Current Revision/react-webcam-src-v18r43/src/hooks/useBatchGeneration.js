import { useCallback, useRef, useState } from 'react'
import { generateSpeech, ELEVENLABS_CONCURRENCY } from '../services/elevenlabsService'

/**
 * Concurrent batch runner for ElevenLabs TTS jobs.
 * @param {object} options
 * @param {number} [options.concurrency]
 */
export function useBatchGeneration({ concurrency = ELEVENLABS_CONCURRENCY } = {}) {
    const [isRunning, setIsRunning] = useState(false)
    const [summary, setSummary] = useState(null)
    const cancelledRef = useRef(false)
    const generationIdRef = useRef(0)

    const cancelBatch = useCallback(() => {
        cancelledRef.current = true
    }, [])

    const runBatch = useCallback(
        async (jobs, settings, { onJobStart, onJobSuccess, onJobError, onComplete }) => {
            if (!jobs.length) return

            const generationId = ++generationIdRef.current
            cancelledRef.current = false
            setIsRunning(true)
            setSummary(null)

            const state = { succeeded: 0, failed: 0, active: 0, nextIndex: 0 }

            const isStale = () =>
                cancelledRef.current || generationIdRef.current !== generationId

            return new Promise((resolve) => {
                const finishBatch = (cancelled) => {
                    setIsRunning(false)
                    const result = {
                        succeeded: state.succeeded,
                        failed: state.failed,
                        cancelled,
                    }
                    setSummary(result)
                    onComplete?.(result)
                    resolve(result)
                }

                const tryFinish = () => {
                    if (state.nextIndex >= jobs.length && state.active === 0) {
                        finishBatch(isStale())
                    }
                }

                const runJob = (job) => {
                    state.active++
                    onJobStart?.(job)

                    generateSpeech(job.text, settings)
                        .then(async (blob) => {
                            if (isStale()) return
                            try {
                                await onJobSuccess?.(job, blob)
                                if (!isStale()) state.succeeded++
                            } catch (err) {
                                if (!isStale()) {
                                    state.failed++
                                    onJobError?.(job, err)
                                }
                            }
                        })
                        .catch((err) => {
                            if (isStale()) return
                            state.failed++
                            onJobError?.(job, err)
                        })
                        .finally(() => {
                            state.active--
                            if (isStale() && state.active === 0) {
                                finishBatch(true)
                            } else if (state.nextIndex < jobs.length && !isStale()) {
                                processNext()
                            } else {
                                tryFinish()
                            }
                        })
                }

                const processNext = () => {
                    if (isStale()) {
                        if (state.active === 0) {
                            finishBatch(true)
                        }
                        return
                    }

                    while (
                        state.active < concurrency &&
                        state.nextIndex < jobs.length &&
                        !isStale()
                    ) {
                        const job = jobs[state.nextIndex]
                        state.nextIndex++
                        runJob(job)
                    }
                }

                processNext()
            })
        },
        [concurrency]
    )

    return {
        isRunning,
        summary,
        runBatch,
        cancelBatch,
    }
}
