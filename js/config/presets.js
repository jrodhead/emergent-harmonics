import { presetNames, presetNotes, isPreset, canonicalPresetName } from '../presets/registry.js';
import { describeRatio } from '../format.js';

export { presetNames };

const NUMERALS = [
  ['C', 100], ['XC', 90], ['L', 50], ['XL', 40],
  ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1],
];

/**
 * A note's degree is its position in the scale, written the way scale
 * degrees are conventionally written. Built up rather than listed, since a
 * scale can hold as many notes as the keyboard has keys.
 */
export const degreeForIndex = (index) => {
  let remaining = index + 1;

  return NUMERALS.reduce((numeral, [symbol, value]) => {
    while (remaining >= value) {
      numeral += symbol;
      remaining -= value;
    }

    return numeral;
  }, '');
};

/**
 * Folds a ratio into a single octave, so every note of a configured scale
 * sits between the root and its octave. Presets written across several octaves
 * (or below the root) keep their pitch classes.
 */
export const foldRatioIntoPeriod = (ratio) => {
  if (!Number.isFinite(ratio) || ratio <= 0) return 1;

  let folded = ratio;
  while (folded >= 2) folded /= 2;
  while (folded < 1) folded *= 2;

  return folded;
};

/**
 * Turns a built-in calculator into notes that can be edited on the
 * configuration screen: folded into one octave, ordered, de-duplicated, and
 * with every field the UI shows filled in.
 *
 * @param {string} presetName - The name of a built-in preset.
 * @param {string} ownScaleId - Scale to point unresolvable triadTypes at.
 */
export const presetToNotes = (presetName, ownScaleId) => {
  const seenRatios = new Set();

  return presetNotes(presetName)
    .map((note) => ({ ...note, ratioToRoot: foldRatioIntoPeriod(note.ratioToRoot) }))
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
      // the rest fall back to the scale they belong to.
      triadType: isPreset(note.triadType) ? canonicalPresetName(note.triadType) : ownScaleId,
    }));
};
