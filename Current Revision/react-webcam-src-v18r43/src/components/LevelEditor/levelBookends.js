import { TaskType } from '../Tasks/task'
import { getRandomInt } from '../randomInt'
import { FINISH_AUDIO, GETREADY_AUDIO } from './taskAudioConfig'

const createBookend = (type) => ({
    id: getRandomInt(),
    type,
    timeLimit: 15,
    suppressFeedback: false,
    showCustomVoiceLines: false,
    ...(type === TaskType.GETREADY
        ? { audio: GETREADY_AUDIO[0].value }
        : { audio: FINISH_AUDIO[0].value }),
})

export const createLevelBookends = () => [
    createBookend(TaskType.GETREADY),
    createBookend(TaskType.FINISH),
]
