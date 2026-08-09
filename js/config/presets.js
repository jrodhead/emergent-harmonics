import {
  noteGenerators,
  getNotesForSystem,
  isBuiltInSystem,
  canonicalSystemName,
} from '../scaleCalculators/noteGenerators.js';
import { describeRatio } from '../format.js';

const ROMAN_NUMERALS = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII',
  'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI',
];

export const presetNames = Object.keys(noteGenerators);

export const degreeForIndex = (index) => ROMAN_NUMERALS[index] ?? `${index + 1}`;

/**
 * Folds a ratio into a single diapason, so every note of a configured diapason
 * sits between the root and its octave. Presets written across several octaves
 * (or below the root) keep their pitch classes.
 */
export const foldRatioIntoDiapason = (ratio) => {
  if (!Number.isFinite(ratio) || ratio <= 0) return 1;

  let folded = ratio;
  while (folded >= 2) folded /= 2;
  while (folded < 1) folded *= 2;

  return folded;
};

const presetNotes = (presetName) => {
  const preset = noteGenerators[presetName];

  // equalTemperamentNoteGenerator is a generator rather than a fixed list.
  return typeof preset === 'function' ? preset() : getNotesForSystem(presetName);
};

/**
 * Turns a built-in calculator into notes that can be edited on the
 * configuration screen: folded into one diapason, ordered, de-duplicated, and
 * with every field the UI shows filled in.
 *
 * @param {string} presetName - A key of noteGenerators.
 * @param {string} ownDiapasonId - Diapason to point unresolvable triadTypes at.
 */
export const presetToNotes = (presetName, ownDiapasonId) => {
  const seenRatios = new Set();

  return presetNotes(presetName)
    .map((note) => ({ ...note, ratioToRoot: foldRatioIntoDiapason(note.ratioToRoot) }))
    .filter((note) => {
      const key = note.ratioToRoot.toFixed(6);
      if (seenRatios.has(key)) return false;
      seenRatios.add(key);
      return true;
    })
    .sort((a, b) => a.ratioToRoot - b.ratioToRoot)
    .map((note, index) => ({
      degree: degreeForIndex(index),
      relationshipToRootName: note.relationshipToRootName ?? describeRatio(note.ratioToRoot),
      ratioToRoot: note.ratioToRoot,
      // Presets whose triadType names another built-in keep that relationship;
      // the rest fall back to the diapason they belong to.
      triadType: isBuiltInSystem(note.triadType) ? canonicalSystemName(note.triadType) : ownDiapasonId,
    }));
};
