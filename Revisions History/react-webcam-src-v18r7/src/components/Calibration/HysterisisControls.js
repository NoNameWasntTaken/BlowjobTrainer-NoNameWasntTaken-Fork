import React from "react";
import { useAtom } from "jotai";
import NumberControl from "../NumberControl";
import { percentHysterisisAtom } from "../../atoms/gridAtoms";

function HysterisisControls() {
    const [hysterisis, setHysterisis] = useAtom(percentHysterisisAtom);


    return (
        <React.Fragment>
            <div className="row-centered margin-y-top">
                <h5>Buffer for Depth Changes(%)</h5>
            </div>
            <div className="row-centered">
                <NumberControl label="Buffer" value={hysterisis} setValue={setHysterisis} min={0} max={20} />
            </div>
        </React.Fragment>
    );
}

export default HysterisisControls;
