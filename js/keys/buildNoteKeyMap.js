import { hasPlayableRegisters } from './hasPlayableRegisters.js';

export const KEY_ROWS = ['qwertyuiop', 'asdfghjkl;', 'zxcvbnm,./'];

/**
 * Lays the registers of a system across the three note key rows, starting at
 * the given register and climbing a register per row. A row longer than its
 * register keeps running into the registers above it, and a register longer
 * than a row spills onto the row below before the climb resumes.
 *
 * Kept free of the DOM so the mapping can be checked on its own.
 *
 * @param {Array} registers - Registers, low to high.
 * @param {number} startRegisterIndex - The register the first row starts on.
 * @returns {Array} Entries of { key, frequency, definition, periodShift }.
 */
export function buildNoteKeyMap(registers, startRegisterIndex) {
  if (!hasPlayableRegisters(registers)) {
    console.error('Nothing to lay across the keys:', registers);
    return [];
  }

  const noteKeyMap = [];
  let registerIndex = startRegisterIndex;
  let noteIndex = 0;

  for (const rowKeys of KEY_ROWS) {
    const rowRegister = registers[registerIndex];

    if (!rowRegister) {
      console.error('Invalid register index:', registerIndex);
      break;
    }

    if (!Array.isArray(rowRegister.notes)) {
      console.error('Invalid notes in the register:', rowRegister.notes);
      break;
    }

    // Walk the row's keys, climbing through as many registers as it takes to
    // fill them: a short register hands over to the one above it, and again
    // above that, so no key on a filled row is left silent.
    let fillRegisterIndex = registerIndex;
    let fillNoteIndex = noteIndex;

    for (let keyIndex = 0; keyIndex < rowKeys.length; keyIndex++) {
      let register = registers[fillRegisterIndex];

      while (register && Array.isArray(register.notes) && !register.notes[fillNoteIndex]) {
        fillRegisterIndex++;
        fillNoteIndex = 0;
        register = registers[fillRegisterIndex];
      }

      // Nothing left above the row: the keyboard stops rather than wrapping.
      if (!register || !Array.isArray(register.notes)) break;

      const note = register.notes[fillNoteIndex];

      noteKeyMap.push({
        key: rowKeys[keyIndex],
        frequency: note.frequency,
        definition: note.definition,
        periodShift: register.periodShift,
      });

      fillNoteIndex++;
    }

    // A register too long for one row carries on across the next one. Once it
    // has been laid out in full the climb resumes from the register above the
    // one this row started on, even if this row already borrowed its opening
    // notes to fill itself out.
    const spilled = fillRegisterIndex === registerIndex && fillNoteIndex < rowRegister.notes.length;

    if (spilled) {
      noteIndex = fillNoteIndex;
      continue;
    }

    // Rows above the top of the audible range have nothing left to show.
    registerIndex++;
    noteIndex = 0;
    if (registerIndex >= registers.length) break;
  }

  return noteKeyMap;
}
