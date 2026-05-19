import React, { useEffect, useState, useMemo } from "react";
import "./Cylinder.css";
// atoms
import { useAtom, useAtomValue } from "jotai";
import { currentLevelAtom } from "../../atoms/taskAtom";
import { currentStateAtom } from "../../atoms/markersAtoms";
import { navAtom } from "../../atoms/navAtom";
import { gridsAtom, ballsCoveredAtom } from "../../atoms/gridAtoms";
import * as NAV from '../../atoms/navAtom';
import { TaskType } from "../Tasks/task";
import TaskInstructions from "./TaskInstructions";
import MirrorToggle from "../MirrorToggle";

// Color definitions
const colNone = "#eee";
const colPrimary = "#df1c44";
const colSecondary = "#f0889d";

const Cylinder = () => {
    // Get current task from currentLevel
    const [currentLevel] = useAtom(currentLevelAtom);
    const currentTask = currentLevel?.currentTask;
    const currentDepth = useAtomValue(currentStateAtom);
    const nav = useAtomValue(navAtom);
    const grids = useAtomValue(gridsAtom);
    const ballsCovered = useAtomValue(ballsCoveredAtom);
    const hasBallsGrids = (Array.isArray(grids) ? grids : []).some(g => g.balls === true);

    // Single state object for all section colors
    const [sectionColors, setSectionColors] = useState({
        section1: colNone,
        section2: colNone,
        section3: colNone,
        section4: colNone,
        sectionBelow: colNone
    });

    // Memoize the TaskInstructions component to prevent unnecessary rerenders
    const memoizedTaskInstructions = useMemo(() => <TaskInstructions />, []);

    // Update colors based on task
    useEffect(() => {
        // Reset colors
        setSectionColors({
            section1: colNone,
            section2: colNone,
            section3: colNone,
            section4: colNone,
            sectionBelow: colNone
        });

        if (currentTask === null || currentTask === undefined) {
            return; // No task
        }

        switch (currentTask.type) {
            case TaskType.BLANK:
            case TaskType.GETREADY:
            case TaskType.FINISH:
                break;

            case TaskType.HOLDPOSITION:
                // Highlight the section based on targetDepth
                if (currentTask.targetDepth === 1) {
                    setSectionColors((prev) => ({ ...prev, section1: colPrimary }));
                } else if (currentTask.targetDepth === 2) {
                    setSectionColors((prev) => ({ ...prev, section2: colPrimary }));
                } else if (currentTask.targetDepth === 3) {
                    setSectionColors((prev) => ({ ...prev, section3: colPrimary }));
                } else if (currentTask.targetDepth === 4) {
                    setSectionColors((prev) => ({ ...prev, section4: colPrimary }));
                }
                break;

            case TaskType.HITDEPTH:
                // Color the target depth with secondary color
                setSectionColors((prev) => ({
                    ...prev,
                    [`section${currentTask.targetDepth}`]: colSecondary
                }));
                break;

            case TaskType.HOLDANDCLAP:
                if (currentTask.targetDepth === 1) {
                    setSectionColors((prev) => ({ ...prev, section1: colPrimary }));
                } else if (currentTask.targetDepth === 2) {
                    setSectionColors((prev) => ({ ...prev, section2: colPrimary }));
                } else if (currentTask.targetDepth === 3) {
                    setSectionColors((prev) => ({ ...prev, section3: colPrimary }));
                } else if (currentTask.targetDepth === 4) {
                    setSectionColors((prev) => ({ ...prev, section4: colPrimary }));
                }
                break;

            case TaskType.UPANDDOWN:
                // Highlight the min and max depth sections
                for (let i = 1; i <= 4; i++) {
                    if (i === currentTask.minDepth || i === currentTask.maxDepth) {
                        setSectionColors((prev) => ({
                            ...prev,
                            [`section${i}`]: colPrimary
                        }));
                    } else if (i > currentTask.minDepth && i < currentTask.maxDepth) {
                        setSectionColors((prev) => ({
                            ...prev,
                            [`section${i}`]: colSecondary
                        }));
                    }
                }
                break;

            case TaskType.REST:
            case 'rest ball':
                if (currentTask.ballsBonus && hasBallsGrids) {
                    setSectionColors((prev) => ({ ...prev, sectionBelow: colPrimary }));
                }
                break;

            case TaskType.ENDLESS:
                // Color sections 1 through currentDepth based on coverage; balls section red when earning balls bonus (at surface, balls covered)
                setSectionColors(() => {
                    const next = {
                        section1: colNone,
                        section2: colNone,
                        section3: colNone,
                        section4: colNone,
                        sectionBelow: colNone
                    };
                    for (let i = 1; i <= 4; i++) {
                        if (i <= currentDepth) {
                            next[`section${i}`] = colPrimary;
                        }
                    }
                    if (hasBallsGrids && ballsCovered && currentDepth === 0) {
                        next.sectionBelow = colPrimary;
                    }
                    return next;
                });
                break;

            default:
                break;
        }
    }, [currentTask, currentDepth, hasBallsGrids, ballsCovered]);

    // don't show in these states
    if (nav !== NAV.PLAYING) {
        return <></>;
    }

    // Render the cylinder with updated colors
    return (
        <div>
            <div className="row-centered" style={{ gap: '8px', marginBottom: '0.25rem' }}>
                <button style={{ padding: '4px 8px' }} title="Swap depth order">
                    &#x2194;
                </button>
                <MirrorToggle />
            </div>

            {/* Mirror transform is applied by App.js wrapper when effectiveMirror */}
            <div className="row-centered">
                <div className="cylinder-container">
                    {/* First grid: 4 equal sections */}
                    <div className="grid-row-1">
                        <div className="cylinder-item" style={{ backgroundColor: sectionColors.section4 }}>
                            <div>4</div>
                        </div>
                        <div className="cylinder-item" style={{ backgroundColor: sectionColors.section3 }}>
                            <div>3</div>
                        </div>
                        <div className="cylinder-item" style={{ backgroundColor: sectionColors.section2 }}>
                            <div>2</div>
                        </div>
                        <div className="cylinder-item round-right" style={{ backgroundColor: sectionColors.section1 }}>
                            <div>1</div>
                        </div>
                    </div>

                    {/* Second grid: 1/5th and 4/5th layout */}
                    <div className="grid-row-2">
                        <div className="cylinder-item round-bottom" style={{ backgroundColor: sectionColors.sectionBelow }}>
                            <div>balls</div>
                        </div>
                        <div className="cylinder-instruction margin-y">
                            {memoizedTaskInstructions}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Cylinder;
