import { useEffect, useRef } from 'react'

const HoldState = {
    NOT_STARTED: 'NOT_STARTED',
    CORRECT_DEPTH: 'CORRECT_DEPTH',
    SHALLOW_ONE: 'SHALLOW_ONE',
    DEEP_ONE: 'DEEP_ONE',
    COMPLETED: 'COMPLETED',
}

const FILL_BLUE = 'var(--accent)'
const FILL_GRAY = 'var(--muted)'

function applyBarToDom(barRef, taskTime, effectiveTime, holdState) {
    const { fillEl, labelEl } = barRef.current
    if (!fillEl) return

    const progress = taskTime
        ? Math.min(100, (effectiveTime / taskTime) * 100)
        : 0
    const atCorrectDepth = holdState === HoldState.CORRECT_DEPTH

    fillEl.style.width = `${progress}%`
    fillEl.style.backgroundColor = atCorrectDepth ? FILL_BLUE : FILL_GRAY

    if (labelEl) {
        const remaining = taskTime
            ? Math.max(0, taskTime - effectiveTime).toFixed(1)
            : '0'
        labelEl.textContent = `${remaining}s`
    }
}

/**
 * Drives HoldProgressBar imperatively via direct DOM updates.
 * Isolated from HoldDepth scoring/timeTracking state and React re-renders.
 */
export function useHoldProgress(holdState, taskTime, taskId) {
    const barRef = useRef({ fillEl: null, labelEl: null })
    const holdStateRef = useRef(holdState)
    const taskTimeRef = useRef(taskTime)
    const effectiveTimeRef = useRef(0)
    const lastFrameTimeRef = useRef(null)
    const animationFrameRef = useRef(null)

    holdStateRef.current = holdState
    taskTimeRef.current = taskTime

    useEffect(() => {
        effectiveTimeRef.current = 0
        lastFrameTimeRef.current = null
        applyBarToDom(barRef, taskTimeRef.current, 0, holdStateRef.current)
    }, [taskId])

    useEffect(() => {
        if (holdState === HoldState.NOT_STARTED) {
            effectiveTimeRef.current = 0
            lastFrameTimeRef.current = null
            applyBarToDom(barRef, taskTimeRef.current, 0, holdState)
        }
    }, [holdState])

    useEffect(() => {
        const updateTime = () => {
            const now = performance.now()
            const state = holdStateRef.current

            if (!lastFrameTimeRef.current) {
                lastFrameTimeRef.current = now
                animationFrameRef.current = requestAnimationFrame(updateTime)
                return
            }

            const deltaTime = (now - lastFrameTimeRef.current) / 1000
            lastFrameTimeRef.current = now

            switch (state) {
                case HoldState.CORRECT_DEPTH:
                    effectiveTimeRef.current += deltaTime
                    break
                case HoldState.DEEP_ONE:
                    effectiveTimeRef.current += deltaTime * 0.25
                    break
                case HoldState.SHALLOW_ONE:
                    effectiveTimeRef.current = Math.max(0, effectiveTimeRef.current - deltaTime)
                    break
                default:
                    break
            }

            applyBarToDom(
                barRef,
                taskTimeRef.current,
                effectiveTimeRef.current,
                state,
            )

            animationFrameRef.current = requestAnimationFrame(updateTime)
        }

        animationFrameRef.current = requestAnimationFrame(updateTime)

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
        }
    }, [taskId])

    return { barRef }
}
