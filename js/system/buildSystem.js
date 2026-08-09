import { generateRootNotes, generateScaleNotes, homeDiapasonIndex } from '../scaleCalculators/musicalSystemGenerator.js';
import { getConfig, getPrimaryDiapason } from '../config/systemConfigState.js';
import { resolveNoteSet } from '../config/resolveNoteSet.js';
import { renderNumericKeyTable, displayActiveRootNote } from '../keys/renderNumericKeyTable.js';
import { createDiapasonRowKeyMap } from '../keys/createDiapasonRowKeyMap.js';
import {
  activeScaleNotesGlobal,
  currentOctaveShift,
  isValidRootIndex,
  updateActiveScaleNotesGlobal,
  updateCurrentDiapasonIndex,
  updateCurrentRootIndex,
  updateRootNotesGlobal,
  rootNotesGlobal,
} from '../systemState.js';

/**
 * Generates the diapasons for a root note and points the alpha keys at them.
 *
 * @param {number} rootIndex - Which of the root notes to build from.
 * @param {boolean} keepOctave - Stay in the octave the keys are already in,
 *   rather than dropping back to the root's own diapason.
 */
export function selectRootNote(rootIndex, { keepOctave = true } = {}) {
  if (!isValidRootIndex(rootIndex)) {
    console.error('Invalid root index:', rootIndex);
    return;
  }

  const previousOctaveShift = currentOctaveShift();
  const rootNote = rootNotesGlobal[rootIndex];
  const scaleNotesPerDiapason = generateScaleNotes(
    rootNote.frequency,
    resolveNoteSet(rootNote.relationshipToRoot.triadType),
  );

  updateCurrentRootIndex(rootIndex);
  updateActiveScaleNotesGlobal(scaleNotesPerDiapason);

  // Changing root mid-play should not jump the keys into another register.
  const keptIndex = keepOctave
    ? scaleNotesPerDiapason.findIndex((diapason) => diapason.octaveShift === previousOctaveShift)
    : -1;

  updateCurrentDiapasonIndex(keptIndex === -1 ? homeDiapasonIndex(scaleNotesPerDiapason) : keptIndex);
  displayActiveRootNote(rootIndex);
  createDiapasonRowKeyMap(activeScaleNotesGlobal);
}

/**
 * Rebuilds the whole playable system from the current configuration: the root
 * notes on the numeric keys, and the diapasons on the alpha keys.
 */
export function buildSystemFromConfig() {
  const config = getConfig();
  const rootNotes = generateRootNotes(config.primaryRootFrequency, getPrimaryDiapason().notes);

  updateRootNotesGlobal(rootNotes);
  renderNumericKeyTable(rootNotes);
  selectRootNote(0, { keepOctave: false });
}
