export function calculateMajorScaleFrequencies(rootFrequency, numDiapasons, numNotes) {
  const ratios = [1, 9/8, 5/4, 4/3, 3/2, 5/3, 15/8]; // Ratios for major scale intervals
  const frequencies = [];

  for (let diapason = 0; diapason < numDiapasons; diapason++) {
    const diapasonNotes = [];
    let frequency = rootFrequency * Math.pow(2, diapason); // Calculate frequency for each diapason

    for (let note = 0; note < numNotes; note++) {
      diapasonNotes.push(frequency);
      frequency *= ratios[note % ratios.length]; // Calculate subsequent note frequencies based on ratios
    }

    frequencies.push(diapasonNotes);
  }

  return frequencies;
}

// Example usage:
// const rootNoteFrequency = 440; // Assuming A4 (440 Hz) as the root note
// const diapasons = 3; // Number of diapasons
// const notesPerDiapason = 7; // Number of notes in each diapason

// const majorScaleFrequencies = calculateMajorScaleFrequencies(rootNoteFrequency, diapasons, notesPerDiapason);
// console.log(majorScaleFrequencies);
