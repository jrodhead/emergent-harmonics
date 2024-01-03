/**
 * Calculate the frequency for a note in an equal-tempered scale.
 * @param {number} note - The note index within the diapason.
 * @param {number} diapason - The diapason index.
 * @param {number} notesInDiapason - The total number of notes in the diapason.
 * @param {number} rootFrequency - The frequency of the root note (usually A440).
 * @returns {number|null} - The calculated frequency for the note, or null if invalid inputs.
 */
export function calculateEqualTemperamentNoteFrequency(note, diapason, notesInDiapason, rootFrequency) {
  // Check for invalid input values
  if (notesInDiapason <= 0 || diapason < 0) {
    console.error('Invalid diapason or notesInDiapason values.');
    return null;
  }

  // Calculate the frequency based on the formula
  const notePower = Math.pow(2, 1 / notesInDiapason);
  const frequency = rootFrequency * Math.pow(notePower, note) * Math.pow(2, diapason);

  // Validate the calculated frequency
  if (!isFinite(frequency) || isNaN(frequency)) {
    console.error('Invalid frequency value calculated:', frequency);
    return null;
  }

  // Log and return the calculated frequency
  console.log('Calculated frequency:', frequency);
  return frequency;
}
