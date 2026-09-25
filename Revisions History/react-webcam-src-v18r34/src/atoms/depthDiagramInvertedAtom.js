import { atomWithStorage } from 'jotai/utils';

/** When true, depth regions swap horizontally (relative to Mirror Mode); persists like Mirror Mode. */
export const depthDiagramInvertedAtom = atomWithStorage(
  'depthDiagramInverted',
  false,
);
