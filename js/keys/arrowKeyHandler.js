/**
 * Handles the arrow key events that move the alpha keys between diapasons.
 * The system now spans every diapason that fits inside the audible range, so
 * the number of diapasons depends on the root note and the configured notes.
 */
import { createDiapasonRowKeyMap } from './createDiapasonRowKeyMap.js';
import { shouldIgnoreKeyEvent } from './keyEventGuard.js';
import { activeScaleNotesGlobal, currentDiapasonIndex, updateCurrentDiapasonIndex } from '../systemState.js';

/**
 * Moves the alpha keys one diapason in the given direction, if there is one.
 * @param {string} direction - 'next' or 'previous'.
 */
const changeDiapason = (direction) => {
  const nextIndex = direction === 'next' ? currentDiapasonIndex + 1 : currentDiapasonIndex - 1;

  if (nextIndex < 0 || nextIndex >= activeScaleNotesGlobal.length) return;

  updateCurrentDiapasonIndex(nextIndex);
  createDiapasonRowKeyMap(activeScaleNotesGlobal);
};

document.body.addEventListener('keydown', (ev) => {
  if (ev.repeat || shouldIgnoreKeyEvent(ev)) return;

  if (ev.key === 'ArrowUp') {
    changeDiapason('next');
  } else if (ev.key === 'ArrowDown') {
    changeDiapason('previous');
  }
});
