import { presetNotes, presetLabel, isPreset } from '../presets/registry.js';
import { getConfig, getPrimaryScale } from './systemConfigState.js';

const configuredScale = (rootScaleId) => getConfig().scales.find((scale) => scale.id === rootScaleId);

/**
 * What to call the scale a note builds when it is the root: the name given to
 * a configured scale, or the label of a built-in preset. Ids never reach the
 * screen, since "scale-2" tells nobody anything.
 *
 * @param {string} rootScaleId
 * @returns {string}
 */
export function rootScaleLabel(rootScaleId) {
  return configuredScale(rootScaleId)?.name ?? presetLabel(rootScaleId) ?? getPrimaryScale().name;
}

/**
 * Resolves a note's rootScaleId to the notes generated when its root key is
 * pressed. A rootScaleId names either one of the configured scales or one of
 * the built-in presets.
 *
 * @param {string} rootScaleId
 * @returns {Array} The notes of one scale.
 */
export function resolveScaleNotes(rootScaleId) {
  const configured = configuredScale(rootScaleId);

  if (configured) return configured.notes;
  if (isPreset(rootScaleId)) return presetNotes(rootScaleId);

  console.warn(`Unknown root scale "${rootScaleId}", falling back to the primary scale`);

  return getPrimaryScale().notes;
}
