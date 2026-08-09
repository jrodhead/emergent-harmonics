import { presetNotes, isPreset } from '../presets/registry.js';
import { foldRatioIntoPeriod } from '../system/period.js';
import { degreeForIndex } from './degrees.js';
import { describeRatio } from '../format.js';

/**
 * Turns a built-in preset into notes that can be edited on the
 * configuration screen: folded into one period, ordered, de-duplicated, and
 * with every field the UI shows filled in.
 *
 * @param {string} presetId - A built-in preset.
 * @param {string} ownScaleId - Scale to point unresolvable rootScaleIds at.
 */
export const presetToNotes = (presetId, ownScaleId) => {
  const seenRatios = new Set();

  return presetNotes(presetId)
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
      intervalName: note.intervalName ?? describeRatio(note.ratioToRoot),
      ratioToRoot: note.ratioToRoot,
      // Presets whose rootScaleId names another built-in keep that relationship;
      // the rest fall back to the scale they belong to.
      rootScaleId: isPreset(note.rootScaleId) ? note.rootScaleId : ownScaleId,
    }));
};
