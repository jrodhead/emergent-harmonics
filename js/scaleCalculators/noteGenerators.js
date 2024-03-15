import { majorScaleNotes } from "./majorScale.js";
import { naturalMinorScaleNotes } from "./naturalMinorScale.js";
import { diminishedScaleNotes } from "./diminishedScale.js";
import { majorPentatonicScaleNotes } from "./majorPentatonicScale.js";
import { minorPentatonicScaleNotes } from "./minorPentatonicScale.js";
import { bluesScaleNotes } from "./bluesScale.js";
import { hd110067NotesInOneDiapason } from "./hd110067.js";
import { equalTemperamentNoteGenerator } from "./equalTemperament.js";
import { fibonacciNotes } from "./fibonacciScale.js";
import { exploratoryNotes } from "./exploratory.js";
import { pythagoreanNotes } from "./pythagorean.js";

export function getNotesForSystem(system, notesInDiapason) {
  if (system === 'majorScaleNotes' || system === 'major') {
    return majorScaleNotes;
  } else if (system === 'naturalMinorScaleNotes' || system === 'minor') {
    return naturalMinorScaleNotes;
  } else if (system === 'diminishedScaleNotes' || system === 'diminished') {
    return diminishedScaleNotes;
  } else if (system === 'majorPentatonicScaleNotes') {
    return majorPentatonicScaleNotes;
  } else if (system === 'minorPentatonicScaleNotes') {
    return minorPentatonicScaleNotes;
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
    throw new Error(`Invalid System Calculator: ${system}`);
  }
};

export const noteGenerators = {
  majorScaleNotes,
  naturalMinorScaleNotes,
  diminishedScaleNotes,
  majorPentatonicScaleNotes,
  minorPentatonicScaleNotes,
  bluesScaleNotes,
  pythagoreanNotes,
  hd110067NotesInOneDiapason,
  exploratoryNotes,
  equalTemperamentNoteGenerator,
  fibonacciNotes
};
