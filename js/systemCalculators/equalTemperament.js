/**
 * Generates the Notes for an equal temperament system with the specified number of notes in a diapason.
 * @param {number} notesInDiapason - The number of notes in a diapason.
 * @returns {number[]} The generated Notes.
 */

export function equalTemperamentNoteGenerator(notesInDiapason) {
  const notePower = Math.pow(2, 1 / notesInDiapason);
  let notes = [];
  for (let note = 0; note < notesInDiapason; note++) {
    notes.push({ ratioToRoot: Math.pow(notePower, note) });
  }
  return notes;
}
