import React from "react";
import { useAtomValue, useSetAtom } from "jotai";
import NumberControl from "../NumberControl";
import { gridsAtom, selectedGridAtom, isAllGridsModeAtom } from "../../atoms/gridAtoms";

function SensitivityControls({ disabled = false }) {
    const selectedGrid = useAtomValue(selectedGridAtom);
    const isAllGridsMode = useAtomValue(isAllGridsModeAtom);
    const setGrids = useSetAtom(gridsAtom);

    // Get the selected grid's sensitivity, or default to { r: 30, g: 30, b: 30 }
    const sensitivity = selectedGrid?.sensitivity || { r: 30, g: 30, b: 30 };
    
    // Direct access to RGB values from selected grid's sensitivity
    const r = sensitivity.r ?? 0;
    const g = sensitivity.g ?? 0;
    const b = sensitivity.b ?? 0;

    // Update handlers that directly modify gridsAtom
    // NumberControl passes a function updater: (v) => v + delta
    // So we need to handle both function updaters and direct values
    const handleRChange = (newR) => {
        if (!selectedGrid || isAllGridsMode) return;
        setGrids(prev => {
            const currentGrids = Array.isArray(prev) ? prev : [];
            return currentGrids.map(grid => {
                if (grid.id === selectedGrid.id) {
                    const currentSensitivity = grid.sensitivity || { r: 30, g: 30, b: 30 };
                    const currentR = currentSensitivity.r ?? 0;
                    // Handle function updater from NumberControl
                    const updatedR = typeof newR === 'function' ? newR(currentR) : newR;
                    return { ...grid, sensitivity: { ...currentSensitivity, r: updatedR } };
                }
                return grid;
            });
        });
    };

    const handleGChange = (newG) => {
        if (!selectedGrid || isAllGridsMode) return;
        setGrids(prev => {
            const currentGrids = Array.isArray(prev) ? prev : [];
            return currentGrids.map(grid => {
                if (grid.id === selectedGrid.id) {
                    const currentSensitivity = grid.sensitivity || { r: 30, g: 30, b: 30 };
                    const currentG = currentSensitivity.g ?? 0;
                    // Handle function updater from NumberControl
                    const updatedG = typeof newG === 'function' ? newG(currentG) : newG;
                    return { ...grid, sensitivity: { ...currentSensitivity, g: updatedG } };
                }
                return grid;
            });
        });
    };

    const handleBChange = (newB) => {
        if (!selectedGrid || isAllGridsMode) return;
        setGrids(prev => {
            const currentGrids = Array.isArray(prev) ? prev : [];
            return currentGrids.map(grid => {
                if (grid.id === selectedGrid.id) {
                    const currentSensitivity = grid.sensitivity || { r: 30, g: 30, b: 30 };
                    const currentB = currentSensitivity.b ?? 0;
                    // Handle function updater from NumberControl
                    const updatedB = typeof newB === 'function' ? newB(currentB) : newB;
                    return { ...grid, sensitivity: { ...currentSensitivity, b: updatedB } };
                }
                return grid;
            });
        });
    };

    return (
        <React.Fragment>
            <div className="row-centered margin-y-top">
                <h5>Sensitivity (red, green, blue)</h5>
            </div>
            <div className="row-centered flex-wrap">
                <NumberControl label="Red" value={r} setValue={handleRChange} min={0} max={255} disabled={disabled} />
                <NumberControl label="Green" value={g} setValue={handleGChange} min={0} max={255} disabled={disabled} />
                <NumberControl label="Blue" value={b} setValue={handleBChange} min={0} max={255} disabled={disabled} />
                <div>
                    <div>&nbsp;</div>
                    <button 
                        className="button"
                        onClick={() => {
                            if (!selectedGrid || isAllGridsMode) return;
                            setGrids(prev => {
                                const currentGrids = Array.isArray(prev) ? prev : [];
                                return currentGrids.map(grid => 
                                    grid.id === selectedGrid.id 
                                        ? { ...grid, sensitivity: { r: 40, g: 40, b: 40 } } 
                                        : grid
                                );
                            });
                        }}
                        disabled={disabled || isAllGridsMode || !selectedGrid}
                    >
                        Reset Sensitivity
                    </button>
                </div>
            </div>
        </React.Fragment>
    );
}

export default SensitivityControls;
