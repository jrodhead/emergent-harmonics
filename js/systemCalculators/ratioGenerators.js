/**
 * Generates the ratios for a major scale.
 * @type {number[]}
 */
const majorScaleRatios = [
   1,     // Tonic
   9 / 8, // Tonic to Supertonic (2nd degree)
   5 / 4, // Tonic to Mediant (3rd degree)
   4 / 3, // Tonic to Subdominant (4th degree)
   3 / 2, // Tonic to Dominant (5th degree)
   5 / 3, // Tonic to Submediant (6th degree)
  15 / 8  // Tonic to Leading Tone (7th degree)
];

/**
 * Generates the ratios for a minor scale.
 * @type {number[]}
 */
const minorScaleRatios = [
   1,      // root
  16 / 15, // minorSecond
   6 / 5,  // minorThird
   4 / 3,  // perfectFourth
  45 / 32, // diminishedFifth
   8 / 5,  // minorSixth
   9 / 5   // minorSeventh
];


const pentatonicScaleRatios = [
  1,
  9 / 8,
  5 / 4,
  3 / 2,
  5 / 3
];

const bluesScaleRatios = [
  1,
  6/5,
  4/3,
  7/5,
  3/2,
  7/4
];

/**
 * Generates the ratios for the HD110067 system.
 * @type {number[]}
 */
const hd110067Ratios = [
  1,
  3 / 2,
  3 / 2,
  3 / 2,
  4 / 3,
  4 / 3,
  4 / 3
];

/**
 * Generates the ratios for the HD110067 system in one diapason.
 * @type {number[]}
 */
const hd110067RatiosInOneDiapason = [
  1,
  1.5,
  1.125,
  1.6875,
  1.125 * 2,
  1.5 * 2,
  1 * 2,
];

/**
 * Generates the ratios for an equal temperament system with the specified number of notes in a diapason.
 * @param {number} notesInDiapason - The number of notes in a diapason.
 * @returns {number[]} The generated ratios.
 */
function equalTemperamentRatioGenerator(notesInDiapason) {
  const notePower = Math.pow(2, 1 / notesInDiapason);
  let ratios = [];
  for (let note = 0; note < notesInDiapason; note++) {
    ratios.push(Math.pow(notePower, note));
  }
  return ratios;
}

export function getRatiosForSystem(system) {
  if (system === 'majorScaleRatios') {
    return majorScaleRatios;
  } else if (system === 'minorScaleRatios') {
    return minorScaleRatios;
  } else if (system === 'pentatonicScaleRatios') {
    return pentatonicScaleRatios;
  } else if (system === 'bluesScaleRatios') {
    return bluesScaleRatios;
  } else if (system === 'equalTemperamentRatios') {
    return equalTemperamentRatioGenerator(notesInDiapason);
  } else if (system === 'HD110067Ratios') {
    return hd110067RatiosInOneDiapason;
  } else {
    throw new Error('Invalid System Calculator');
  }
};

export const ratioGenerators = {
  majorScaleRatios,
  minorScaleRatios,
  pentatonicScaleRatios,
  bluesScaleRatios,
  hd110067Ratios,
  // hd110067RatiosInOneDiapason,
  equalTemperamentRatioGenerator
};
