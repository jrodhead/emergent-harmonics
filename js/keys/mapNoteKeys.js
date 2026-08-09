import { buildNoteKeyMap } from './buildNoteKeyMap.js';
import { renderNoteKeyTable } from './renderNoteKeyTable.js';
import { currentDiapasonIndex } from '../systemState.js';

export let noteKeyMap = [];

/**
 * Points the note keys at the diapasons the keyboard is currently sitting on,
 * and draws them.
 *
 * @param {Array} system - Diapasons, low to high.
 * @returns {Array} The key map that was applied.
 */
export function mapNoteKeys(system) {
  noteKeyMap = buildNoteKeyMap(system, currentDiapasonIndex);
  renderNoteKeyTable(noteKeyMap);

  // The table just redrew from scratch, so any note already held needs to be
  // resynced against the fresh elements and frequencies.
  document.body.dispatchEvent(new CustomEvent('noteKeyMapChanged'));

  return noteKeyMap;
}
