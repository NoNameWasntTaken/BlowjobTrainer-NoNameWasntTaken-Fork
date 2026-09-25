import React from "react";

// atoms
import { useAtomValue } from "jotai";
import { currentLevelAtom } from "../../atoms/taskAtom";
import { TaskType, getTempoString } from "../Tasks/task";


// Move depthToString outside component to prevent recreation on each render
const depthToString = (depth) => {
    switch (depth) {
        case 1:
            return 'tip'
        case 2:
            return 'shaft'
        case 3:
            return 'base'
        case 4:
            return 'deepthroat'
        default:
            return ''
    }
}

const TaskInstructions = () => {
    // Get current task from currentLevel
    const currentLevel = useAtomValue(currentLevelAtom);
    const currentTask = currentLevel?.currentTask;

    let instruct = ""
    let option = ""
    let speed = ""

    if (currentTask === null || currentTask === undefined) {
        return <React.Fragment />
    }

    switch (currentTask?.type) {
        case TaskType.GETREADY:
            instruct = "Get Ready"
            break;
        case TaskType.HOLDPOSITION:
            instruct = "HOLD"
            option = " ~ " + depthToString(currentTask.targetDepth)
            if (currentTask.time) {
                option += ` for <b>${currentTask.time}s</b>`
            }
            if (currentTask.repeat > 1) {
                option += ` x${currentTask.repeat}`
            }
            break;
        case TaskType.REST:
        case 'rest ball':
            instruct = "REST"
            option = ""
            break;
        case TaskType.UPANDDOWN:
            instruct = "SUCK"
            option = " ~ " + depthToString(currentTask.minDepth) + " to " + depthToString(currentTask.maxDepth)
            speed = getTempoString(currentTask.tempo)
            break;
        case TaskType.HITDEPTH:
            instruct = "HIT"
            option = " ~ " + depthToString(currentTask.targetDepth)
            if (currentTask.repeat > 1) {
                option += ` x${currentTask.repeat}`
            }
            break;
        case TaskType.CLAP:
            instruct = "SLAP"
            option = ` ~ x${currentTask.repeat}`
            break;
        case TaskType.SPEAK:
            instruct = "SPEAK"
            option = ` ~ x${currentTask.repeat || 1}`
            break;
        case TaskType.HOLDANDCLAP:
            instruct = "HOLD & CLAP"
            option = ` ~ ${depthToString(currentTask.targetDepth)}, ${currentTask.claps || 3} claps x${currentTask.repeat || 3}`
            break;
        case TaskType.FINISH:
            instruct = "Finished"
            option = " ~ clean up"
            break;
        case TaskType.ENDLESS:
            instruct = "Freeform"
            option = ""
            break;
        default:
            break;
    }

    return (
        <div style={{ borderColor: 'var(--accent)' }}>
            <h2 className="margin-y-sm" dangerouslySetInnerHTML={{ __html: `${instruct}  ${option} <em>${speed}</em>` }}></h2>
        </div>
    )
}

export default TaskInstructions
