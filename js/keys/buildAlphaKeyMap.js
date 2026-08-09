import { isValidSystem } from './isValidSystem.js';

export const KEY_ROWS = ['qwertyuiop', 'asdfghjkl;', 'zxcvbnm,./'];

/**
 * Lays the diapasons of a system across the three alpha key rows, starting at
 * the given diapason and climbing a diapason per row. A row longer than its
 * diapason keeps running into the opening notes of the next one.
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

  for (const rowKeys of KEY_ROWS) {
    const diapason = system[diapasonIndex];

    if (!diapason) {
      console.error('Invalid diapason index:', diapasonIndex);
      break;
    }

    if (!Array.isArray(diapason.notes)) {
      console.error('Invalid notes in the diapason:', diapason.notes);
      break;
    }

    const rowNotes = diapason.notes.slice(0, rowKeys.length);

    rowNotes.forEach((note, noteIndex) => {
      alphaKeyMap.push({
        key: rowKeys[noteIndex],
        frequency: note.frequency,
        relationshipToRoot: note.relationshipToRoot,
        octaveShift: diapason.octaveShift,
      });
    });

    // Fill the rest of the row with the opening notes of the next diapason,
    // so a row keeps running upward past the octave.
    const nextDiapason = system[diapasonIndex + 1];
    const nextNotes = nextDiapason?.notes ?? [];
    const extraKeysCount = Math.min(rowKeys.length - rowNotes.length, nextNotes.length);

    for (let extraIndex = 0; extraIndex < extraKeysCount; extraIndex++) {
      alphaKeyMap.push({
        key: rowKeys[rowNotes.length + extraIndex],
        frequency: nextNotes[extraIndex].frequency,
        relationshipToRoot: nextNotes[extraIndex].relationshipToRoot,
        octaveShift: nextDiapason.octaveShift,
      });
    }

    // Rows above the top of the audible range have nothing left to show.
    diapasonIndex++;
    if (diapasonIndex >= system.length) break;
  }

  return alphaKeyMap;
}
