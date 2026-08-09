import { generateRootNotes, buildRegisters, homeRegisterIndex } from './generateSystem.js';
import { getConfig, getPrimaryScale } from '../config/systemConfigState.js';
import { resolveScaleNotes } from '../config/resolveScaleNotes.js';
import { renderRootKeyTable, displayActiveRootNote } from '../keys/renderRootKeyTable.js';
import { mapNoteKeys } from '../keys/mapNoteKeys.js';
import {
  currentPeriodShift,
  isValidRootIndex,
  updateRegisters,
  updateCurrentRegisterIndex,
  updateCurrentRootIndex,
  updateRootNotes,
  rootNotes,
} from '../systemState.js';

/**
 * Generates the registers for a root note and points the note keys at them.
 *
 * @param {number} rootIndex - Which of the root notes to build from.
 * @param {boolean} keepRegister - Stay in the octave the keys are already in,
 *   rather than dropping back to the root's own register.
 */
export function selectRootNote(rootIndex, { keepRegister = true } = {}) {
  if (!isValidRootIndex(rootIndex)) {
    console.error('Invalid root index:', rootIndex);
    return;
  }

  const previousPeriodShift = currentPeriodShift();
  const rootNote = rootNotes[rootIndex];
  const generated = buildRegisters(
    rootNote.frequency,
    resolveScaleNotes(rootNote.definition.rootScaleId),
  );

  updateCurrentRootIndex(rootIndex);
  updateRegisters(generated);

  // Changing root mid-play should not jump the keys into another register.
  const keptIndex = keepRegister
    ? generated.findIndex((register) => register.periodShift === previousPeriodShift)
    : -1;

  updateCurrentRegisterIndex(keptIndex === -1 ? homeRegisterIndex(generated) : keptIndex);
  displayActiveRootNote(rootIndex);
  mapNoteKeys(generated);
}

/**
 * Rebuilds the whole playable system from the current configuration: the root
 * notes on the root keys, and the registers on the note keys.
 */
export function buildSystemFromConfig() {
  const config = getConfig();
  const generated = generateRootNotes(config.primaryRootFrequency, getPrimaryScale().notes);

  updateRootNotes(generated);
  renderRootKeyTable(generated);
  selectRootNote(0, { keepRegister: false });
}
