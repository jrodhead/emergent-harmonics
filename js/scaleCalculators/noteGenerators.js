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

const EQUAL_TEMPERAMENT = 'equalTemperamentNoteGenerator';

// Canonical name -> notes, plus the short aliases used by triadType values.
const systemsByName = new Map([
  ['majorScaleNotes', majorScaleNotes],
  ['major', majorScaleNotes],
  ['naturalMinorScaleNotes', naturalMinorScaleNotes],
  ['minor', naturalMinorScaleNotes],
  ['diminishedScaleNotes', diminishedScaleNotes],
  ['diminished', diminishedScaleNotes],
  ['majorPentatonicScaleNotes', majorPentatonicScaleNotes],
  ['minorPentatonicScaleNotes', minorPentatonicScaleNotes],
  ['bluesScaleNotes', bluesScaleNotes],
  ['pythagoreanNotes', pythagoreanNotes],
  ['hd110067NotesInOneDiapason', hd110067NotesInOneDiapason],
  ['exploratoryNotes', exploratoryNotes],
  ['fibonacciNotes', fibonacciNotes],
]);

export function getNotesForSystem(system, notesInDiapason) {
  if (system === EQUAL_TEMPERAMENT) {
    return equalTemperamentNoteGenerator(notesInDiapason);
  }

  const notes = systemsByName.get(system);

  if (!notes) {
    throw new Error(`Invalid System Calculator: ${system}`);
  }

  return notes;
}

/**
 * Whether a name refers to one of the built-in calculators, as opposed to a
 * user-authored diapason from the system configuration screen.
 * @param {string} name
 * @returns {boolean}
 */
export const isBuiltInSystem = (name) => name === EQUAL_TEMPERAMENT || systemsByName.has(name);

// The short triadType aliases used inside the scale files map onto the names
// the configuration screen shows.
const aliases = new Map([
  ['major', 'majorScaleNotes'],
  ['minor', 'naturalMinorScaleNotes'],
  ['diminished', 'diminishedScaleNotes'],
]);

/**
 * The canonical name for a built-in calculator, so a triadType always matches
 * one of the names offered in the configuration screen.
 * @param {string} name
 * @returns {string}
 */
export const canonicalSystemName = (name) => aliases.get(name) ?? name;

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
