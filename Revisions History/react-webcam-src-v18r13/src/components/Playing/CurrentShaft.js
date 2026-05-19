import React from "react";
import { useAtomValue } from "jotai";
import { currentStateAtom } from "../../atoms/markersAtoms";
import {
    combinedShaftOnlyPercentAtom,
    combinedBallsPercentAtom,
    ballsCoveredAtom,
    gridMigrationDoneAtom,
    gridsAtom
} from "../../atoms/gridAtoms";
import { currentLevelAtom } from "../../atoms/taskAtom";
import { TaskType } from "../Tasks/task";

import ShaftReading from "../ShaftReading";

function CurrentShaft() {
    const migrationDone = useAtomValue(gridMigrationDoneAtom)
    const gridShaftPercent = useAtomValue(combinedShaftOnlyPercentAtom)
    const currentState = useAtomValue(currentStateAtom)
    const currentLevel = useAtomValue(currentLevelAtom)
    const combinedBallsPercent = useAtomValue(combinedBallsPercentAtom)
    const ballsCovered = useAtomValue(ballsCoveredAtom)
    const grids = useAtomValue(gridsAtom)

    const task = currentLevel?.currentTask
    const hasBallsGrids = (Array.isArray(grids) ? grids : []).some(g => g.balls === true)
    const showBallsMode = (task?.type === TaskType.REST || task?.type === TaskType.REST_BALL) &&
        task?.ballsBonus && hasBallsGrids

    // Early return if migration not done
    if (!migrationDone) {
        return null
    }

    return (
        <div className="row-centered">
            {showBallsMode ? (
                <>
                    <ShaftReading label="Balls%" percent={Math.round(combinedBallsPercent)} subtitle="% covered" />
                    <ShaftReading label="Balls On" percent={ballsCovered ? 1 : 0} subtitle="0 to 1" />
                </>
            ) : (
                <>
                    <ShaftReading label="Dildo (%)" percent={Math.round(gridShaftPercent)} />
                    <ShaftReading label="Suck Depth" percent={currentState} subtitle="0 to 4" />
                </>
            )}
        </div>
    )
}

export default CurrentShaft