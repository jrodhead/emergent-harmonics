import { isValidSystem } from './isValidSystem.js';

export const KEY_ROWS = ['qwertyuiop', 'asdfghjkl;', 'zxcvbnm,./'];

/**
 * Lays the diapasons of a system across the three alpha key rows, starting at
 * the given diapason and climbing a diapason per row. A row longer than its
 * diapason keeps running into the diapasons above it, and a diapason longer
 * than a row spills onto the row below before the climb resumes.
 *
 * Kept free of the DOM so the mapping can be checked on its own.
 *
 * @param {Array} system - Diapasons, low to high.
 * @param {number} startDiapasonIndex - The diapason the first row starts on.
 * @returns {Array} Entries of { key, frequency, relationshipToRoot, octaveShift }.
 */
export function buildAlphaKeyMap(system, startDiapasonIndex) {
  if (!isValidSystem(system)) {
    console.error('Invalid system or root provided:', system);
    return [];
  }

  const alphaKeyMap = [];
  let diapasonIndex = startDiapasonIndex;
  let noteIndex = 0;

  for (const rowKeys of KEY_ROWS) {
    const rowDiapason = system[diapasonIndex];

    if (!rowDiapason) {
      console.error('Invalid diapason index:', diapasonIndex);
      break;
    }

    if (!Array.isArray(rowDiapason.notes)) {
      console.error('Invalid notes in the diapason:', rowDiapason.notes);
      break;
    }

    // Walk the row's keys, climbing through as many diapasons as it takes to
    // fill them: a short diapason hands over to the one above it, and again
    // above that, so no key on a filled row is left silent.
    let fillDiapasonIndex = diapasonIndex;
    let fillNoteIndex = noteIndex;

    for (let keyIndex = 0; keyIndex < rowKeys.length; keyIndex++) {
      let diapason = system[fillDiapasonIndex];

      while (diapason && Array.isArray(diapason.notes) && !diapason.notes[fillNoteIndex]) {
        fillDiapasonIndex++;
        fillNoteIndex = 0;
        diapason = system[fillDiapasonIndex];
      }

      // Nothing left above the row: the keyboard stops rather than wrapping.
      if (!diapason || !Array.isArray(diapason.notes)) break;

      const note = diapason.notes[fillNoteIndex];

      alphaKeyMap.push({
        key: rowKeys[keyIndex],
        frequency: note.frequency,
        relationshipToRoot: note.relationshipToRoot,
        octaveShift: diapason.octaveShift,
      });

      fillNoteIndex++;
    }

    // A diapason too long for one row carries on across the next one. Once it
    // has been laid out in full the climb resumes from the diapason above the
    // one this row started on, even if this row already borrowed its opening
    // notes to fill itself out.
    const spilled = fillDiapasonIndex === diapasonIndex && fillNoteIndex < rowDiapason.notes.length;

    if (spilled) {
      noteIndex = fillNoteIndex;
      continue;
    }

    // Rows above the top of the audible range have nothing left to show.
    diapasonIndex++;
    noteIndex = 0;
    if (diapasonIndex >= system.length) break;
  }

  return alphaKeyMap;
}
