import { atom } from "jotai";

// marker color
export const markerColorAtom = atom("white");

// Default sensitivity values
export const sensitivityAtom = atom({ r: 30, g: 30, b: 30 });

// add the current state
export const currentStateAtom = atom(0);

// Default clap sensitivity threshold
export const clapSensitivityAtom = atom(0.3)