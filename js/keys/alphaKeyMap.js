import { currentRootIndex } from './numericKeyHandler.js';
import { currentDiapasonIndex } from "./arrowKeyHandler.js";
import { alphaKeyMapGlobal, updateAlphaKeyMapGlobal } from '../main.js';
import { isValidSystem, isValidDiapasons } from './isValidSystem.js';
import { renderAlphaKeyMapTable } from './renderAlphaKeyMapTable.js';

/**
 * Creates a key map for the notes in a diapason, associating notes with keys.
 * @param {Array} system - An array of notes in a diapason.
 * @returns {Array} - A key map array associating notes with keys.
 */
export function createAlphaKeyMap(system) {
  if (!isValidSystem(system)) {
    console.error('Invalid system or root provided:', system);
    return [];
  }

  const root = system[currentRootIndex];

  if (!isValidDiapasons(root.diapasons)) {
    console.error('Invalid diapasons in the root:', root && root.diapasons);
    return [];
  }

  const keys = 'qwertyuiopasdfghjklzxcvbnm'.split('');
  let alphaKeyMap = [];

  if (currentDiapasonIndex >= 0 && currentDiapasonIndex < root.diapasons.length) {
    const notes = root.diapasons[currentDiapasonIndex].notes;

    if (notes && Array.isArray(notes)) {
      alphaKeyMap = notes.map((note, noteIndex) => {
        const key = keys[noteIndex % keys.length];

        return {
          key: key,
          frequency: note.frequency,
          relationshipToRoot: note.relationshipToRoot,
        };
      });
    } else {
      console.error('Invalid notes in the diapason:', notes);
    }
  } else {
    console.error('Invalid diapason index:', currentDiapasonIndex);
  }

  // Assign remaining alpha keys to notes from succeeding diapasons
  let remainingKeys = keys.slice(alphaKeyMap.length);
  let diapasonIndex = currentDiapasonIndex + 1;

  while (remainingKeys.length > 0 && diapasonIndex < root.diapasons.length) {
    const notes = root.diapasons[diapasonIndex].notes;

    if (notes && Array.isArray(notes)) {
      const additionalAlphaKeyMap = notes.map((note, noteIndex) => {
        if (remainingKeys.length === 0) {
          return null; // Stop assigning keys if there are no remaining keys
        }

        const key = remainingKeys[noteIndex % remainingKeys.length];

        return {
          key: key,
          frequency: note.frequency,
          elementId: note.noteName,
          relationshipToRoot: note.relationshipToRoot,
        };
      }).filter(Boolean); // Remove null values from the additionalAlphaKeyMap

      alphaKeyMap = alphaKeyMap.concat(additionalAlphaKeyMap);
      remainingKeys = remainingKeys.slice(additionalAlphaKeyMap.length);
    } else {
      console.error('Invalid notes in the diapason:', notes);
    }

    diapasonIndex++;
  }

  console.log('createAlphaKeyMap result:', alphaKeyMap);
  updateAlphaKeyMapGlobal(alphaKeyMap);
  renderAlphaKeyMapTable(alphaKeyMapGlobal);

  return alphaKeyMapGlobal;
}
