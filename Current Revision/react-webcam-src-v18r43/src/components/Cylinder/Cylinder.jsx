import React, { useEffect, useState, useMemo } from "react";
import "./Cylinder.css";
// atoms
import { useAtom, useAtomValue } from "jotai";
import { currentLevelAtom } from "../../atoms/taskAtom";
import { currentStateAtom } from "../../atoms/markersAtoms";
import { navAtom } from "../../atoms/navAtom";
import { gridsAtom, ballsCoveredAtom } from "../../atoms/gridAtoms";
import { depthDiagramInvertedAtom } from "../../atoms/depthDiagramInvertedAtom";
import * as NAV from '../../atoms/navAtom';
import { TaskType } from "../Tasks/task";
import TaskInstructions from "./TaskInstructions";
import MirrorToggle from "../MirrorToggle";

// Color definitions
const colNone = "var(--surface-soft)";
const colPrimary = "var(--accent)";
const colSecondary = "var(--accent-light)";

const Cylinder = () => {
    // Get current task from currentLevel
    const [currentLevel] = useAtom(currentLevelAtom);
    const currentTask = currentLevel?.currentTask;
    const currentDepth = useAtomValue(currentStateAtom);
    const nav = useAtomValue(navAtom);
    const grids = useAtomValue(gridsAtom);
    const ballsCovered = useAtomValue(ballsCoveredAtom);
    const hasBallsGrids = (Array.isArray(grids) ? grids : []).some(g => g.balls === true);
    const [depthInverted, setDepthInverted] = useAtom(depthDiagramInvertedAtom);

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

    /** Counter flipped when depth diagram container uses scaleX(-1); keeps labels readable. */
    const diagramTextUnmirror = depthInverted ? { transform: 'scaleX(-1)' } : undefined;

    // Render the cylinder with updated colors
    return (
        <div className="cylinder-layout">
            <div className="row-centered" style={{ gap: '8px', marginBottom: '0.25rem' }}>
                <button
                    type="button"
                    className={`button margin-x-sm padding-x ${depthInverted ? 'button-primary' : ''}`}
                    style={{ height: '28px', padding: '0 12px', fontSize: '14px' }}
                    title="Swap depth order (diagram only)"
                    aria-pressed={depthInverted}
                    onClick={() => setDepthInverted((v) => !v)}
                >
                    &#x2194;
                </button>
                <MirrorToggle />
            </div>

            {/* Mirror transform is applied by App.js wrapper when effectiveMirror.
                Depth invert: scaleX on the diagram so borders/backgrounds mirror; counter-scale on text only. */}
            <div className="row-centered">
                <div
                    className="cylinder-container"
                    style={
                        depthInverted
                            ? { transform: 'scaleX(-1)', transformOrigin: 'center center' }
                            : undefined
                    }
                >
                    {/* First grid: 4 equal sections */}
                    <div className="grid-row-1">
                        <div className="cylinder-item" style={{ backgroundColor: sectionColors.section4 }}>
                            <div style={diagramTextUnmirror}>4</div>
                        </div>
                        <div className="cylinder-item" style={{ backgroundColor: sectionColors.section3 }}>
                            <div style={diagramTextUnmirror}>3</div>
                        </div>
                        <div className="cylinder-item" style={{ backgroundColor: sectionColors.section2 }}>
                            <div style={diagramTextUnmirror}>2</div>
                        </div>
                        <div className="cylinder-item round-right" style={{ backgroundColor: sectionColors.section1 }}>
                            <div style={diagramTextUnmirror}>1</div>
                        </div>
                    </div>

                    {/* Second grid: 1/5th and 4/5th layout */}
                    <div className="grid-row-2">
                        <div className="cylinder-item round-bottom" style={{ backgroundColor: sectionColors.sectionBelow }}>
                            <div style={diagramTextUnmirror}>balls</div>
                        </div>
                        <div className="cylinder-instruction margin-y">
                            <div style={diagramTextUnmirror}>
                                {memoizedTaskInstructions}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Cylinder;
