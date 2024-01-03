// Frequency calculations based on harmonic ratios that are used for the major scale

export function calculateMajorScaleFrequency(note, diapason, notesInDiapason, rootFrequency) {
  if (notesInDiapason > 7 || notesInDiapason <= 0) {
    throw new Error(`Invalid number of notes in a diapason (${notesInDiapason}). Please provide a number between 1 and 7.`);
  }

  // Harmonic ratios for the major scale
  const ratios = [
    1,    // Tonic
    9/8,  // Tonic to Supertonic (2nd degree)
    5/4,  // Tonic to Mediant (3rd degree)
    4/3,  // Tonic to Subdominant (4th degree)
    3/2,  // Tonic to Dominant (5th degree)
    5/3,  // Tonic to Submediant (6th degree)
    15/8  // Tonic to to Leading Tone (7th degree)
  ];

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

  if (!isFinite(frequency) || isNaN(frequency)) {
    console.error('Invalid frequency value calculated:', frequency);
    return null; // or handle it according to your application logic
  }

  console.log('calculated frequency: ', frequency);
  return frequency;
}
