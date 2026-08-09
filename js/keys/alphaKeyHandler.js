import { playSound, stopSound } from '../audio/audioHandler.js';
import { alphaKeyMap } from './createDiapasonRowKeyMap.js';
import { heldRootKeys, heldAlphaKeys } from './heldKeysState.js';
import { currentPlayMode } from './playModeHandler.js';
import { shouldIgnoreKeyEvent } from './keyEventGuard.js';

const playNoteForKey = (key) => {
  const keyData = alphaKeyMap.find((item) => item.key === key);
  if (!keyData) return;

  const currentVolume = document.getElementById('oscillatorVolume').value;
  const waveShape = document.getElementById('waveShape').value;

  playSound(keyData.frequency, key, currentVolume, waveShape);
  document.getElementById(key)?.classList.add('active');
};

const stopNoteForKey = (key) => {
  stopSound(key);
  document.getElementById(key)?.classList.remove('active');
};

/**
 * Handles key events for sound playback and UI changes.
 * @param {string} ev - The type of keyboard event ('keydown' or 'keyup').
 * @param {string} key - The key associated with the event.
 */
const handleAlphaKey = (ev, key) => {
  if (ev === 'keydown') {
    heldAlphaKeys.add(key);

    // In hold mode, a note only sounds while a root key is also held.
    if (currentPlayMode === 'hold' && heldRootKeys.size === 0) {
      return;
    }

    playNoteForKey(key);
  } else if (ev === 'keyup') {
    heldAlphaKeys.delete(key);
    stopNoteForKey(key);
  } else {
    // Log an error if unable to handle the key event
    console.error('Unable to handle key event:', ev);
  }
};

/**
 * Handles keyboard events for key presses and releases.
 * @param {Event} ev - The keyboard event.
 */
export const alphaKeyHandler = (ev) => {
  if (ev.repeat || shouldIgnoreKeyEvent(ev)) return;

  // Find key data for the pressed key
  const keyData = alphaKeyMap.find((item) => item.key === ev.key);
  if (!keyData) return;

  // Handle the key event
  handleAlphaKey(ev.type, ev.key);
};

document.body.addEventListener('keydown', alphaKeyHandler);
document.body.addEventListener('keyup', alphaKeyHandler);

// The key map just redrew (new root, new diapason), so any already-held note
// needs to be re-sounded against the fresh elements and frequencies rather
// than left showing a stale (or now-missing) active state.
document.body.addEventListener('alphaKeyMapChanged', () => {
  heldAlphaKeys.forEach((key) => {
    stopNoteForKey(key);
    if (currentPlayMode !== 'hold' || heldRootKeys.size > 0) {
      playNoteForKey(key);
    }
  });
});

// In hold mode, releasing the last held root silences whatever alpha keys
// are still down, like lifting the fretting hand off a still-picked string.
document.body.addEventListener('rootReleased', () => {
  heldAlphaKeys.forEach(stopNoteForKey);
});
