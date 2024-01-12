import { hd110067Calculator } from "./scaleCalculators.js";

/**
 * Calculate frequency based on harmonic ratios of the planetary system of HD 110067
 * https://www.pbs.org/newshour/science/nasa-satellites-discovered-a-6-planet-solar-system-in-perfect-synchrony
 * @param {number} note - The note in the scale.
 * @param {number} diapason - The diapason or octave of the note.
 * @param {number} notesInDiapason - The total number of notes in a diapason.
 * @param {number} rootFrequency - The frequency of the root note.
 * @returns {number|null} - Calculated frequency or null if invalid calculation.
 */
export function calculateHD110067Frequency(note, diapason, rootFrequency, notesInDiapason) {

  let frequency = hd110067Calculator(note, diapason, rootFrequency, notesInDiapason);

  // Validate the calculated frequency
  if (!isFinite(frequency) || isNaN(frequency)) {
    console.error('Invalid frequency value calculated:', frequency);
    return null;
  }

  // console.log('calculated frequency: ', frequency);
  return frequency;
}
