/**
 * Calculate frequency based on harmonic ratios relative to the root frequency.
 * @param {number} note - The note in the scale.
 * @param {number} diapason - The diapason or octave of the note.
 * @param {number} rootFrequency - The frequency of the root note.
 * @param {number[]} ratios - The harmonic ratios for the scale.
 */

export const majorScaleRatios = [
  1, // Tonic
  9 / 8, // Tonic to Supertonic (2nd degree)
  5 / 4, // Tonic to Mediant (3rd degree)
  4 / 3, // Tonic to Subdominant (4th degree)
  3 / 2, // Tonic to Dominant (5th degree)
  5 / 3, // Tonic to Submediant (6th degree)
  15 / 8 // Tonic to Leading Tone (7th degree)
];

export const minorScaleRatios = [
  1, // Tonic
  9 / 8, // Tonic to Supertonic (2nd degree)
  6 / 5, // Tonic to Mediant (3rd degree)
  4 / 3, // Tonic to Subdominant (4th degree)
  3 / 2, // Tonic to Dominant (5th degree)
  8 / 5, // Tonic to Submediant (6th degree)
  9 / 5 // Tonic to Leading Tone (7th degree)
];

export function rootToRatioCalculator(note, diapason, rootFrequency, ratios) {
  return rootFrequency * ratios[note % ratios.length] * Math.pow(2, diapason);
}

export function equalTemperamentCalculator(note, diapason, rootFrequency, notesInDiapason) {
  const notePower = Math.pow(2, 1 / notesInDiapason);
  return rootFrequency * Math.pow(notePower, note) * Math.pow(2, diapason);
}

export function hd110067Calculator(note, diapason, rootFrequency, notesInDiapason) {
  // Orbital resonance ratios for the planets orbiting HD 110067
  // ratios are relative to the next-closest planet
  const ratios = [
    3 / 2, // planet B as 1 has a 9-(earth?)day orbit
    3 / 2, // planet C
    3 / 2, // planet D
    4 / 3, // planet E
    4 / 3 // planet F
  ];

  let frequency = rootFrequency;

  for (let i = 0; i < note; i++) {
    frequency *= ratios[i % ratios.length];
  }

  return frequency;
}
