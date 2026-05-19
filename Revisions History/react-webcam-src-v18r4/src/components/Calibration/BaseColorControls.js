import React, { useState, useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";
import NumberControl from "../NumberControl";
import { gridBaseColorAtom, gridAverageColorAtom } from "../../atoms/gridAtoms";

function BaseColorControls() {
    const [baseColor, setBaseColor] = useAtom(gridBaseColorAtom);
    const averageColor = useAtomValue(gridAverageColorAtom);

    // Initialize local state from atom
    const [r, setR] = useState(baseColor.r ?? 0);
    const [g, setG] = useState(baseColor.g ?? 0);
    const [b, setB] = useState(baseColor.b ?? 0);

    // Update atom whenever local state changes
    useEffect(() => {
        setBaseColor({ r, g, b });
    }, [r, g, b, setBaseColor]);

    // Optionally, update local state if atom changes externally
    useEffect(() => {
        setR(baseColor.r ?? 0);
        setG(baseColor.g ?? 0);
        setB(baseColor.b ?? 0);
    }, [baseColor.r, baseColor.g, baseColor.b]);

    return (
        <React.Fragment>
            <div className="row-centered margin-y-top">
                <h5>Dildo color</h5>
            </div>
            <div className="">
                <div className='row-centered flex-wrap'>
                    <NumberControl label="Red" value={r} setValue={setR} min={0} max={255} />
                    <NumberControl label="Green" value={g} setValue={setG} min={0} max={255} />
                    <NumberControl label="Blue" value={b} setValue={setB} min={0} max={255} />

                    <div>
                        <div>&nbsp;</div>
                        <button className="button "
                            onClick={() => { setBaseColor(averageColor) }}>
                            Capture current average
                        </button>
                    </div>
                </div>
            </div>
        </React.Fragment>
    );
}

export default BaseColorControls;
