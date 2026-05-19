import React, { useState, useEffect } from "react";
import { useAtom } from "jotai";
// import { sensitivityAtom } from "../../atoms/markersAtoms";
import { gridSensitivityAtom } from "../../atoms/gridAtoms";
import NumberControl from "../NumberControl";

function SensitivityControls() {
    const [sensitivity, setSensitivity] = useAtom(gridSensitivityAtom);

    // Local state for r, g, b
    const [r, setR] = useState(sensitivity.r ?? 0);
    const [g, setG] = useState(sensitivity.g ?? 0);
    const [b, setB] = useState(sensitivity.b ?? 0);

    // Update atom whenever local state changes
    useEffect(() => {
        setSensitivity({ r, g, b });
    }, [r, g, b, setSensitivity]);

    // Update local state if atom changes externally
    useEffect(() => {
        setR(sensitivity.r ?? 0);
        setG(sensitivity.g ?? 0);
        setB(sensitivity.b ?? 0);
    }, [sensitivity.r, sensitivity.g, sensitivity.b]);

    return (
        <React.Fragment>
            <div className="row-centered margin-y-top">
                <h5>Sensitivity (red, green, blue)</h5>
            </div>
            <div className="row-centered flex-wrap">
                <NumberControl label="Red" value={r} setValue={setR} min={0} max={255} />
                <NumberControl label="Green" value={g} setValue={setG} min={0} max={255} />
                <NumberControl label="Blue" value={b} setValue={setB} min={0} max={255} />
                <div>
                    <div>&nbsp;</div>
                    <button className="button "
                        onClick={() => { setSensitivity({ r: 40, g: 40, b: 40 }) }}>
                        Reset Sensitivity
                    </button>
                </div>
            </div>
        </React.Fragment>
    );
}

export default SensitivityControls;
