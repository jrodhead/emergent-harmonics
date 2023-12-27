let audioContext = null;
const activeOscillators = {}; // Object to store active oscillators by key

export function playSound(frequency, key) {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (!isFinite(frequency)) {
    console.error('Invalid frequency value:', frequency);
    return;
  }

  const oscillator = audioContext.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  oscillator.connect(audioContext.destination);
  oscillator.start();

  activeOscillators[key] = oscillator; // Store the active oscillator by key
}

export function stopSound(key) {
  if (activeOscillators[key]) {
    activeOscillators[key].stop();
    activeOscillators[key].disconnect();
    delete activeOscillators[key]; // Remove the oscillator from the active list
  }
}

export function stopAllSounds() {
  Object.values(activeOscillators).forEach(oscillator => {
    oscillator.stop();
    oscillator.disconnect();
  });
  Object.keys(activeOscillators).forEach(key => {
    delete activeOscillators[key];
  });
  console.log('stop all sounds')
}
