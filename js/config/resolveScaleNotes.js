import { presetNotes, isPreset } from '../presets/registry.js';
import { getConfig, getPrimaryScale } from './systemConfigState.js';

/**
 * Resolves a note's triadType to the notes generated when its root key is
 * pressed. A triadType names either one of the configured scales or one of
 * the built-in calculators.
 *
 * @param {string} triadType
 * @returns {Array} The notes of one scale.
 */
export function resolveScaleNotes(triadType) {
  const configured = getConfig().scales.find((scale) => scale.id === triadType);

  if (configured) return configured.notes;
  if (isPreset(triadType)) return presetNotes(triadType);

  console.warn(`Unknown triad type "${triadType}", falling back to the primary scale`);

  return getPrimaryScale().notes;
}
