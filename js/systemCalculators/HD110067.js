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

  // Orbital resonance ratios for the planets orbiting HD 110067
  // ratios are relative to the next-closest planet
  const ratios = [
    3/2, // planet B as 1 has a 9-(earth?)day orbit
    3/2, // planet C
    3/2, // planet D
    4/3, // planet E
    4/3,  // planet F
  ];

  if (note < 0 || note >= notesInDiapason) {
    throw new Error(`Invalid note (${note}). Please provide a number between 0 and ${notesInDiapason}.`);
  }

  // calculate the frequency based on the previous note and the ratio for the current note in the diapason
  let frequency = rootFrequency;
  for (let i = 0; i < note; i++) {
    frequency *= ratios[i % ratios.length];
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
