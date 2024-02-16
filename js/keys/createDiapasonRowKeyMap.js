import { currentRootIndex } from './numericKeyHandler.js';
import { currentDiapasonIndex } from "./arrowKeyHandler.js";
import { alphaKeyMapGlobal, updateAlphaKeyMapGlobal } from '../main.js';
import { isValidSystem, isValidDiapasons } from './isValidSystem.js';
import { renderAlphaKeyMapTable } from './renderAlphaKeyMapTable.js';


export function createDiapasonRowKeyMap(system) {
  if (!isValidSystem(system)) {
    console.error('Invalid system or root provided:', system);
    return [];
  }

  const root = system[currentRootIndex];

  if (!isValidDiapasons(root.diapasons)) {
    console.error('Invalid diapasons in the root:', root && root.diapasons);
    return [];
  }

  const rows = ['qwertyuiop', 'asdfghjkl;', 'zxcvbnm,./'];
  let alphaKeyMap = [];

  let diapasonIndex = currentDiapasonIndex;

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const rowKeys = rows[rowIndex];
    const diapason = root.diapasons[diapasonIndex];

    if (!diapason) {
      console.error('Invalid diapason index:', diapasonIndex);
      break;
    }

    const notes = diapason.notes;

    if (!notes || !Array.isArray(notes)) {
      console.error('Invalid notes in the diapason:', notes);
      break;
    }

    const rowNotes = notes.slice(0, rowKeys.length);

    alphaKeyMap = alphaKeyMap.concat(rowNotes.map((note, noteIndex) => {
      const key = rowKeys[noteIndex];

      return {
        key: key,
        frequency: note.frequency,
        relationshipToRoot: note.relationshipToRoot,
      };
    }));

    diapasonIndex = (diapasonIndex + 1) % root.diapasons.length;
  }

  console.log('createDiapasonRowKeyMap result:', alphaKeyMap);
  updateAlphaKeyMapGlobal(alphaKeyMap);
  renderAlphaKeyMapTable(alphaKeyMapGlobal);

  return alphaKeyMapGlobal;
}
