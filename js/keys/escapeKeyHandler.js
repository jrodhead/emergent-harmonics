import { stopAllSounds } from '../audio/audioHandler.js';
import { stopDrone } from './droneHandler.js';

/**
 * Event listeners for the 'Escape' key to stop all sounds.
 * @param {KeyboardEvent} ev - The keyboard event object.
 */
document.body.addEventListener('keydown', (ev) => {
  // Check if the 'Escape' key is pressed
  if (ev.key === 'Escape') {
    // Ignore repeated keydown events
    if (ev.repeat) return;

    // The drone goes off rather than merely silent, unlike the pedal, which is
    // left down because its key still is. A toggle has no such key: leaving the
    // flag on would make the next ` press a silent no-op.
    stopDrone();
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
    // clear the keys that are lit up, leaving the rest of the UI alone
    const activeKeys = document.querySelectorAll('.note.active, .config-note.active');
    activeKeys.forEach((key) => key.classList.remove('active'));
  }
});
