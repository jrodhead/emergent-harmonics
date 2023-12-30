// Frequency calculation for equal-tempered scale
export function calculateEqualTemperamentNoteFrequency(note, diapason, notesInDiapason, rootNote) {
  const notePower = Math.pow(2, 1 / notesInDiapason);
  const frequency = rootNote * Math.pow(notePower, note) * Math.pow(2, diapason);

  console.log('calculated frequency: ', frequency)
  return frequency;
}
