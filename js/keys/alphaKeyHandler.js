import { playSound, stopSound } from '../audio/audioHandler.js';
import { alphaKeyMapGlobal } from '../main.js';

/**
 * Handles key events for sound playback and UI changes.
 * @param {string} ev - The type of keyboard event ('keydown' or 'keyup').
 * @param {string} action - The key action associated with the event.
 */
const handleAlphaKey = (ev, action) => {
  // Find key data corresponding to the action
  const keyData = alphaKeyMapGlobal.find((item) => item.key === action);
  if (!keyData) return;

  const { frequency } = keyData;
  console.log (`frequency: ${frequency}`)
  let activeNote = document.getElementById(`${frequency}`);

  if (ev === 'keydown') {
    // Play sound and apply active class on keydown event
    playSound(frequency, action);
    activeNote.classList.add('active');
  } else if (ev === 'keyup') {
    // Stop sound and remove active class on keyup event
    stopSound(action);
    activeNote.classList.remove('active');
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
  if (ev.repeat) return;

  // Find key data for the pressed key
  const keyData = alphaKeyMapGlobal.find((item) => item.key === ev.key);
  if (!keyData) return;

  // Handle the key event
  handleAlphaKey(ev.type, ev.key);
};
