import { majorScaleNotes } from './majorScale.js';
import { naturalMinorScaleNotes } from './naturalMinorScale.js';
import { diminishedScaleNotes } from './diminishedScale.js';
import { majorPentatonicScaleNotes } from './majorPentatonicScale.js';
import { minorPentatonicScaleNotes } from './minorPentatonicScale.js';
import { bluesScaleNotes } from './bluesScale.js';
import { hd110067Notes } from './hd110067.js';
import { equalTemperamentNotes } from './equalTemperament.js';
import { fibonacciNotes } from './fibonacciScale.js';
import { exploratoryNotes } from './exploratory.js';
import { pythagoreanNotes } from './pythagorean.js';

/**
 * The scales that ship with the app, ready to be loaded and then edited. The
 * id is what a configuration stores; the label is what the screen shows.
 *
 * Equal temperament is the one computed rather than written out, since it
 * depends on how many notes the period is being divided into.
 */
const presets = new Map([
  ['major', { label: 'Major', notes: majorScaleNotes }],
  ['naturalMinor', { label: 'Natural minor', notes: naturalMinorScaleNotes }],
  ['diminished', { label: 'Diminished', notes: diminishedScaleNotes }],
  ['majorPentatonic', { label: 'Major pentatonic', notes: majorPentatonicScaleNotes }],
  ['minorPentatonic', { label: 'Minor pentatonic', notes: minorPentatonicScaleNotes }],
  ['blues', { label: 'Blues', notes: bluesScaleNotes }],
  ['pythagorean', { label: 'Pythagorean', notes: pythagoreanNotes }],
  ['hd110067', { label: 'HD 110067', notes: hd110067Notes }],
  ['exploratory', { label: 'Exploratory', notes: exploratoryNotes }],
  ['fibonacci', { label: 'Fibonacci', notes: fibonacciNotes }],
  ['equalTemperament', { label: 'Equal temperament', notes: equalTemperamentNotes }],
]);

export const presetIds = [...presets.keys()];

/** Every preset as the screen offers it: the id to store, the name to show. */
export const presetOptions = () => presetIds.map((id) => ({ value: id, label: presets.get(id).label }));

/** What to call a preset on screen, or nothing if the id names no preset. */
export const presetLabel = (presetId) => presets.get(presetId)?.label;

export const isPreset = (presetId) => presets.has(presetId);

/**
 * The notes of a built-in preset.
 *
 * @param {string} presetId
 * @param {number} [noteCount] - How many notes to divide the period into, for
 *   the presets that are computed rather than written out.
 * @returns {Array} Notes, each with at least a ratioToRoot.
 */
export function presetNotes(presetId, noteCount) {
  const preset = presets.get(presetId);

  if (!preset) {
    throw new Error(`Unknown preset: ${presetId}`);
  }

  return typeof preset.notes === 'function' ? preset.notes(noteCount) : preset.notes;
}
