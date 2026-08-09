import { buildNoteKeyMap } from './buildNoteKeyMap.js';
import { renderNoteKeyTable } from './renderNoteKeyTable.js';
import { currentRegisterIndex } from '../system/state.js';

export let noteKeyMap = [];

/**
 * Points the note keys at the registers the keyboard is currently sitting on,
 * and draws them.
 *
 * @param {Array} registers - Registers, low to high.
 * @returns {Array} The key map that was applied.
 */
export function mapNoteKeys(registers) {
  noteKeyMap = buildNoteKeyMap(registers, currentRegisterIndex);
  renderNoteKeyTable(noteKeyMap);

  // The table just redrew from scratch, so any note already held needs to be
  // resynced against the fresh elements and frequencies.
  document.body.dispatchEvent(new CustomEvent('noteKeyMapChanged'));

  return noteKeyMap;
}
