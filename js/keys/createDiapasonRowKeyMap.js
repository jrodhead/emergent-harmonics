import { buildAlphaKeyMap } from './buildAlphaKeyMap.js';
import { renderAlphaKeyTable } from './renderAlphaKeyTable.js';
import { currentDiapasonIndex } from '../systemState.js';

export let alphaKeyMap = [];

/**
 * Points the alpha keys at the diapasons the keyboard is currently sitting on,
 * and draws them.
 *
 * @param {Array} system - Diapasons, low to high.
 * @returns {Array} The key map that was applied.
 */
export function createDiapasonRowKeyMap(system) {
  alphaKeyMap = buildAlphaKeyMap(system, currentDiapasonIndex);
  renderAlphaKeyTable(alphaKeyMap);

  // The table just redrew from scratch, so any note already held needs to be
  // resynced against the fresh elements and frequencies.
  document.body.dispatchEvent(new CustomEvent('alphaKeyMapChanged'));

  return alphaKeyMap;
}
