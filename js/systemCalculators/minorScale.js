import { minorScaleRatios, rootToRatioCalculator } from "./scaleCalculators.js";

/**
 * Calculate frequency based on harmonic ratios used for the minor scale.
 * @param {number} note - The note in the scale.
 * @param {number} diapason - The diapason or octave of the note.
 * @param {number} notesInDiapason - The total number of notes in a diapason.
 * @param {number} rootFrequency - The frequency of the root note.
 * @returns {number|null} - Calculated frequency or null if invalid calculation.
 */
export function calculateMinorScaleFrequency(note, diapason, notesInDiapason, rootFrequency) {
  let ratios = minorScaleRatios;

  const frequency = rootToRatioCalculator(note, diapason, rootFrequency, ratios);

  if (!isFinite(frequency) || isNaN(frequency)) {
    console.error('Invalid frequency value calculated:', frequency);
    return null;
  }

  // console.log('calculated frequency: ', frequency);
  return frequency;
}
