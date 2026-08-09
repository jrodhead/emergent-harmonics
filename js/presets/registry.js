import { majorScaleNotes } from './majorScale.js';
import { naturalMinorScaleNotes } from './naturalMinorScale.js';
import { diminishedScaleNotes } from './diminishedScale.js';
import { majorPentatonicScaleNotes } from './majorPentatonicScale.js';
import { minorPentatonicScaleNotes } from './minorPentatonicScale.js';
import { bluesScaleNotes } from './bluesScale.js';
import { hd110067NotesInOneDiapason } from './hd110067.js';
import { equalTemperamentNotes } from './equalTemperament.js';
import { fibonacciNotes } from './fibonacciScale.js';
import { exploratoryNotes } from './exploratory.js';
import { pythagoreanNotes } from './pythagorean.js';

/**
 * The note sets that ship with the app, ready to be loaded and then edited.
 * Equal temperament is the one that is computed rather than written out, since
 * it depends on how many notes the octave is being divided into.
 */
const EQUAL_TEMPERAMENT = 'equalTemperamentNoteGenerator';

const presets = new Map([
  ['majorScaleNotes', majorScaleNotes],
  ['naturalMinorScaleNotes', naturalMinorScaleNotes],
  ['diminishedScaleNotes', diminishedScaleNotes],
  ['majorPentatonicScaleNotes', majorPentatonicScaleNotes],
  ['minorPentatonicScaleNotes', minorPentatonicScaleNotes],
  ['bluesScaleNotes', bluesScaleNotes],
  ['pythagoreanNotes', pythagoreanNotes],
  ['hd110067NotesInOneDiapason', hd110067NotesInOneDiapason],
  ['exploratoryNotes', exploratoryNotes],
  ['fibonacciNotes', fibonacciNotes],
  [EQUAL_TEMPERAMENT, equalTemperamentNotes],
]);

// The short names the note tables use to point at each other, mapped onto the
// preset names the configuration screen shows.
const aliases = new Map([
  ['major', 'majorScaleNotes'],
  ['minor', 'naturalMinorScaleNotes'],
  ['diminished', 'diminishedScaleNotes'],
]);

export const presetNames = [...presets.keys()];

/**
 * The notes of a built-in preset.
 *
 * @param {string} name - A preset name, or one of the short aliases.
 * @param {number} [noteCount] - How many notes to divide the octave into, for
 *   the presets that are computed rather than written out.
 * @returns {Array} Notes, each with at least a ratioToRoot.
 */
export function presetNotes(name, noteCount) {
  const notes = presets.get(canonicalPresetName(name));

  if (!notes) {
    throw new Error(`Unknown preset: ${name}`);
  }

  return typeof notes === 'function' ? notes(noteCount) : notes;
}

/**
 * Whether a name refers to one of the built-in presets, as opposed to a
 * user-authored diapason from the system configuration screen.
 *
 * @param {string} name
 * @returns {boolean}
 */
export const isPreset = (name) => presets.has(canonicalPresetName(name));

/**
 * The canonical name for a preset, so a name written as an alias always
 * matches one of the names offered in the configuration screen.
 *
 * @param {string} name
 * @returns {string}
 */
export function canonicalPresetName(name) {
  return aliases.get(name) ?? name;
}
