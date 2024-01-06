import { currentRootIndex } from './numericKeyHandler.js';
import { currentDiapasonIndex } from "./arrowKeyHandler.js";

/**
 * Creates a key map for the notes in a diapason, associating notes with keys.
 * @param {Array} diapason - An array of notes in a diapason.
 * @returns {Array} - A key map array associating notes with keys.
 */
export function createKeyMap(system) {
  if (!Array.isArray(system) || !system.length || !system[currentRootIndex]) {
    console.error('Invalid system or root provided:', system);
    return [];
  }

  const keys = 'qwertyuiopasdfghjklzxcvbnm'.split('');
  let keyMap = [];

  const root = system[currentRootIndex];

  if (!root || !root.diapasons || !Array.isArray(root.diapasons) || !root.diapasons.length) {
    console.error('Invalid diapasons in the root:', root && root.diapasons);
    return [];
  }

  if (currentDiapasonIndex >= 0 && currentDiapasonIndex < root.diapasons.length) {
    const notes = root.diapasons[currentDiapasonIndex].notes;

    if (notes && Array.isArray(notes)) {
      for (let noteIndex = 0; noteIndex < notes.length; noteIndex++) {
        const note = notes[noteIndex];
        const key = keys[noteIndex % keys.length]; // Cycle through keys

        keyMap.push({
          key: key,
          frequency: note.frequency,
          elementId: note.noteName,
        });
      }
    } else {
      console.error('Invalid notes in the diapason:', notes);
    }
  } else {
    console.error('Invalid diapason index:', currentDiapasonIndex);
  }

  console.log('createKeyMap result:', keyMap);
  return keyMap;
}

/**
 * Renders a table based on the provided key map.
 * @param {Array} keyMap - An array representing the key map to render.
 */
export function renderAlphaKeyMapTable(keyMap) {
  let gridHTML = '<div class="grid-container"><div class="diapason">';

  for (let note = 0; note < keyMap.length; note++) {
    const { elementId, key, frequency } = keyMap[note];
    gridHTML += `<div id="${note}" class="note">
                  <div class="note-name">${elementId}</div>
                  <div class="key-name">${key}</div>
                  <div class="note-frequency">${frequency}</div>
                </div>`;
  }
  gridHTML += '</div></div>';

  document.getElementById('alphaKeyTable').innerHTML = gridHTML;
}
