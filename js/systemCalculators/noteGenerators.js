import { majorScaleNotes } from "./majorScale.js";
import { minorScaleNotes } from "./minorScale.js";
import { pentatonicScaleNotes } from "./pentatonicScale.js";
import { bluesScaleNotes } from "./bluesScale.js";
import { hd110067Notes, hd110067NotesInOneDiapason } from "./hd110067.js";
import { equalTemperamentNoteGenerator } from "./equalTemperament.js";
import { fibonacciNotes } from "./fibonacciScale.js";

export function getNotesForSystem(system, notesInDiapason) {
  if (system === 'majorScaleNotes') {
    return majorScaleNotes;
  } else if (system === 'minorScaleNotes') {
    return minorScaleNotes;
  } else if (system === 'pentatonicScaleNotes') {
    return pentatonicScaleNotes;
  } else if (system === 'bluesScaleNotes') {
    return bluesScaleNotes;
  } else if (system === 'equalTemperamentNoteGenerator') {
    return equalTemperamentNoteGenerator(notesInDiapason);
  } else if (system === 'hd110067NotesInOneDiapason') {
    return hd110067NotesInOneDiapason;
  } else if (system === 'fibonacciNotes') {
    return fibonacciNotes;
  } else {
    throw new Error('Invalid System Calculator');
  }
};

export const noteGenerators = {
  equalTemperamentNoteGenerator,
  majorScaleNotes,
  minorScaleNotes,
  pentatonicScaleNotes,
  bluesScaleNotes,
  hd110067NotesInOneDiapason,
  fibonacciNotes
};
