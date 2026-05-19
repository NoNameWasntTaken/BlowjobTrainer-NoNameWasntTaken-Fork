import React, { useEffect, useState, useMemo } from "react";
import "./Cylinder.css";
// atoms
import { useAtom, useAtomValue } from "jotai";
import { currentLevelAtom } from "../../atoms/taskAtom";
import { navAtom } from "../../atoms/navAtom";
import * as NAV from '../../atoms/navAtom';
import { TaskType } from "../Tasks/task";
import TaskInstructions from "./TaskInstructions";

// Color definitions
const colNone = "#eee";
const colPrimary = "#df1c44";
const colSecondary = "#f0889d";

const Cylinder = () => {
    // Get current task from currentLevel
    const [currentLevel] = useAtom(currentLevelAtom);
    const currentTask = currentLevel?.currentTask
    const nav = useAtomValue(navAtom);


    // State to toggle the 'mirror' class
    const [isMirrored, setIsMirrored] = useState(false);

    // Function to toggle mirror class
    const toggleMirror = () => {
        setIsMirrored(prevState => !prevState);
    };

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
                break;
            case TaskType.REST_BALL:
                setSectionColors((prev) => ({ ...prev, sectionBelow: colSecondary }));
                break;

            default:
                break;
        }
    }, [currentTask]);

    // don't show in these states
    if (nav !== NAV.PLAYING) {
        return <></>;
    }

    // Render the cylinder with updated colors
    return (
        <div>
            <div className="row-centered">
                {/* Button to toggle the mirror effect */}
                <button onClick={toggleMirror} style={{ marginBottom: '0.25rem' }}>
                    &#x2194;
                    {/* &#8644; */}
                </button>
            </div>

            {/* Conditionally apply the 'mirror' class */}
            <div className="row-centered">
                <div className={`cylinder-container${isMirrored ? ' mirror' : ''}`}>
                    {/* First grid: 4 equal sections */}
                    <div className="grid-row-1">
                        <div className="cylinder-item" style={{ backgroundColor: sectionColors.section4 }}>
                            <div className={isMirrored ? 'mirror' : ''}>4</div>
                        </div>
                        <div className="cylinder-item" style={{ backgroundColor: sectionColors.section3 }}>
                            <div className={isMirrored ? 'mirror' : ''}>3</div>
                        </div>
                        <div className="cylinder-item" style={{ backgroundColor: sectionColors.section2 }}>
                            <div className={isMirrored ? 'mirror' : ''}>2</div>
                        </div>
                        <div className="cylinder-item round-right" style={{ backgroundColor: sectionColors.section1 }}>
                            <div className={isMirrored ? 'mirror' : ''}>1</div>
                        </div>
                    </div>

                    {/* Second grid: 1/5th and 4/5th layout */}
                    <div className="grid-row-2">
                        <div className="cylinder-item round-bottom" style={{ backgroundColor: sectionColors.sectionBelow }}>
                            <div className={isMirrored ? 'mirror' : ''}>balls</div>
                        </div>
                        <div className={`cylinder-instruction${isMirrored ? ' mirror' : ''} margin-y`}>
                            {memoizedTaskInstructions}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Cylinder;
