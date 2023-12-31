// Frequency calculations based on harmonic ratios that are used for the major scale

export function calculateMajorScaleFrequency(note, diapason, notesInDiapason, rootFrequency) {
  if (notesInDiapason > 7 || notesInDiapason <= 0) {
    throw new Error(`Invalid number of notes in a diapason (${notesInDiapason}). Please provide a number between 1 and 7.`);
  }

  const ratios = [1, 9/8, 5/4, 4/3, 3/2, 5/3, 15/8]; // Ratios for a major scale

  if (notesInDiapason < 7) {
    ratios.length = notesInDiapason;
    //// TODO: Priority of notes
    // Tonic
    // Tonic to Dominant (5th degree)
    // Tonic to Subdominant (4th degree)
    // Tonic to Mediant (3rd degree)
    // Tonic to Supertonic (2nd degree)
    // Tonic to Submediant (6th degree)
    // Tonic to Leading Tone (7th degree)
  }

  const frequency = rootFrequency * ratios[note % ratios.length] * Math.pow(2, diapason);

  console.log('calculated frequency: ', frequency);
  return frequency;
}
