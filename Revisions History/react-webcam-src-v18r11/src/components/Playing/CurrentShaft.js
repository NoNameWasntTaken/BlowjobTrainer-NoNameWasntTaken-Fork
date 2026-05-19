import React from "react";
import { useAtomValue } from "jotai";
import { currentStateAtom } from "../../atoms/markersAtoms";
import { combinedShaftPercentAtom, gridMigrationDoneAtom } from "../../atoms/gridAtoms";

import ShaftReading from "../ShaftReading";

function CurrentShaft() {
    const migrationDone = useAtomValue(gridMigrationDoneAtom)
    const gridShaftPercent = useAtomValue(combinedShaftPercentAtom)
    const currentState = useAtomValue(currentStateAtom)

    // Early return if migration not done
    if (!migrationDone) {
        return null
    }

    return (

        <div className="row-centered">
            <ShaftReading label="Dildo (%)" percent={Math.round(gridShaftPercent)} />
            <ShaftReading label="Suck Depth" percent={currentState} subtitle="0 to 4" />
            {/* <h4><bold>Shaft {Math.round(gridShaftPercent)} %</bold></h4> */}
        </div>
    )
}

export default CurrentShaft