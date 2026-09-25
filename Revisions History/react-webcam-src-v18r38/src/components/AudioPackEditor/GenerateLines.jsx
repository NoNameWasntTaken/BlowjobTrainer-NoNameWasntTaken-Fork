import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAtom } from 'jotai'
import {
    apiKeyAtom,
    voiceIdAtom,
    speedAtom,
    stabilityAtom,
    similarityAtom,
    styleAtom,
} from '../../atoms/elevenlabsAtom'
import VoiceSettingSlider from './VoiceSettingSlider'
import { getProcessedCategoryGroups } from '../../constants/audioCategoryGroups'
import {
    getGeneratableCategories,
    getGeneratableKeys,
    makeLineId,
} from '../../utils/generatableAudioKeys'
import { storeGeneratedAudio } from '../../utils/audioPackPathUtils'
import { useBatchGeneration } from '../../hooks/useBatchGeneration'
import { generateSpeech } from '../../services/elevenlabsService'
import {
    appendAudioFile,
    playPackAudioFile,
    removeAudioFileFromPack,
} from './packAudioFileUtils'

const STATUS = {
    IDLE: 'idle',
    GENERATING: 'generating',
    DONE: 'done',
    ERROR: 'error',
}

function makeEventId(category, key) {
    return makeLineId(category, key)
}

function makeVariantJobId(eventId, variantId) {
    return `${eventId}#${variantId}`
}

function parseVariantJobId(jobId) {
    const hash = jobId.indexOf('#')
    if (hash === -1) return null
    const eventId = jobId.slice(0, hash)
    const variantId = jobId.slice(hash + 1)
    const dot = eventId.indexOf('.')
    if (dot === -1) return null
    return {
        eventId,
        variantId,
        category: eventId.slice(0, dot),
        key: eventId.slice(dot + 1),
    }
}

function createVariant(text = '') {
    return {
        id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        text,
        status: STATUS.IDLE,
        error: null,
        customContentUrl: null,
    }
}

function defaultEventState() {
    return {
        variants: [createVariant('')],
    }
}

function lineStateHasContent(lineState) {
    for (const event of Object.values(lineState)) {
        if (!event?.variants) continue
        if (event.variants.length > 1) return true
        for (const variant of event.variants) {
            if (
                variant.text?.trim() ||
                variant.status !== STATUS.IDLE ||
                variant.customContentUrl ||
                variant.error
            ) {
                return true
            }
        }
    }
    return false
}

function buildClearedLineState(category) {
    const next = {}
    if (category) {
        for (const key of getGeneratableKeys(category)) {
            next[makeEventId(category, key)] = defaultEventState()
        }
    }
    return next
}

function collectVariantJobsForEvent(lineState, category, key) {
    const eventId = makeEventId(category, key)
    const event = lineState[eventId]
    if (!event?.variants) return []

    const jobs = []
    for (const variant of event.variants) {
        const text = variant.text?.trim()
        if (!text) continue
        jobs.push({
            id: makeVariantJobId(eventId, variant.id),
            category,
            key,
            variantId: variant.id,
            text,
            previousCustomContentUrl: variant.customContentUrl || null,
        })
    }
    return jobs
}

function collectBatchJobs(lineState, category) {
    const jobs = []
    for (const key of getGeneratableKeys(category)) {
        jobs.push(...collectVariantJobsForEvent(lineState, category, key))
    }
    return jobs
}

function collectFailedJobs(lineState, category) {
    const jobs = []
    for (const key of getGeneratableKeys(category)) {
        const eventId = makeEventId(category, key)
        const event = lineState[eventId]
        if (!event?.variants) continue
        for (const variant of event.variants) {
            if (variant.status !== STATUS.ERROR || !variant.text?.trim()) continue
            jobs.push({
                id: makeVariantJobId(eventId, variant.id),
                category,
                key,
                variantId: variant.id,
                text: variant.text.trim(),
                previousCustomContentUrl: variant.customContentUrl || null,
            })
        }
    }
    return jobs
}

