import React, { useState, useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";
import NumberControl from "../NumberControl";
import { gridDepthPercentAtom, ballsDepthPercentAtom, percentHysterisisAtom } from "../../atoms/gridAtoms";
import { STR } from "../../constants/stringsreplace";

function PercentControls({ disabled = false }) {
    const [percent, setPercent] = useAtom(gridDepthPercentAtom);
    const [ballsPercent, setBallsPercent] = useAtom(ballsDepthPercentAtom);
    const hysterisis = useAtomValue(percentHysterisisAtom)

    // Local state for 1, 2, 3, 4
    const [p1, setP1] = useState(percent[1] ?? 0);
    const [p2, setP2] = useState(percent[2] ?? 0);
    const [p3, setP3] = useState(percent[3] ?? 0);
    const [p4, setP4] = useState(percent[4] ?? 0);
    const [pBalls, setPBalls] = useState(ballsPercent ?? 50);

    const [error, setError] = useState("");

    // Update atom whenever local state changes
    useEffect(() => {
        setPercent({ 1: p1, 2: p2, 3: p3, 4: p4 });
    }, [p1, p2, p3, p4, setPercent]);

    useEffect(() => {
        setBallsPercent(pBalls);
    }, [pBalls, setBallsPercent]);

    // Update local state if atom changes externally
    const percent1 = percent[1];
    const percent2 = percent[2];
    const percent3 = percent[3];
    const percent4 = percent[4];
    useEffect(() => {
        setP1(percent1 ?? 0);
        setP2(percent2 ?? 0);
        setP3(percent3 ?? 0);
        setP4(percent4 ?? 0);
    }, [percent1, percent2, percent3, percent4]);

    useEffect(() => {
        setPBalls(ballsPercent ?? 50);
    }, [ballsPercent]);

    // Check for overlap error
    useEffect(() => {
        if (p1 <= p2) {
            setError(`Error: Value ${STR.Depth[1]} must be greater than value ${STR.Depth[2]}.`);
        } else if (p2 <= p3) {
            setError(`Error: Value ${STR.Depth[2]} must be greater than value ${STR.Depth[3]}.`);
        } else if (p3 <= p4) {
            setError(`Error: Value ${STR.Depth[3]} must be greater than value ${STR.Depth[4]}.`);
        } else {
            setError("");
        }
        if (p4 - hysterisis < 0) {
            setError(`Error: Value ${STR.Depth[4]} minus buffer cannot be negative.`);
        }
    }, [p1, p2, p3, p4, hysterisis]);

    return (
        <React.Fragment>
            <div className="row-centered margin-y-top">
                <h5>Depth based on visible (%)</h5>
            </div>
            <div className="row-centered flex-wrap">
                <NumberControl label={STR.Depth[1]} value={p1} setValue={setP1} min={0} max={100} disabled={disabled} />
                <NumberControl label={STR.Depth[2]} value={p2} setValue={setP2} min={0} max={100} disabled={disabled} />
                <NumberControl label={STR.Depth[3]} value={p3} setValue={setP3} min={0} max={100} disabled={disabled} />
                <NumberControl label={STR.Depth[4]} value={p4} setValue={setP4} min={0} max={100} disabled={disabled} />
                <NumberControl label="Balls" value={pBalls} setValue={setPBalls} min={0} max={100} disabled={disabled} />
            </div>
            <div style={{ color: 'var(--danger)' }}>{error}</div>
        </React.Fragment>
    );
}

export default PercentControls;
