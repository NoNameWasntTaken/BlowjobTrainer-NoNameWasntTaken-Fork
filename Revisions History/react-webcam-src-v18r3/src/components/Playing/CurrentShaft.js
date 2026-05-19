import React from "react";
import { useAtomValue } from "jotai";
import { currentStateAtom } from "../../atoms/markersAtoms";
import { gridShaftPercentAtom } from "../../atoms/gridAtoms";

import ShaftReading from "../ShaftReading";

function CurrentShaft() {
    const gridShaftPercent = useAtomValue(gridShaftPercentAtom)
    const currentState = useAtomValue(currentStateAtom)

    return (

        <div className="row-centered">
            <ShaftReading label="Dildo (%)" percent={Math.round(gridShaftPercent)} />
            <ShaftReading label="Suck Depth" percent={currentState} subtitle="0 to 4" />
            {/* <h4><bold>Shaft {Math.round(gridShaftPercent)} %</bold></h4> */}
        </div>
    )
}

export default CurrentShaft