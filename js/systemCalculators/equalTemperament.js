import { equalTemperamentCalculator } from "./scaleCalculators.js";

/**
 * Calculate the frequency for a note in an equal-tempered scale.
 * @param {number} note - The note index within the diapason.
 * @param {number} diapason - The diapason index.
 * @param {number} notesInDiapason - The total number of notes in the diapason.
 * @param {number} rootFrequency - The frequency of the root note (usually A440).
 * @returns {number|null} - The calculated frequency for the note, or null if invalid inputs.
 */
export function calculateEqualTemperamentNoteFrequency(note, diapason, notesInDiapason, rootFrequency) {

  let frequency = equalTemperamentCalculator(note, diapason, rootFrequency, notesInDiapason);

  // Validate the calculated frequency
  if (!isFinite(frequency) || isNaN(frequency)) {
    console.error('Invalid frequency value calculated:', frequency);
    return null;
  }

  // Log and return the calculated frequency
  // console.log('Calculated frequency:', frequency);
  return frequency;
}
