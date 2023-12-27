let audioContext = null;
let oscillators = [];

function playSound(frequency) {
  console.log('Frequency:', frequency);

  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (!isFinite(frequency)) {
    console.error('Invalid frequency value:', frequency);
    return; // Exit the function if frequency is not a finite number
  }

  const oscillator = audioContext.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  oscillator.connect(audioContext.destination);
  oscillator.start();
  oscillators.push(oscillator);
}

function stopAllSounds() {
  oscillators.forEach(oscillator => {
    oscillator.stop();
    oscillator.disconnect();
  });
  oscillators = [];
}
