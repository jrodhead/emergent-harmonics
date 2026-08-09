import { PERIOD_RATIO, periodMultiplier } from './period.js';

export const MIN_AUDIBLE_FREQUENCY = 20;
export const MAX_AUDIBLE_FREQUENCY = 20000;

// The root keys 0-9 address the root notes, so there is no way to reach an
// eleventh one.
export const MAX_ROOT_NOTES = 10;

// However far apart the ends of the audible range are, a register shifted
// further than that from its root has climbed out of it entirely.
const MAX_PERIOD_SHIFT = Math.ceil(
  Math.log(MAX_AUDIBLE_FREQUENCY / MIN_AUDIBLE_FREQUENCY) / Math.log(PERIOD_RATIO),
);

/**
 * Puts a root note on each of the ten root keys. A register with fewer than
 * ten notes repeats up the periods to fill the keys that would otherwise be
 * dead: five notes make keys 5-9 an octave above their 0-4 counterparts.
 *
 * @param {number} primaryRootFrequency - The frequency the ratios are measured from.
 * @param {Array} notesToGenerate - The notes of the primary register.
 * @returns {Array} Root notes in key order, each tagged with its periodShift.
 */
export function generateRootNotes(primaryRootFrequency, notesToGenerate, {
  maxFrequency = MAX_AUDIBLE_FREQUENCY,
} = {}) {
  if (!Array.isArray(notesToGenerate) || notesToGenerate.length === 0) return [];

  const rootNotes = [];

  for (let keyIndex = 0; keyIndex < MAX_ROOT_NOTES; keyIndex++) {
    const note = notesToGenerate[keyIndex % notesToGenerate.length];
    const periodShift = Math.floor(keyIndex / notesToGenerate.length);
    const frequency = primaryRootFrequency * note.ratioToRoot * periodMultiplier(periodShift);

    // A repeat that has climbed out of the audible range would be a root that
    // can never sound, so the keys above it stay unmapped.
    if (!Number.isFinite(frequency) || frequency > maxFrequency) break;

    rootNotes.push({ frequency, periodShift, definition: note });
  }

  return rootNotes;
}

/**
 * Builds the registers for a root note, shifting the configured notes a period at a time
 * outward in both directions and keeping every register that fits entirely
 * inside the audible range.
 *
 * @param {number} rootNoteFrequency - The frequency the ratios are measured from.
 * @param {Array} notesToGenerate - The notes of a single register.
 * @returns {Array} Registers ordered low to high, each tagged with its periodShift.
 */
export function buildRegisters(rootNoteFrequency, notesToGenerate, {
  minFrequency = MIN_AUDIBLE_FREQUENCY,
  maxFrequency = MAX_AUDIBLE_FREQUENCY,
} = {}) {
  if (!Array.isArray(notesToGenerate) || notesToGenerate.length === 0) {
    console.error('Cannot generate a scale from an empty note list');
    return [];
  }

  const buildRegister = (periodShift) => {
    const multiplier = periodMultiplier(periodShift);

    return {
      periodShift,
      notes: notesToGenerate.map((note, noteIndex) => ({
        noteIndex,
        frequency: rootNoteFrequency * note.ratioToRoot * multiplier,
        definition: note,
      })),
    };
  };

  const registers = [];

  for (let periodShift = -MAX_PERIOD_SHIFT; periodShift <= MAX_PERIOD_SHIFT; periodShift++) {
    const register = buildRegister(periodShift);
    const frequencies = register.notes.map((note) => note.frequency);

    if (!frequencies.every(Number.isFinite)) continue;
    if (Math.min(...frequencies) < minFrequency) continue;
    if (Math.max(...frequencies) > maxFrequency) continue;

    registers.push(register);
  }

  // A root sitting at the edge of the range can leave nothing audible. Keep the
  // unshifted register rather than handing back a system with no notes at all,
  // but only when its notes are real frequencies: ratios that are not numbers
  // would otherwise reach the keyboard as notes that can never sound.
  if (registers.length === 0) {
    const unshifted = buildRegister(0);

    if (unshifted.notes.every((note) => Number.isFinite(note.frequency))) {
      registers.push(unshifted);
    }
  }

  return registers;
}

/**
 * The index of the register that starts on the root note itself, which is where
 * the note keys land when a system is first generated.
 */
export function homeRegisterIndex(registers) {
  const index = registers.findIndex((register) => register.periodShift === 0);

  return index === -1 ? 0 : index;
}
