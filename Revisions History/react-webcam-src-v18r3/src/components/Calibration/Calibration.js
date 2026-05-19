import React from "react";
import { useState } from "react";
import SensitivityControls from "./SensitivityControls";
import { useAtom, useSetAtom, useAtomValue } from "jotai";
import { currentStateAtom } from "../../atoms/markersAtoms";
import {
    brushAddModeAtom,
    gridBaseColorAtom,
    gridSensitivityAtom,
    gridAverageColorAtom,
    gridSquaresAtom,
    gridShaftPercentAtom,
} from "../../atoms/gridAtoms";

import CalibrationTester from "./CalibrationTester";
import BaseColorControls from "./BaseColorControls";
import PercentControls from "./PercentControls";
import HysterisisControls from "./HysterisisControls";
import ColorReading from "../ColorReading";
import ShaftReading from "../ShaftReading";
import { STR } from "../../constants/stringsreplace";

function Calibration() {
    const [showTester, setShowTester] = useState(false);
    const [brushAddMode, setBrushAddMode] = useAtom(brushAddModeAtom)
    const baseColor = useAtomValue(gridBaseColorAtom)
    // const [sensitivity, setSensitivy] = useAtom(gridSensitivityAtom)
    const gridAverageColor = useAtomValue(gridAverageColorAtom)
    const setGridSquares = useSetAtom(gridSquaresAtom)
    const gridShaftPercent = useAtomValue(gridShaftPercentAtom)
    const currentState = useAtomValue(currentStateAtom)


    function toggleTester() {
        setShowTester(!showTester);
    }

    return (
        <React.Fragment>
            <div className="row-centered">
                <h3 className="margin-y-sm">Calibrate Grid</h3>
            </div>
            {/* grid brush controls */}
            <div className="row-centered">
                {/* add button that toggles between adding and deleting */}
                <button className="button padding-x-sm" onClick={() => setGridSquares([])} >Clear Grid</button>
                <button className="button padding-x-sm" onClick={() => setBrushAddMode(!brushAddMode)} >Brush: {brushAddMode ? 'Add' : 'Remove'}</button>
            </div>
            {/* Current colors and shaft percent*/}
            <div className="row-centered flex-wrap">
                <ColorReading label="Average Color" color={gridAverageColor} />
                <ColorReading label="Dildo Color" color={baseColor} />
                <ShaftReading label="Dildo (%)" percent={Math.round(gridShaftPercent)} />
                <ShaftReading label="Suck Depth" percent={currentState} subtitle="0 to 4" />
                {/* <h4><bold>Shaft {Math.round(gridShaftPercent)} %</bold></h4> */}
            </div>
            <BaseColorControls />
            <SensitivityControls />
            <PercentControls />
            <HysterisisControls />
            <div className="row-centered margin-y margin-y-top">
                <button className={`button padding-x ${showTester ? "button-primary" : ""}`} onClick={toggleTester}>
                    {showTester ? "Calibration Test: On" : "Calibration Test: Off"}
                </button>
            </div>
            <div className="margin-y-top" />
            {showTester && <CalibrationTester />}
            <hr />
            <h3>Help</h3>
            <p className="help margin-y-sm">
                Beginners steps to set the above up
            </p>
            <ol>
                <li>Paint a small area of your colored dildo first.</li>
                <li>Click <em>"Capture current average"</em> to get a useful color reading.</li>
                <li>Then paint in the rest of the area where your dildo is likely to be visible. Smaller areas are better - aim to have the dildo filling at least 50% of the grid.</li>
                <li>Set the visible percentages to match how much of the dildo is likely to be covered at each depth. <em>Tip: Make the number slightly higher than you think you'll need.</em></li>
            </ol>
            <h3 className="margin-y-sm">
                What do all the above numbers mean?
            </h3>
            <p className="margin-y-sm">
                <b>Sensitivity</b> determines how close each grid color needs to be to be considered a match for the dildo. The logic uses AND, so all RGB readings must be within their given range. If in doubt, set the sensitivity slightly higher than you think. Observe the outline in the webcam. <b>Bright dildos and good lighting help a lot.</b>
            </p>
            <p className="margin-y-sm">
                The <b>buffer</b> controls the + and - range needed for each depth. For example, if 'tip' is set to 50% and the buffer is 5%, it won't register ON until the reading is '50 - 5 = 45%'. Then it won't register as OFF until '50 + 5 = 55%'. This helps smooth the depth reading for the game. Without it, if you were near 50%, the depth would likely rapidly flicker between depths 0 and 1.
            </p>
            <p className="margin-y-sm">
                <b>Avoid very low buffer values (e.g., 0 or 1)</b>. Set this to around half of the difference between each depth level. For example, if you have depth percentages of 50, 40, 30, 20, set this to between 3%-6% and experiment with calibration.
            </p>
            <p className="margin-y-sm">
                Depth meanings are:
                <ul>
                    <li>0 - {STR.Depth[0]} (not sucking)</li>
                    <li>1 - {STR.Depth[1]}</li>
                    <li>2 - {STR.Depth[2]}</li>
                    <li>3 - {STR.Depth[3]}</li>
                    <li>4 - {STR.Depth[4]}</li>
                </ul>
            </p>
            <p className="margin-y-sm">
                <b>Depth percentages</b> - The less of the dildo that is visible, the deeper it is in your throat. Tip: Keep these evenly spaced and avoid very low deepthroat values, as they're probably not needed.
            </p>
            {/* <DeltaReadings /> */}
            <hr />
        </React.Fragment>
    );
}

export default Calibration;
