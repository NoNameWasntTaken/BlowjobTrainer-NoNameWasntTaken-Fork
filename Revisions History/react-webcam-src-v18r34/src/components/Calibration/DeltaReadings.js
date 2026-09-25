import React, { useState, useEffect } from "react";
import { useAtom, useAtomValue } from 'jotai';
import { sensitivityAtom, baseColorsAtom, currentColorsAtom } from '../../atoms/markersAtoms';

function DeltaReadings() {
    // Use atoms instead of props
    const [sensitivity, setSensitivity] = useAtom(sensitivityAtom);
    const baseColors = useAtomValue(baseColorsAtom);
    const currentColors = useAtomValue(currentColorsAtom);

    // toggle reading the sensitivity on/off
    const [isOn, setIsOn] = useState(false);
    const [maxDelta, setMaxDelta] = useState({ r: 0, g: 0, b: 0 });

    let baseCol1 = baseColors[0] ?? { r: 0, g: 0, b: 0 };
    let currentCol1 = currentColors[0] ?? { r: 255, g: 255, b: 255 };

    // delta is the difference, always use positive numbers
    let delta = {
        r: Math.abs(baseCol1.r - currentCol1.r),
        g: Math.abs(baseCol1.g - currentCol1.g),
        b: Math.abs(baseCol1.b - currentCol1.b),
    };

    useEffect(() => {
        if (isOn) {
            updateMaxDelta(delta);
        }
    }, [delta, isOn]);

    function updateMaxDelta(delta) {
        if (delta.r > maxDelta.r || delta.g > maxDelta.g || delta.b > maxDelta.b) {
            setMaxDelta((prevMaxDelta) => ({
                r: Math.max(prevMaxDelta.r, delta.r),
                g: Math.max(prevMaxDelta.g, delta.g),
                b: Math.max(prevMaxDelta.b, delta.b),
            }));
        }
    }

    function calculateSensitivity() {
        if (maxDelta) {
            const sensitivityValue = {
                r: Math.round(maxDelta.r * 0.75),
                g: Math.round(maxDelta.g * 0.75),
                b: Math.round(maxDelta.b * 0.75),
            };
            setSensitivity(sensitivityValue);
        }
    }

    function toggleIsOn() {
        if (!isOn) {
            setMaxDelta({ r: 0, g: 0, b: 0 });
        }
        setIsOn(!isOn);
    }

    return (
        <React.Fragment>
            <p className="help">Current readings from the tip to help calibrate.  Try recording and sucking the tip a few times to get a maximum difference, then set to 75% of this and refine by adjusting manually.</p>
            <div className="row-centered">
                <div className="margin-x" >
                    <span className="margin-x-sm">Tip </span>
                    <span style={{ width: '160px' }}
                        className=" not-a-button padding-x-sm monospaced">
                        <pre> r:{delta.r}  g:{delta.g}  b:{delta.b} </pre>
                    </span>
                </div>
                <div className="margin-x">
                    <span className="margin-x-sm">Max </span>
                    <span style={{ width: '160px' }}
                        className=" not-a-button padding-x-sm monospaced">
                        <pre>r:{maxDelta.r}  g:{maxDelta.g}  b:{maxDelta.b}</pre>
                    </span>
                </div>
            </div>

            <div className="row-centered margin-y">
                <button className="button margin-x padding-x" onClick={toggleIsOn}>{isOn ? 'Stop Recording' : 'Record Max Sensitivity'}</button>
                <button className="button margin-x padding-x" onClick={calculateSensitivity}>Set Sensitivity to 75% of max</button>
            </div>
        </React.Fragment>
    );
}

export default DeltaReadings;
