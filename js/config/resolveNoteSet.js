import { presetNotes, isPreset } from '../presets/registry.js';
import { getConfig, getPrimaryDiapason } from './systemConfigState.js';

/**
 * Resolves a note's triadType to the notes generated when its root key is
 * pressed. A triadType names either one of the configured diapasons or one of
 * the built-in calculators.
 *
 * @param {string} triadType
 * @returns {Array} The notes of one diapason.
 */
export function resolveNoteSet(triadType) {
  const configured = getConfig().diapasons.find((diapason) => diapason.id === triadType);

  if (configured) return configured.notes;
  if (isPreset(triadType)) return presetNotes(triadType);

  console.warn(`Unknown triad type "${triadType}", falling back to the primary diapason`);

  return getPrimaryDiapason().notes;
}
