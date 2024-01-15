// todo: turn these into functions that can handle any number of notes in a diapason

export const majorScaleRatios = [
   1,     // Tonic
   9 / 8, // Tonic to Supertonic (2nd degree)
   5 / 4, // Tonic to Mediant (3rd degree)
   4 / 3, // Tonic to Subdominant (4th degree)
   3 / 2, // Tonic to Dominant (5th degree)
   5 / 3, // Tonic to Submediant (6th degree)
  15 / 8 // Tonic to Leading Tone (7th degree)
];

export const minorScaleRatios = [
   1,      // root
  16 / 15, // minorSecond
   6 / 5,  // minorThird
   4 / 3,  // perfectFourth
  45 / 32, // diminishedFifth
   8 / 5,  // minorSixth
   9 / 5   // minorSeventh
];

export const hd110067Ratios = [
  1,
  3 / 2,
  3 / 2,
  3 / 2,
  4 / 3,
  4 / 3,
  4 / 3
];

export function equalTemperamentRatioGenerator(notesInDiapason) {
  const notePower = Math.pow(2, 1 / notesInDiapason);
  let ratios = [];
  for (let note = 0; note < notesInDiapason; note++) {
    ratios.push(Math.pow(notePower, note));
  }
  return ratios;
}
