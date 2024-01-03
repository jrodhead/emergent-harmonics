import { playSound, stopSound } from '../audio/audioHandler.js';
import { keyMapGlobal } from '../main.js';

/**
 * Handles key events for sound playback and UI changes.
 * @param {string} ev - The type of keyboard event ('keydown' or 'keyup').
 * @param {string} action - The key action associated with the event.
 */
const handleKey = (ev, action) => {
  // Find key data corresponding to the action
  const keyData = keyMapGlobal.find((item) => item.key === action);
  if (!keyData) return;

  const { frequency, elementId } = keyData;
  console.log (`frequency: ${frequency}, elementId: ${elementId}`)
  const element = document.getElementById(elementId);

  if (ev === 'keydown') {
    // Play sound and apply active class on keydown event
    playSound(frequency, action);
    element.classList.add('active');
    console.log(`${action}On`);
  } else if (ev === 'keyup') {
    // Stop sound and remove active class on keyup event
    stopSound(action);
    element.classList.remove('active');
    console.log(`${action}Off`);
  } else {
    // Log an error if unable to handle the key event
    console.error('Unable to handle key event:', ev);
  }
};

/**
 * Handles keyboard events for key presses and releases.
 * @param {Event} ev - The keyboard event.
 */
const keyHandler = (ev) => {
  if (ev.repeat) return;

  // Find key data for the pressed key
  const keyData = keyMapGlobal.find((item) => item.key === ev.key);
  if (!keyData) return;

  // Handle the key event
  handleKey(ev.type, ev.key);
};

// Event listeners for keydown and keyup events
document.body.addEventListener('keydown', keyHandler);
document.body.addEventListener('keyup', keyHandler);
