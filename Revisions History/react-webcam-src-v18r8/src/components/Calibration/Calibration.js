import React, { useState, useMemo } from "react";
import SensitivityControls from "./SensitivityControls";
import { useAtom, useSetAtom, useAtomValue } from "jotai";
import { currentStateAtom } from "../../atoms/markersAtoms";
import {
    brushAddModeAtom,
    gridAverageColorsAtom,
    combinedShaftPercentAtom,
    gridsAtom,
    selectedGridAtom,
    isAllGridsModeAtom,
} from "../../atoms/gridAtoms";

import CalibrationTester from "./CalibrationTester";
import BaseColorControls from "./BaseColorControls";
import PercentControls from "./PercentControls";
import HysterisisControls from "./HysterisisControls";
import GridSelector from "./GridSelector";
import ColorReading from "../ColorReading";
import ShaftReading from "../ShaftReading";
import { STR } from "../../constants/stringsreplace";
import CalibrationExport from "./CalibrationExport";
import CalibrationImport from "./CalibrationImport";
import { externalIntegrationService } from "../../services/externalIntegrationService";
import { exportCalibration } from "./calibrationExportService";

function Calibration() {
    const [showTester, setShowTester] = useState(false);
    const [brushAddMode, setBrushAddMode] = useAtom(brushAddModeAtom)
    const gridAverageColors = useAtomValue(gridAverageColorsAtom)
    const gridShaftPercent = useAtomValue(combinedShaftPercentAtom)
    const currentState = useAtomValue(currentStateAtom)
    const selectedGrid = useAtomValue(selectedGridAtom)
    const isAllGridsMode = useAtomValue(isAllGridsModeAtom)
    const grids = useAtomValue(gridsAtom)
    const setGrids = useSetAtom(gridsAtom)

    // Get the selected grid's average color, or default to { r: 0, g: 0, b: 0 }
    const gridAverageColor = selectedGrid && !isAllGridsMode 
        ? (gridAverageColors[selectedGrid.id] || { r: 0, g: 0, b: 0 })
        : { r: 0, g: 0, b: 0 }

    // Get the base color: selected grid's base color, or average of all grids in All Grids mode
    const baseColor = useMemo(() => {
        if (isAllGridsMode) {
            // Calculate average of all grids' base colors
            const safeGrids = Array.isArray(grids) ? grids : []
            if (safeGrids.length === 0) {
                return { r: 200, g: 10, b: 10 }
            }
            
            let sumR = 0, sumG = 0, sumB = 0, count = 0
            safeGrids.forEach(grid => {
                const bc = grid.baseColor || { r: 200, g: 10, b: 10 }
                sumR += bc.r ?? 0
                sumG += bc.g ?? 0
                sumB += bc.b ?? 0
                count++
            })
            
            if (count > 0) {
                return {
                    r: Math.round(sumR / count),
                    g: Math.round(sumG / count),
                    b: Math.round(sumB / count)
                }
            }
            return { r: 200, g: 10, b: 10 }
        } else if (selectedGrid) {
            return selectedGrid.baseColor || { r: 200, g: 10, b: 10 }
        } else {
            return { r: 200, g: 10, b: 10 }
        }
    }, [isAllGridsMode, grids, selectedGrid])

    function toggleTester() {
        setShowTester(!showTester);
    }

    const handleClearGrid = () => {
        if (isAllGridsMode || !selectedGrid) return;
        setGrids(prev => {
            const currentGrids = Array.isArray(prev) ? prev : [];
            return currentGrids.map(grid => 
                grid.id === selectedGrid.id ? { ...grid, squares: [] } : grid
            );
        });
    };

    return (
        <React.Fragment>
            <div className="row-centered">
                <h3 className="margin-y-sm">Calibrate Grid</h3>
            </div>
            <GridSelector />
            {/* grid brush controls */}
            <div className="row-centered">
                {/* add button that toggles between adding and deleting */}
                <button 
                    className="button padding-x-sm" 
                    onClick={handleClearGrid}
                    disabled={isAllGridsMode}
                >
                    Clear Grid
                </button>
                <button 
                    className="button padding-x-sm" 
                    onClick={() => setBrushAddMode(!brushAddMode)}
                    disabled={isAllGridsMode}
                >
                    Brush: {brushAddMode ? 'Add' : 'Remove'}
                </button>
            </div>
            {/* Current colors and shaft percent*/}
            <div className="row-centered flex-wrap">
                <ColorReading label="Average Color" color={gridAverageColor && typeof gridAverageColor === 'object' && 'r' in gridAverageColor && !('id' in gridAverageColor) ? gridAverageColor : { r: 0, g: 0, b: 0 }} />
                <ColorReading label="Dildo Color" color={baseColor && typeof baseColor === 'object' && 'r' in baseColor && !('id' in baseColor) ? baseColor : { r: 0, g: 0, b: 0 }} />
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
            
            {/* Calibration Export/Import */}
            <div className="row-centered margin-y">
                <CalibrationExport />
                <CalibrationImport />
            </div>
            
            {/* Complete Calibration button for calibration-only mode */}
            {externalIntegrationService.isCalibrationOnlyMode() && (
                <div className="row-centered margin-y">
                    <button
                        className="button button-primary padding-x-lg"
                        onClick={async () => {
                            const result = await exportCalibration();
                            if (result.success && window.electronAPI?.requestExit) {
                                window.electronAPI.requestExit(0, 'calibration_complete');
                            }
                        }}
                    >
                        Complete Calibration
                    </button>
                </div>
            )}
            
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
