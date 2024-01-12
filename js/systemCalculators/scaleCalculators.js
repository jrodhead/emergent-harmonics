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
  1,     // root
  16/15, // minorSecond
  6/5,   // minorThird
  4/3,   // perfectFourth
  45/32, // diminishedFifth
  8/5,   // minorSixth
  9/5    //minorSeventh
];

export function rootToRatioCalculator(note, diapason, notesInDiapason, rootNote, ratios) {
  return rootNote * ratios[note % ratios.length] * Math.pow(2, diapason);
}

export function equalTemperamentCalculator(note, diapason, notesInDiapason, rootNote) {
  const notePower = Math.pow(2, 1 / notesInDiapason);
  return rootNote * Math.pow(notePower, note) * Math.pow(2, diapason);
}

export function hd110067Calculator(note, diapason, notesInDiapason, rootNote) {
  // Orbital resonance ratios for the planets orbiting HD 110067
  // ratios are relative to the next-closest planet
  const ratios = [
    3 / 2, // planet B as 1 has a 9-(earth?)day orbit
    3 / 2, // planet C
    3 / 2, // planet D
    4 / 3, // planet E
    4 / 3  // planet F
  ];

  let frequency = rootNote;

  for (let i = 0; i < note; i++) {
    frequency *= ratios[i % ratios.length];
  }

  return frequency;
}
