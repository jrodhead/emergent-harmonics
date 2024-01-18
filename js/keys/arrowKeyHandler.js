/**
 * This module handles the arrow key events for changing the diapason index.
 * It exports the currentDiapasonIndex and updateCurrentDiapasonIndex variables,
 * as well as the handleDiapasonChange function.
 * The currentDiapasonIndex represents the current index of the diapason in the musical system.
 * The updateCurrentDiapasonIndex function updates the currentDiapasonIndex based on the direction provided.
 * The handleDiapasonChange function is called when the arrow keys are pressed and updates the currentDiapasonIndex
 * and the key map based on the new diapason.
 */

import { musicalSystemGlobal, updateAlphaKeyMapGlobal } from '../main.js';
import { currentRootIndex } from './numericKeyHandler.js';
import { createAlphaKeyMap } from "./alphaKeyMap.js";

let currentDiapasonIndex = 0; // Assuming the initial diapason index is 0

/**
 * Updates the currentDiapasonIndex based on the direction provided.
 * @param {string} direction - The direction of the diapason change. Can be 'next' or 'previous'.
 */
const updateCurrentDiapasonIndex = (direction) => {
  if (direction === 'next') {
    currentDiapasonIndex++;
  } else if (direction === 'previous') {
    currentDiapasonIndex--;
  }

  // Ensure the diapason index stays within valid bounds
  if (currentDiapasonIndex < 0 || currentDiapasonIndex >= musicalSystemGlobal.length) {
    currentDiapasonIndex = Math.max(0, Math.min(musicalSystemGlobal.length - 1, currentDiapasonIndex));
    return;
  }
};

export { currentDiapasonIndex, updateCurrentDiapasonIndex};

document.body.addEventListener('keydown', (ev) => {
  // Ignore repeated keydown events
  if (ev.repeat) return;

  // Handle diapason change with up and down arrow keys
  if (ev.key === 'ArrowUp') {
    // Go to the next diapason (current diapason + 1)
    handleDiapasonChange('next');
  } else if (ev.key === 'ArrowDown') {
    // Go to the previous diapason (current diapason - 1)
    handleDiapasonChange('previous');
  }
});

/**
 * Handles the diapason change based on the direction provided.
 * Updates the currentDiapasonIndex and the key map based on the new diapason.
 * @param {string} direction - The direction of the diapason change. Can be 'next' or 'previous'.
 */
const handleDiapasonChange = (direction) => {
  updateCurrentDiapasonIndex(direction);

  // Ensure the diapason index stays within valid bounds
  if (currentDiapasonIndex < 0 || currentDiapasonIndex >= musicalSystemGlobal[currentRootIndex].diapasons.length) {
    currentDiapasonIndex = Math.max(0, Math.min(musicalSystemGlobal[currentRootIndex].diapasons.length - 1, currentDiapasonIndex));
    return;
  }

  // Update key map based on the new diapason
  const newKeyMap = createAlphaKeyMap(musicalSystemGlobal);
  updateAlphaKeyMapGlobal(newKeyMap);
};
