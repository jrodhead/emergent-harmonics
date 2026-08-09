/**
 * Handles the arrow key events that move the note keys between registers.
 * The system now spans every register that fits inside the audible range, so
 * the number of registers depends on the root note and the configured notes.
 */
import { mapNoteKeys } from './mapNoteKeys.js';
import { shouldIgnoreKeyEvent } from './keyEventGuard.js';
import { registers, currentRegisterIndex, updateCurrentRegisterIndex } from '../systemState.js';

/**
 * Moves the note keys one register in the given direction, if there is one.
 * @param {string} direction - 'next' or 'previous'.
 */
const changeRegister = (direction) => {
  const nextIndex = direction === 'next' ? currentRegisterIndex + 1 : currentRegisterIndex - 1;

  if (nextIndex < 0 || nextIndex >= registers.length) return;

  updateCurrentRegisterIndex(nextIndex);
  mapNoteKeys(registers);
};

document.body.addEventListener('keydown', (ev) => {
  if (ev.repeat || shouldIgnoreKeyEvent(ev)) return;

  if (ev.key === 'ArrowUp') {
    changeRegister('next');
  } else if (ev.key === 'ArrowDown') {
    changeRegister('previous');
  }
});
