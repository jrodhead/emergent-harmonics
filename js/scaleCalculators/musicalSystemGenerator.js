export const MIN_AUDIBLE_FREQUENCY = 20;
export const MAX_AUDIBLE_FREQUENCY = 20000;

// The numeric keys 0-9 address the root notes, so there is no way to reach an
// eleventh one.
export const MAX_ROOT_NOTES = 10;

// 20Hz to 20000Hz is just under ten octaves, so no root can be more than
// eleven shifts away from either end of the audible range.
const MAX_OCTAVE_SHIFT = 12;

export function generateRootNotes(primaryRootFrequency, notesToGenerate) {
  let rootNotes = [];

  for (let noteName of notesToGenerate.slice(0, MAX_ROOT_NOTES)) {
    let frequency = primaryRootFrequency * noteName.ratioToRoot;

    rootNotes.push({frequency, relationshipToRoot: noteName});
  }

  return rootNotes;
}

/**
 * Builds the diapasons for a root note, octave-shifting the configured notes
 * outward in both directions and keeping every diapason that fits entirely
 * inside the audible range.
 *
 * @param {number} rootNoteFrequency - The frequency the ratios are measured from.
 * @param {Array} notesToGenerate - The notes of a single diapason.
 * @returns {Array} Diapasons ordered low to high, each tagged with its octaveShift.
 */
export function generateScaleNotes(rootNoteFrequency, notesToGenerate, {
  minFrequency = MIN_AUDIBLE_FREQUENCY,
  maxFrequency = MAX_AUDIBLE_FREQUENCY,
} = {}) {
  if (!Array.isArray(notesToGenerate) || notesToGenerate.length === 0) {
    console.error('Cannot generate a scale from an empty note list');
    return [];
  }

  const buildDiapason = (octaveShift) => {
    const multiplier = Math.pow(2, octaveShift);

    return {
      octaveShift,
      notes: notesToGenerate.map((note, noteName) => ({
        noteName,
        frequency: rootNoteFrequency * note.ratioToRoot * multiplier,
        relationshipToRoot: note,
      })),
    };
  };

  const scaleNotesPerDiapason = [];

  for (let octaveShift = -MAX_OCTAVE_SHIFT; octaveShift <= MAX_OCTAVE_SHIFT; octaveShift++) {
    const diapason = buildDiapason(octaveShift);
    const frequencies = diapason.notes.map((note) => note.frequency);

    if (!frequencies.every(Number.isFinite)) continue;
    if (Math.min(...frequencies) < minFrequency) continue;
    if (Math.max(...frequencies) > maxFrequency) continue;

    scaleNotesPerDiapason.push(diapason);
  }

  // A root sitting at the edge of the range can leave nothing audible. Keep the
  // unshifted diapason rather than handing back a system with no notes at all,
  // but only when its notes are real frequencies: ratios that are not numbers
  // would otherwise reach the keyboard as notes that can never sound.
  if (scaleNotesPerDiapason.length === 0) {
    const unshifted = buildDiapason(0);

    if (unshifted.notes.every((note) => Number.isFinite(note.frequency))) {
      scaleNotesPerDiapason.push(unshifted);
    }
  }

  return scaleNotesPerDiapason;
}

/**
 * The index of the diapason that starts on the root note itself, which is where
 * the alpha keys land when a system is first generated.
 */
export function homeDiapasonIndex(scaleNotesPerDiapason) {
  const index = scaleNotesPerDiapason.findIndex((diapason) => diapason.octaveShift === 0);

  return index === -1 ? 0 : index;
}
