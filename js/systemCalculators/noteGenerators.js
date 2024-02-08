import { majorScaleNotes } from "./majorScale.js";
import { naturalMinorScaleNotes } from "./naturalMinorScale.js";
import { majorPentatonicScaleNotes } from "./pentatonicScale.js";
import { bluesScaleNotes } from "./bluesScale.js";
import { hd110067NotesInOneDiapason } from "./hd110067.js";
import { equalTemperamentNoteGenerator } from "./equalTemperament.js";
import { fibonacciNotes } from "./fibonacciScale.js";
import { exploratoryNotes } from "./exploratory.js";
import { pythagoreanNotes } from "./pythagorean.js";

export function getNotesForSystem(system, notesInDiapason) {
  if (system === 'majorScaleNotes') {
    return majorScaleNotes;
  } else if (system === 'naturalMinorScaleNotes') {
    return naturalMinorScaleNotes;
  } else if (system === 'majorPentatonicScaleNotes') {
    return majorPentatonicScaleNotes;
  } else if (system === 'bluesScaleNotes') {
    return bluesScaleNotes;
  } else if (system === 'equalTemperamentNoteGenerator') {
    return equalTemperamentNoteGenerator(notesInDiapason);
  } else if (system === 'hd110067NotesInOneDiapason') {
    return hd110067NotesInOneDiapason;
  } else if (system === 'fibonacciNotes') {
    return fibonacciNotes;
  } else if (system === "exploratoryNotes") {
    return exploratoryNotes;
  } else if (system === "pythagoreanNotes") {
    return pythagoreanNotes;
  } else {
    throw new Error('Invalid System Calculator');
  }
};

export const noteGenerators = {
  majorScaleNotes,
  naturalMinorScaleNotes,
  majorPentatonicScaleNotes,
  bluesScaleNotes,
  pythagoreanNotes,
  hd110067NotesInOneDiapason,
  exploratoryNotes,
  equalTemperamentNoteGenerator,
  fibonacciNotes
};
