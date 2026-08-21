import { PERIOD_RATIO } from '../system/period.js';

/**
 * Divides the period into evenly spaced notes, the way a piano divides the
 * octave into twelve.
 *
 * @param {number} noteCount - How many notes to divide the period into.
 * @returns {Array} Notes, each with its ratio to the root.
 */
export function equalTemperamentNotes(noteCount = 12) {
  const step = Math.pow(PERIOD_RATIO, 1 / noteCount);
  const notes = [];

  for (let noteIndex = 0; noteIndex < noteCount; noteIndex++) {
    notes.push({ ratioToRoot: Math.pow(step, noteIndex) });
  }

  return notes;
}
