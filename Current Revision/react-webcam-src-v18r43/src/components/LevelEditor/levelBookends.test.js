import { createLevelBookends } from './levelBookends'

test('createLevelBookends seeds a Get Ready and a Finish task', () => {
    const tasks = createLevelBookends()
    expect(tasks).toHaveLength(2)
    expect(tasks[0]).toMatchObject({
        type: 'get ready',
        timeLimit: 15,
        suppressFeedback: false,
        showCustomVoiceLines: false,
        audio: 'Level.BEGINT_1_START',
    })
    expect(tasks[0].desc).toBeUndefined()
    expect(tasks[1]).toMatchObject({
        type: 'finish',
        timeLimit: 15,
        suppressFeedback: false,
        showCustomVoiceLines: false,
        audio: 'Finish.CLEAN',
    })
    expect(tasks[0].id).not.toBe(tasks[1].id)
})
