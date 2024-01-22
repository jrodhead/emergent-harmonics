import { majorScaleNotes } from "./majorScale.js";
import { minorScaleNotes } from "./minorScale.js";
import { pentatonicScaleNotes } from "./pentatonicScale.js";
import { bluesScaleNotes } from "./bluesScale.js";
import { hd110067Notes, hd110067NotesInOneDiapason } from "./hd110067.js";

/**
 * Generates the Notes for an equal temperament system with the specified number of notes in a diapason.
 * @param {number} notesInDiapason - The number of notes in a diapason.
 * @returns {number[]} The generated Notes.
 */
function equalTemperamentNoteGenerator(notesInDiapason) {
  const notePower = Math.pow(2, 1 / notesInDiapason);
  let Notes = [];
  for (let note = 0; note < notesInDiapason; note++) {
    Notes.push(Math.pow(notePower, note));
  }
  return Notes;
}

export function getNotesForSystem(system) {
  if (system === 'majorScaleNotes') {
    return majorScaleNotes;
  } else if (system === 'minorScaleNotes') {
    return minorScaleNotes;
  } else if (system === 'pentatonicScaleNotes') {
    return pentatonicScaleNotes;
  } else if (system === 'bluesScaleNotes') {
    return bluesScaleNotes;
  } else if (system === 'equalTemperamentNotes') {
    return equalTemperamentNoteGenerator(notesInDiapason);
  } else if (system === 'HD110067Notes') {
    return hd110067Notes;
  } else {
    throw new Error('Invalid System Calculator');
  }
};

export const noteGenerators = {
  majorScaleNotes,
  minorScaleNotes,
  pentatonicScaleNotes,
  bluesScaleNotes,
  hd110067Notes,
  hd110067NotesInOneDiapason,
  equalTemperamentNoteGenerator
};
