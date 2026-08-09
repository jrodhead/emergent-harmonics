/**
 * Divides the octave into evenly spaced notes, the way a piano is tuned.
 *
 * @param {number} noteCount - How many notes to divide the octave into.
 * @returns {Array} Notes, each with its ratio to the root.
 */
export function equalTemperamentNotes(noteCount = 12) {
  const step = Math.pow(2, 1 / noteCount);
  const notes = [];

  for (let noteIndex = 0; noteIndex < noteCount; noteIndex++) {
    notes.push({ ratioToRoot: Math.pow(step, noteIndex) });
  }

  return notes;
}
