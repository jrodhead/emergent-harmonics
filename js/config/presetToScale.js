import { presetNotes } from '../presets/registry.js';
import { foldRatioIntoPeriod } from '../system/period.js';
import { degreeForIndex } from './degrees.js';
import { describeRatio } from '../format.js';

/**
 * Turns a built-in preset into notes that can be edited on the configuration
 * screen: folded into one period, ordered, de-duplicated, and with every field
 * the UI shows filled in.
 *
 * A preset's degrees name the scales they build — the major scale's second
 * degree builds the natural minor — and those names are turned into the
 * configured scales holding them, so every scale the keys can reach is one
 * that can be edited. A degree naming something the family does not cover
 * builds the scale it belongs to.
 *
 * @param {string} presetId - A built-in preset.
 * @param {Map} scaleIdByPreset - Which configured scale holds each preset of
 *   the family, including this one.
 * @returns {Array} Notes for a configured scale.
 */
export const presetToNotes = (presetId, scaleIdByPreset) => {
  const ownScaleId = scaleIdByPreset.get(presetId);
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
      rootScaleId: scaleIdByPreset.get(note.rootScaleId) ?? ownScaleId,
    }));
};
