import { currentRootIndex } from './numericKeyHandler.js';
import { currentDiapasonIndex } from "./arrowKeyHandler.js";
import { alphaKeyHandler } from './alphaKeyHandler.js';
import { alphaKeyMapGlobal, musicalSystemGlobal, updateAlphaKeyMapGlobal } from '../main.js';

/**
 * Creates a key map for the notes in a diapason, associating notes with keys.
 * @param {Array} diapason - An array of notes in a diapason.
 * @returns {Array} - A key map array associating notes with keys.
 */

function isValidSystem(system) {
  return Array.isArray(system) && system.length > 0;
}

function isValidDiapasons(diapasons) {
  return diapasons && Array.isArray(diapasons) && diapasons.length > 0;
}

export function createAlphaKeyMap(system) {
  if (!isValidSystem(system)) {
    console.error('Invalid system or root provided:', system);
    return [];
  }

  const keys = 'qwertyuiopasdfghjklzxcvbnm'.split('');
  let alphaKeyMap = [];

  const root = system[currentRootIndex];

  if (!isValidDiapasons(root.diapasons)) {
    console.error('Invalid diapasons in the root:', root && root.diapasons);
    return [];
  }

  if (currentDiapasonIndex >= 0 && currentDiapasonIndex < root.diapasons.length) {
    const notes = root.diapasons[currentDiapasonIndex].notes;

    if (notes && Array.isArray(notes)) {
      alphaKeyMap = notes.map((note, noteIndex) => {
        const key = keys[noteIndex % keys.length];

        return {
          key: key,
          frequency: note.frequency,
          elementId: note.noteName,
          relationshipToRoot: note.relationshipToRoot,
        };
      });
    } else {
      console.error('Invalid notes in the diapason:', notes);
    }
  } else {
    console.error('Invalid diapason index:', currentDiapasonIndex);
  }
  console.log('createAlphaKeyMap result:', alphaKeyMap);
  updateAlphaKeyMapGlobal(alphaKeyMap);
  renderAlphaKeyMapTable(alphaKeyMapGlobal);

  return alphaKeyMapGlobal;
}

function renderAlphaKeyMapTable(alphaKeyMap) {
  let alphaGridHTML = `
    <div class="grid-container">
      <div class="diapason">
  `;

  Object.entries(alphaKeyMap).map(([noteIndex, { elementId, key, frequency, relationshipToRoot }]) => {
    alphaGridHTML += `
      <div id="note${noteIndex}" class="note">
        <div class="degree">${relationshipToRoot.degree} - ${currentDiapasonIndex}</div>
        <div class="key-name">${key}</div>
        <div class="ratio">ratio: ${relationshipToRoot.ratioToRoot}</div>
        <div class="relationship">${relationshipToRoot.relationshipToRootName}</div>
        <div class="triad-type">${relationshipToRoot.triadType}</div>
        <div class="note-frequency">${frequency}Hz</div>
      </div>
    `;
  });

  alphaGridHTML += '</div></div>';

  document.getElementById('alphaKeyTable').innerHTML = alphaGridHTML;

  // Event listeners for keydown and keyup events
  document.body.addEventListener('keydown', alphaKeyHandler);
  document.body.addEventListener('keyup', alphaKeyHandler);
}
