/**
 * @fileoverview This file contains the implementation of creating a key map for the notes in a diapason, associating notes with keys.
 * @module alphaKeyMap
 */

import { currentRootIndex } from './numericKeyHandler.js';
import { currentDiapasonIndex } from "./arrowKeyHandler.js";
import { alphaKeyHandler } from './alphaKeyHandler.js';
import { alphaKeyMapGlobal, updateAlphaKeyMapGlobal } from '../main.js';

/**
 * Checks if the provided system is valid.
 * @param {Array} system - The system to be checked.
 * @returns {boolean} - True if the system is valid, false otherwise.
 */
function isValidSystem(system) {
  return Array.isArray(system) && system.length > 0;
}

/**
 * Checks if the provided diapasons are valid.
 * @param {Array} diapasons - The diapasons to be checked.
 * @returns {boolean} - True if the diapasons are valid, false otherwise.
 */
function isValidDiapasons(diapasons) {
  return diapasons && Array.isArray(diapasons) && diapasons.length > 0;
}

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
        const key = remainingKeys[noteIndex % remainingKeys.length];

        return {
          key: key,
          frequency: note.frequency,
          elementId: note.noteName,
          relationshipToRoot: note.relationshipToRoot,
        };
      });

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

/**
 * Renders the alpha key map table.
 * @param {Array} alphaKeyMap - The alpha key map to be rendered.
 */
function renderAlphaKeyMapTable(alphaKeyMap) {
  let alphaGridHTML = `
    <div class="grid-container">
      <div class="diapason">
  `;

  Object.entries(alphaKeyMap).map(([noteIndex, { key, frequency, relationshipToRoot }]) => {
    alphaGridHTML += `
      <div id="${frequency}" class="note">
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