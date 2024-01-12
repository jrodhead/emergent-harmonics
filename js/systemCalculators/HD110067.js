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
export function calculateHD110067Frequency(note, diapason, notesInDiapason, rootFrequency) {
  if (notesInDiapason > 6 || notesInDiapason <= 0) {
    throw new Error(`Invalid number of notes in a diapason (${notesInDiapason}). The HD 110067 star system has 6 planets - please provide a number between 1 and 7.`);
  }

  let frequency = hd110067Calculator(note, diapason, rootFrequency, ratios);

  if (note < 0 || note >= notesInDiapason) {
    throw new Error(`Invalid note (${note}). Please provide a number between 0 and ${notesInDiapason}.`);
  }

  if (!isFinite(frequency) || isNaN(frequency)) {
    console.error('Invalid frequency value calculated:', frequency);
    console.log('rootFrequency:', rootFrequency);
    console.log('note:', note);
    return null;
  }

  console.log('calculated frequency: ', frequency);
  return frequency;
}
