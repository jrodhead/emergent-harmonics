// Frequency calculation for equal-tempered scale

export function calculateEqualTemperamentNoteFrequency(note, diapason, notesInDiapason, rootFrequency) {
  if (notesInDiapason <= 0 || diapason < 0) {
    console.error('Invalid diapason or notesInDiapason values.');
    return null; // or throw an error: throw new Error('Invalid diapason or notesInDiapason values.');
  }

  const notePower = Math.pow(2, 1 / notesInDiapason);
  const frequency = rootFrequency * Math.pow(notePower, note) * Math.pow(2, diapason);

  if (!isFinite(frequency) || isNaN(frequency)) {
    console.error('Invalid frequency value calculated:', frequency);
    return null; // or handle it according to your application logic
  }

  console.log('Calculated frequency:', frequency);
  return frequency;
}
