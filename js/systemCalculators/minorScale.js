/**
 * Calculate frequency based on harmonic ratios used for the minor scale.
 * @param {number} note - The note in the scale.
 * @param {number} diapason - The diapason or octave of the note.
 * @param {number} notesInDiapason - The total number of notes in a diapason.
 * @param {number} rootFrequency - The frequency of the root note.
 * @returns {number|null} - Calculated frequency or null if invalid calculation.
 */
export function calculateMinorScaleFrequency(note, diapason, notesInDiapason, rootFrequency) {
  if (notesInDiapason > 7 || notesInDiapason <= 0) {
    throw new Error(`Invalid number of notes in a diapason (${notesInDiapason}). The minor scale has 7 notes - please provide a number between 1 and 7.`);
  }

  // Harmonic ratios for the minor scale
  const ratios = [
    1,     // root
    16/15, // minorSecond
    6/5,   // minorThird
    4/3,   // perfectFourth
    45/32, // diminishedFifth
    8/5,   // minorSixth
    9/5    //minorSeventh
  ];

  if (notesInDiapason < 7) {
    ratios.length = notesInDiapason;
  }

  const frequency = rootFrequency * ratios[note % ratios.length] * Math.pow(2, diapason);

  if (!isFinite(frequency) || isNaN(frequency)) {
    console.error('Invalid frequency value calculated:', frequency);
    return null;
  }

  // console.log('calculated frequency: ', frequency);
  return frequency;
}
