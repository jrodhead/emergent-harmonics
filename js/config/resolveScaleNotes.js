import { presetNotes, isPreset } from '../presets/registry.js';
import { getConfig, getPrimaryScale } from './systemConfigState.js';

/**
 * Resolves a note's rootScaleId to the notes generated when its root key is
 * pressed. A rootScaleId names either one of the configured scales or one of
 * the built-in presets.
 *
 * @param {string} rootScaleId
 * @returns {Array} The notes of one scale.
 */
export function resolveScaleNotes(rootScaleId) {
  const configured = getConfig().scales.find((scale) => scale.id === rootScaleId);

  if (configured) return configured.notes;
  if (isPreset(rootScaleId)) return presetNotes(rootScaleId);

  console.warn(`Unknown root scale "${rootScaleId}", falling back to the primary scale`);

  return getPrimaryScale().notes;
}
