import { atom } from "jotai";

// Store the Buttplug client instance
export const buttplugClientAtom = atom(null);

// Store the list of connected devices
export const buttplugDevicesAtom = atom([]);

// Store connection status
export const buttplugConnectedAtom = atom(false);

// Store max vibration level for the devices
export const maxDeviceSpeedAtom = atom(1.0);

// Store the current vibration speed - this is
// always a normalised value between 0-1
export const vibrateSpeedAtom = atom(0.0);

// When true, unmount/idle stops that would zero vibration are skipped so a
// "Skip feedback (fast transition)" handoff can carry intensity into the next task.
// Set only for the brief remount window; always cleared on pause/cancel/gameover.
export const preserveVibrationAtom = atom(false);