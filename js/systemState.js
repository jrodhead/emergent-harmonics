/**
 * The generated system that the keyboard plays from. Kept in one module so the
 * key handlers and the configuration screen share a single source of truth
 * without importing each other in a circle.
 */

export let rootNotesGlobal = [];
export let activeScaleNotesGlobal = [];
export let currentRootIndex = 0;
export let currentDiapasonIndex = 0;

export const updateRootNotesGlobal = (rootNotes) => {
  rootNotesGlobal = rootNotes;
};

export const updateActiveScaleNotesGlobal = (scaleNotesPerDiapason) => {
  activeScaleNotesGlobal = scaleNotesPerDiapason;
};

export const updateCurrentRootIndex = (rootIndex) => {
  currentRootIndex = rootIndex;
};

export const updateCurrentDiapasonIndex = (diapasonIndex) => {
  if (activeScaleNotesGlobal.length === 0) {
    currentDiapasonIndex = 0;
    return;
  }

  currentDiapasonIndex = Math.max(0, Math.min(activeScaleNotesGlobal.length - 1, diapasonIndex));
};

export const isValidRootIndex = (rootIndex) => rootIndex >= 0 && rootIndex < rootNotesGlobal.length;

/** The octave the alpha keys are currently sitting in, or 0 if nothing is generated. */
export const currentOctaveShift = () => activeScaleNotesGlobal[currentDiapasonIndex]?.octaveShift ?? 0;
