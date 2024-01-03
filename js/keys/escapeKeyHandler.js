import { stopAllSounds } from '../audio/audioHandler.js';

/**
 * Event listeners for the 'Escape' key to stop all sounds.
 * @param {KeyboardEvent} ev - The keyboard event object.
 */
document.body.addEventListener('keydown', (ev) => {
  // Check if the 'Escape' key is pressed
  if (ev.key === 'Escape') {
    // Ignore repeated keydown events
    if (ev.repeat) return;

    // Stop all sounds and add a CSS class to indicate stop
    stopAllSounds();
    document.body.classList.add('stop');
  }
});

document.body.addEventListener('keyup', (ev) => {
  // Check if the 'Escape' key is released
  if (ev.key === 'Escape') {
    // Ignore repeated keyup events
    if (ev.repeat) return;

    // Remove the CSS class that indicates stop
    document.body.classList.remove('stop');
  }
});
