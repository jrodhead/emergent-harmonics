/**
 * The generated system that the keyboard plays from: the root notes on the
 * root keys, and the registers the note keys are laid across. Kept in one
 * module so the key handlers and the configuration screen share a single
 * source of truth without importing each other in a circle.
 */

export let rootNotes = [];
export let registers = [];
export let currentRootIndex = 0;
export let currentRegisterIndex = 0;

export const updateRootNotes = (generatedRootNotes) => {
  rootNotes = generatedRootNotes;
};

export const updateRegisters = (generatedRegisters) => {
  registers = generatedRegisters;
};

export const updateCurrentRootIndex = (rootIndex) => {
  currentRootIndex = rootIndex;
};

export const updateCurrentRegisterIndex = (registerIndex) => {
  if (registers.length === 0) {
    currentRegisterIndex = 0;
    return;
  }

  currentRegisterIndex = Math.max(0, Math.min(registers.length - 1, registerIndex));
};

export const isValidRootIndex = (rootIndex) => rootIndex >= 0 && rootIndex < rootNotes.length;

/** The octave the note keys are currently sitting in, or 0 if nothing is generated. */
export const currentOctaveShift = () => registers[currentRegisterIndex]?.octaveShift ?? 0;
