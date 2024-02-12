let audioContext = null;
const activeOscillators = {}; // Object to store active oscillators by key

/**
 * Plays a sound with the specified frequency and volume.
 *
 * @param {number} frequency - The frequency of the sound to be played.
 * @param {number} volume - The volume of the sound to be played.
 * @param {string} key - The key used to store the active oscillator.
 */
export function playSound(frequency, key, volume) {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  const oscillator = audioContext.createOscillator();
  oscillator.type = 'sine';

  if (isFinite(frequency)) { // Check if frequency is finite
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  } else {
    console.error('Invalid frequency value:', frequency);
    return;
  }

  const gainNode = audioContext.createGain();

  if (isFinite(volume)) { // Check if volume is finite
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
  } else {
    console.error('Invalid volume value:', volume);
    return;
  }

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start();

  activeOscillators[key] = {
    oscillator,
    gainNode
  }; // Store the active oscillator and gain node by key
}

/**
 * Updates the volume of the oscillator associated with a given key.
 * @param {string} key - The key associated with the oscillator to update.
 * @param {number} volume - The new volume value.
 */
export function updateVolume(key, volume) {
  const activeOscillator = activeOscillators[key];
  if (activeOscillator) {
    activeOscillator.gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
  }
}

/**
 * Stops the sound associated with a given key.
 * @param {string} key - The key associated with the sound to stop.
 */
export function stopSound(key) {
  const activeOscillator = activeOscillators[key];
  if (activeOscillator) {
    activeOscillator.oscillator.stop();
    activeOscillator.oscillator.disconnect();
    activeOscillator.gainNode.disconnect();
    delete activeOscillators[key]; // Remove the oscillator from the active list
  }
}

/**
 * Stops all active sounds.
 */
export function stopAllSounds() {
  Object.values(activeOscillators).forEach(({ oscillator, gainNode }) => {
    oscillator.stop();
    oscillator.disconnect();
    gainNode.disconnect();
  });
  Object.keys(activeOscillators).forEach(key => {
    delete activeOscillators[key];
  });
  console.log('Stopped all sounds');
}
