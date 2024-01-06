import { musicalSystemGlobal, keyMapGlobal, updateKeyMapGlobal } from '../main.js';
import { currentRootIndex } from './numericKeyHandler.js';
import { createKeyMap, renderAlphaKeyMapTable } from "./keyMap.js";

let currentDiapasonIndex = 0; // Assuming the initial diapason index is 0

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
  // Handle diapason change with up and down arrow keys
  if (ev.key === 'ArrowUp') {
    // Go to the next diapason (current diapason + 1)
    handleDiapasonChange('next');
  } else if (ev.key === 'ArrowDown') {
    // Go to the previous diapason (current diapason - 1)
    handleDiapasonChange('previous');
  }
});

const handleDiapasonChange = (direction) => {
  updateCurrentDiapasonIndex(direction);

  // Ensure the diapason index stays within valid bounds
  if (currentDiapasonIndex < 0 || currentDiapasonIndex >= musicalSystemGlobal[currentRootIndex].diapasons.length) {
    currentDiapasonIndex = Math.max(0, Math.min(musicalSystemGlobal[currentRootIndex].diapasons.length - 1, currentDiapasonIndex));
    return;
  }

  // Update key map based on the new diapason
  const newKeyMap = createKeyMap(musicalSystemGlobal);
  updateKeyMapGlobal(newKeyMap);
  renderAlphaKeyMapTable(keyMapGlobal);
};
