import React from "react";
import { useAtomValue, useSetAtom } from "jotai";
import NumberControl from "../NumberControl";
import { gridsAtom, selectedGridAtom, gridAverageColorsAtom, isAllGridsModeAtom } from "../../atoms/gridAtoms";

function BaseColorControls() {
    const selectedGrid = useAtomValue(selectedGridAtom);
    const isAllGridsMode = useAtomValue(isAllGridsModeAtom);
    const gridAverageColors = useAtomValue(gridAverageColorsAtom);
    const setGrids = useSetAtom(gridsAtom);

    // Get the selected grid's base color, or default to { r: 200, g: 10, b: 10 }
    const baseColor = selectedGrid?.baseColor || { r: 200, g: 10, b: 10 };
    
    // Direct access to RGB values from selected grid's baseColor
    const r = baseColor.r ?? 0;
    const g = baseColor.g ?? 0;
    const b = baseColor.b ?? 0;

    // Update handlers that directly modify gridsAtom
    // NumberControl passes a function updater: (v) => v + delta
    // So we need to handle both function updaters and direct values
    const handleRChange = (newR) => {
        if (!selectedGrid || isAllGridsMode) return;
        setGrids(prev => {
            const currentGrids = Array.isArray(prev) ? prev : [];
            return currentGrids.map(grid => {
                if (grid.id === selectedGrid.id) {
                    const currentBaseColor = grid.baseColor || { r: 200, g: 10, b: 10 };
                    const currentR = currentBaseColor.r ?? 0;
                    // Handle function updater from NumberControl
                    const updatedR = typeof newR === 'function' ? newR(currentR) : newR;
                    return { ...grid, baseColor: { ...currentBaseColor, r: updatedR } };
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
                    const currentBaseColor = grid.baseColor || { r: 200, g: 10, b: 10 };
                    const currentG = currentBaseColor.g ?? 0;
                    // Handle function updater from NumberControl
                    const updatedG = typeof newG === 'function' ? newG(currentG) : newG;
                    return { ...grid, baseColor: { ...currentBaseColor, g: updatedG } };
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
                    const currentBaseColor = grid.baseColor || { r: 200, g: 10, b: 10 };
                    const currentB = currentBaseColor.b ?? 0;
                    // Handle function updater from NumberControl
                    const updatedB = typeof newB === 'function' ? newB(currentB) : newB;
                    return { ...grid, baseColor: { ...currentBaseColor, b: updatedB } };
                }
                return grid;
            });
        });
    };

    return (
        <React.Fragment>
            <div className="row-centered margin-y-top">
                <h5>Dildo color</h5>
            </div>
            <div className="">
                <div className='row-centered flex-wrap'>
                    <NumberControl label="Red" value={r} setValue={handleRChange} min={0} max={255} />
                    <NumberControl label="Green" value={g} setValue={handleGChange} min={0} max={255} />
                    <NumberControl label="Blue" value={b} setValue={handleBChange} min={0} max={255} />

                    <div>
                        <div>&nbsp;</div>
                        <button 
                            className="button"
                            onClick={() => {
                                if (!selectedGrid || isAllGridsMode) return;
                                // Check if average exists and grid has squares
                                const hasAverage = gridAverageColors[selectedGrid.id] !== undefined;
                                const hasSquares = selectedGrid.squares && selectedGrid.squares.length > 0;
                                if (hasAverage && hasSquares) {
                                    const avgColor = gridAverageColors[selectedGrid.id];
                                    setGrids(prev => {
                                        const currentGrids = Array.isArray(prev) ? prev : [];
                                        return currentGrids.map(grid => 
                                            grid.id === selectedGrid.id ? { ...grid, baseColor: { ...avgColor } } : grid
                                        );
                                    });
                                }
                            }}
                            disabled={isAllGridsMode || !selectedGrid || !selectedGrid.squares || selectedGrid.squares.length === 0 || !gridAverageColors[selectedGrid.id]}
                        >
                            Capture current average
                        </button>
                    </div>
                </div>
            </div>
        </React.Fragment>
    );
}

export default BaseColorControls;
