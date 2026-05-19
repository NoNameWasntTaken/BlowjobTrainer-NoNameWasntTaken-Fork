import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

// marker color
export const markerColorAtom = atom("white");

// Default sensitivity values
export const sensitivityAtom = atom({ r: 30, g: 30, b: 30 });

// add the current state
export const currentStateAtom = atom(0);

// Default clap sensitivity threshold
export const clapSensitivityAtom = atom(0.3)

/** Audio calibration: mic + clap detection active on Mic tab (gameplay ignores this; see ClapDetector). Default off until user opts in. */
export const clapTestEnabledAtom = atomWithStorage('clapTestEnabled', false)