function countFailedVariants(lineState, category) {
    let count = 0
    for (const key of getGeneratableKeys(category)) {
        const event = lineState[makeEventId(category, key)]
        if (!event?.variants) continue
        count += event.variants.filter((v) => v.status === STATUS.ERROR).length
    }
    return count
}

function getInitialCategory(processedGroups) {
    for (const group of processedGroups) {
        if (group.categories.length > 0) {
            return group.categories[0]
        }
    }
    return getGeneratableCategories()[0] || ''
}

const GenerateLines = ({ pack, isEditing, customNames, onUpdateAudioFiles }) => {
    const [apiKey, setApiKey] = useAtom(apiKeyAtom)
    const [voiceId, setVoiceId] = useAtom(voiceIdAtom)
    const [speed, setSpeed] = useAtom(speedAtom)
    const [stability, setStability] = useAtom(stabilityAtom)
    const [similarity, setSimilarity] = useAtom(similarityAtom)
    const [style, setStyle] = useAtom(styleAtom)

    useEffect(() => {
        if (pack.elevenLabsVoiceId) {
            setVoiceId(pack.elevenLabsVoiceId)
        }
    }, [pack.id, pack.elevenLabsVoiceId, setVoiceId])

    const generatableSet = useMemo(() => new Set(getGeneratableCategories()), [])

    const processedGroups = useMemo(
        () =>
            getProcessedCategoryGroups(true)
                .map((group) => ({
                    ...group,
                    categories: group.categories.filter((cat) => generatableSet.has(cat)),
                }))
                .filter((group) => group.categories.length > 0),
        [generatableSet]
    )

    const [selectedCategory, setSelectedCategory] = useState(() => getInitialCategory(processedGroups))
    const [selectedKey, setSelectedKey] = useState('')
    const [lineState, setLineState] = useState({})
    const [singleGeneratingId, setSingleGeneratingId] = useState(null)

    const { isRunning, summary, runBatch, cancelBatch } = useBatchGeneration()

    const availableKeys = useMemo(
        () => (selectedCategory ? getGeneratableKeys(selectedCategory) : []),
        [selectedCategory]
    )

    const ensureEvent = useCallback((category, key) => {
        if (!category || !key) return
        const eventId = makeEventId(category, key)
        setLineState((prev) => {
            if (prev[eventId]) return prev
            return { ...prev, [eventId]: defaultEventState() }
        })
    }, [])

    const initCategoryLines = useCallback((category) => {
        if (!category) return
        setLineState((prev) => {
            const next = { ...prev }
            for (const key of getGeneratableKeys(category)) {
                const eventId = makeEventId(category, key)
                if (!next[eventId]) {
                    next[eventId] = defaultEventState()
                }
            }
            return next
        })
    }, [])

    useEffect(() => {
        if (!selectedCategory) return
        const keys = getGeneratableKeys(selectedCategory)
        if (keys.length === 0) {
            setSelectedKey('')
            return
        }
        if (!keys.includes(selectedKey)) {
            setSelectedKey(keys[0])
        }
    }, [selectedCategory, selectedKey])

    useEffect(() => {
        if (selectedCategory) {
            initCategoryLines(selectedCategory)
        }
    }, [selectedCategory, initCategoryLines])

    useEffect(() => {
        if (selectedCategory && selectedKey) {
            ensureEvent(selectedCategory, selectedKey)
        }
    }, [selectedCategory, selectedKey, ensureEvent])

    const voiceSettings = useMemo(
        () => ({ apiKey, voiceId, speed, stability, similarity, style }),
        [apiKey, voiceId, speed, stability, similarity, style]
    )

    const canGenerate = isEditing && apiKey && voiceId
    const batchCount = useMemo(
        () => collectBatchJobs(lineState, selectedCategory).length,
        [lineState, selectedCategory]
    )
    const currentVariantCount = useMemo(
        () =>
            selectedCategory && selectedKey
                ? collectVariantJobsForEvent(lineState, selectedCategory, selectedKey).length
                : 0,
        [lineState, selectedCategory, selectedKey]
    )
    const failedCount = useMemo(
        () => countFailedVariants(lineState, selectedCategory),
        [lineState, selectedCategory]
    )
    const hasLineContent = useMemo(() => lineStateHasContent(lineState), [lineState])

    const currentEventId =
        selectedCategory && selectedKey ? makeEventId(selectedCategory, selectedKey) : null
    const currentEvent = currentEventId
        ? lineState[currentEventId] || defaultEventState()
        : null
    const currentVariants = currentEvent?.variants ?? []

    const updateVariant = useCallback((eventId, variantId, patch) => {
        setLineState((prev) => {
            const event = prev[eventId]
            if (!event?.variants) return prev
            return {
                ...prev,
                [eventId]: {
                    ...event,
                    variants: event.variants.map((v) =>
                        v.id === variantId
                            ? {
                                  text: '',
                                  status: STATUS.IDLE,
                                  error: null,
                                  customContentUrl: null,
                                  ...v,
                                  ...patch,
                              }
                            : v
                    ),
                },
            }
        })
    }, [])

    const addVariant = useCallback((eventId) => {
        setLineState((prev) => {
            const event = prev[eventId]
            if (!event?.variants) return prev
            return {
                ...prev,
                [eventId]: {
                    ...event,
                    variants: [...event.variants, createVariant('')],
                },
            }
        })
    }, [])

    const removeVariant = useCallback((eventId, variantId) => {
        setLineState((prev) => {
            const event = prev[eventId]
            if (!event?.variants || event.variants.length <= 1) return prev
            return {
                ...prev,
                [eventId]: {
                    ...event,
                    variants: event.variants.filter((v) => v.id !== variantId),
                },
            }
        })
    }, [])

    const handleCategoryChange = (e) => {
        setSelectedCategory(e.target.value)
    }

    const handleKeyChange = (e) => {
        setSelectedKey(e.target.value)
    }

    const commitBlob = useCallback(
        async (category, key, blob, previousCustomContentUrl = null) => {
            const { customContentUrl } = await storeGeneratedAudio(pack.id, category, key, blob)
            onUpdateAudioFiles((prev) => {
                let next = prev
                if (previousCustomContentUrl) {
                    next = removeAudioFileFromPack(next, category, key, previousCustomContentUrl)
                }
                return appendAudioFile(next, category, key, customContentUrl)
            })
            return customContentUrl
        },
        [pack.id, onUpdateAudioFiles]
    )

    const runJobs = useCallback(
        async (jobs) => {
            if (!canGenerate || jobs.length === 0 || isRunning) return

            await runBatch(jobs, voiceSettings, {
                onJobStart: (job) => {
                    const parsed = parseVariantJobId(job.id)
                    if (!parsed) return
                    updateVariant(parsed.eventId, parsed.variantId, {
                        status: STATUS.GENERATING,
                        error: null,
                    })
                },
                onJobSuccess: async (job, blob) => {
                    const parsed = parseVariantJobId(job.id)
                    if (!parsed) return
                    try {
                        const customContentUrl = await commitBlob(
                            parsed.category,
                            parsed.key,
                            blob,
                            job.previousCustomContentUrl
                        )
                        updateVariant(parsed.eventId, parsed.variantId, {
                            status: STATUS.DONE,
                            error: null,
                            customContentUrl,
                        })
                    } catch (err) {
                        updateVariant(parsed.eventId, parsed.variantId, {
                            status: STATUS.ERROR,
                            error: err.message || 'Failed to save audio',
                        })
                    }
                },
                onJobError: (job, err) => {
                    const parsed = parseVariantJobId(job.id)
                    if (!parsed) return
                    updateVariant(parsed.eventId, parsed.variantId, {
                        status: STATUS.ERROR,
                        error: err.message || 'Generation failed',
                    })
                },
            })
        },
        [canGenerate, isRunning, runBatch, voiceSettings, updateVariant, commitBlob]
    )

    const handleGenerateVariant = async (category, key, variantId) => {
        const eventId = makeEventId(category, key)
        const variant = lineState[eventId]?.variants?.find((v) => v.id === variantId)
        const text = variant?.text?.trim()
        if (!canGenerate || !text || isRunning || singleGeneratingId) return

        setSingleGeneratingId(makeVariantJobId(eventId, variantId))
        updateVariant(eventId, variantId, { status: STATUS.GENERATING, error: null })

        try {
            const blob = await generateSpeech(text, voiceSettings)
            const customContentUrl = await commitBlob(
                category,
                key,
                blob,
                variant.customContentUrl || null
            )
            updateVariant(eventId, variantId, {
                status: STATUS.DONE,
                error: null,
                customContentUrl,
            })
        } catch (err) {
            updateVariant(eventId, variantId, {
                status: STATUS.ERROR,
                error: err.message || 'Generation failed',
            })
        } finally {
            setSingleGeneratingId(null)
        }
    }

    const handleGenerateCurrentVariants = () => {
        const jobs = collectVariantJobsForEvent(lineState, selectedCategory, selectedKey)
        runJobs(jobs)
    }

    const handleGenerateBatch = () => {
        const jobs = collectBatchJobs(lineState, selectedCategory)
        runJobs(jobs)
    }

    const handleRetryFailed = () => {
        const jobs = collectFailedJobs(lineState, selectedCategory)
        runJobs(jobs)
    }

    const handleClearAllLines = useCallback(() => {
        if (!hasLineContent) return
        if (
            !window.confirm(
                'Clear all voice lines in the generator? Generated audio files will remain in the voice pack.'
            )
        ) {
            return
        }
        if (isRunning) cancelBatch()
        setSingleGeneratingId(null)
        setLineState(buildClearedLineState(selectedCategory))
    }, [hasLineContent, isRunning, cancelBatch, selectedCategory])

    const handleDeleteGeneratedAudio = useCallback(
        (category, key, variantId) => {
            const eventId = makeEventId(category, key)
            const variant = lineState[eventId]?.variants?.find((v) => v.id === variantId)
            if (!variant?.customContentUrl) return

            onUpdateAudioFiles((prev) =>
                removeAudioFileFromPack(prev, category, key, variant.customContentUrl)
            )
            updateVariant(eventId, variantId, {
                customContentUrl: null,
                status: STATUS.IDLE,
            })
        },
        [lineState, onUpdateAudioFiles, updateVariant]
    )

    const getCustomDisplayName = (key) => {
        const name = customNames?.[`Custom.${key}`]
        return name?.trim() ? name.trim() : null
    }

    const formatKeyLabel = (category, key) => {
        if (category !== 'Custom') return key
        const displayName = getCustomDisplayName(key)
        return displayName ? `${key} (${displayName})` : key
    }

    const renderStatus = (variant) => {
        if (!variant) return null
        if (variant.status === STATUS.GENERATING) {
            return <span className="generate-lines-status generating">Generating…</span>
        }
        if (variant.status === STATUS.DONE) {
            return <span className="generate-lines-status done">Done</span>
        }
        if (variant.status === STATUS.ERROR) {
            return (
                <span className="generate-lines-status error" title={variant.error || 'Error'}>
                    Error
                </span>
            )
        }
        return <span className="generate-lines-status idle">—</span>
    }

    return (
        <div className="generate-lines">
            <h3>Generate Lines (ElevenLabs)</h3>

            {!isEditing && (
                <div className="generate-lines-banner">
                    Select or save an audio pack first. Generated audio requires a pack ID to store files.
                </div>
            )}

            {(!apiKey || !voiceId) && (
                <div className="generate-lines-banner generate-lines-banner--warn">
                    Enter your ElevenLabs API Key and Voice ID below to generate audio.
                </div>
            )}

            <div className="generate-lines-api-config">
                <div className="generate-lines-api-row">
                    <label>
                        API Key
                        <input
                            type="text"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="ElevenLabs API Key"
                        />
                    </label>
                    <label>
                        Voice ID
                        <input
                            type="text"
                            value={voiceId}
                            onChange={(e) => setVoiceId(e.target.value)}
                            placeholder="ElevenLabs Voice ID"
                        />
                    </label>
                </div>
                <div className="generate-lines-voice-settings column-centered">
                    <VoiceSettingSlider
                        label="Speed"
                        value={speed}
                        onChange={setSpeed}
                        min={0.7}
                        max={1.2}
                        step={0.01}
                        formatValue={(v) => v.toFixed(2)}
                    />
                    <div className="voice-setting-slider-group">
                        <VoiceSettingSlider
                            label="Stability"
                            value={stability}
                            onChange={setStability}
                            min={0}
                            max={100}
                            step={1}
                        />
                        <p
                            className="voice-setting-warning"
                            style={{ visibility: stability < 30 ? 'visible' : 'hidden' }}
                        >
                            Under 30% stability may lead to instability.
                        </p>
                    </div>
                    <VoiceSettingSlider
                        label="Similarity"
                        value={similarity}
                        onChange={setSimilarity}
                        min={0}
                        max={100}
                        step={1}
                    />
                    <div className="voice-setting-slider-group">
                        <VoiceSettingSlider
                            label="Style Exaggeration"
                            value={style}
                            onChange={setStyle}
                            min={0}
                            max={100}
                            step={1}
                        />
                        <p
                            className="voice-setting-warning"
                            style={{ visibility: style > 50 ? 'visible' : 'hidden' }}
                        >
                            Over 50% style exaggeration may lead to instability.
                        </p>
                    </div>
                </div>
            </div>

            <div className="generate-lines-category-picker">
                <h4>Voice Line</h4>
                <p className="generate-lines-hint">
                    Select a category and subcategory, add variant lines, then generate individually or batch-generate all non-empty variants.
                </p>
                <div className="generate-lines-dropdowns">
                    <label>
                        Category
                        <select
                            className="select"
                            value={selectedCategory}
                            onChange={handleCategoryChange}
                        >
                            {processedGroups.map((group) => (
                                <optgroup key={group.heading} label={group.heading}>
                                    {group.categories.map((category) => (
                                        <option key={category} value={category}>
                                            {category}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </label>
                    <label>
                        Subcategory
                        <select
                            className="select"
                            value={selectedKey}
                            onChange={handleKeyChange}
                            disabled={availableKeys.length === 0}
                        >
                            {availableKeys.length === 0 ? (
                                <option value="">No subcategories</option>
                            ) : (
                                availableKeys.map((key) => (
                                    <option key={key} value={key}>
                                        {formatKeyLabel(selectedCategory, key)}
                                    </option>
                                ))
                            )}
                        </select>
                    </label>
                </div>
            </div>

            {currentEventId && currentVariants.length > 0 && (
                <div className="generate-lines-line-editor">
                    <h4 className="generate-lines-variant-heading">
                        {selectedCategory}.{selectedKey}
                    </h4>
                    <div className="generate-lines-variant-list">
                        {currentVariants.map((variant, index) => {
                            const hasText = !!variant.text?.trim()

                            return (
                                <div key={variant.id} className="generate-lines-variant-row">
                                    <span className="generate-lines-variant-label">
                                        {index + 1}:
                                    </span>
                                    <div className="generate-lines-variant-body">
                                        <input
                                            type="text"
                                            className="generate-lines-text-input"
                                            value={variant.text}
                                            onChange={(e) =>
                                                updateVariant(currentEventId, variant.id, {
                                                    text: e.target.value,
                                                })
                                            }
                                            placeholder="Enter text to generate"
                                        />
                                        <div className="generate-lines-variant-action-groups">
                                            <div className="generate-lines-action-group">
                                                <span className="generate-lines-action-group-label">
                                                    Line
                                                </span>
                                                {renderStatus(variant)}
                                                <button
                                                    type="button"
                                                    className="button button-primary"
                                                    onClick={() =>
                                                        handleGenerateVariant(
                                                            selectedCategory,
                                                            selectedKey,
                                                            variant.id
                                                        )
                                                    }
                                                    disabled={
                                                        !canGenerate ||
                                                        !hasText ||
                                                        isRunning ||
                                                        singleGeneratingId !== null ||
                                                        variant.status === STATUS.GENERATING
                                                    }
                                                >
                                                    Generate
                                                </button>
                                                <button
                                                    type="button"
                                                    className="button"
                                                    onClick={() =>
                                                        removeVariant(currentEventId, variant.id)
                                                    }
                                                    disabled={
                                                        currentVariants.length <= 1 || isRunning
                                                    }
                                                    title="Remove this text line from the generator; audio stays in pack"
                                                >
                                                    Remove line
                                                </button>
                                            </div>
                                            {variant.customContentUrl && (
                                                <div className="generate-lines-action-group generate-lines-action-group--audio">
                                                    <span className="generate-lines-action-group-label">
                                                        Audio
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className="button"
                                                        onClick={() =>
                                                            playPackAudioFile(
                                                                variant.customContentUrl
                                                            )
                                                        }
                                                        disabled={
                                                            isRunning ||
                                                            variant.status === STATUS.GENERATING
                                                        }
                                                    >
                                                        ▶ Play
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="button"
                                                        onClick={() =>
                                                            handleDeleteGeneratedAudio(
                                                                selectedCategory,
                                                                selectedKey,
                                                                variant.id
                                                            )
                                                        }
                                                        disabled={
                                                            isRunning ||
                                                            variant.status === STATUS.GENERATING
                                                        }
                                                        title="Remove generated audio from pack; keep this text line"
                                                    >
                                                        Delete audio
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <div className="generate-lines-variant-toolbar">
                        <button
                            type="button"
                            className="button generate-lines-add-variant"
                            onClick={() => addVariant(currentEventId)}
                            disabled={isRunning}
                        >
                            + Add line
                        </button>
                        <button
                            type="button"
                            className="button button-primary"
                            onClick={handleGenerateCurrentVariants}
                            disabled={
                                !canGenerate ||
                                currentVariantCount === 0 ||
                                isRunning ||
                                !!singleGeneratingId
                            }
                        >
                            Generate category lines ({currentVariantCount})
                        </button>
                    </div>
                </div>
            )}

            <div className="generate-lines-batch-toolbar">
                <button
                    className="button button-primary"
                    onClick={handleGenerateBatch}
                    disabled={!canGenerate || batchCount === 0 || isRunning || !!singleGeneratingId}
                >
                    Generate all lines ({batchCount})
                </button>
                <button
                    type="button"
                    className="button button-danger-outline"
                    onClick={handleClearAllLines}
                    disabled={!hasLineContent || isRunning || !!singleGeneratingId}
                    title="Clear all text lines in the generator; audio files stay in the pack"
                >
                    Clear all lines
                </button>
                {isRunning && (
                    <button className="button" onClick={cancelBatch}>
                        Cancel
                    </button>
                )}
                {failedCount > 0 && !isRunning && (
                    <button className="button" onClick={handleRetryFailed} disabled={!canGenerate}>
                        Retry failed ({failedCount})
                    </button>
                )}
                {summary && !isRunning && (
                    <span className="generate-lines-summary">
                        {summary.cancelled
                            ? `Cancelled — ${summary.succeeded} succeeded, ${summary.failed} failed`
                            : `${summary.succeeded} succeeded, ${summary.failed} failed`}
                    </span>
                )}
            </div>
        </div>
    )
}

export default GenerateLines
