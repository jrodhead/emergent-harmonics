let audioContext = null;
let oscillators = [];
const maxSimultaneousNotes = 6;

function playSound(frequency) {
  console.log('Frequency:', frequency);

  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (!isFinite(frequency)) {
    console.error('Invalid frequency value:', frequency);
    return;
  }

  if (oscillators.length < maxSimultaneousNotes) {
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.connect(audioContext.destination);
    oscillator.start();
    oscillators.push(oscillator);
  }
}

function stopAllSounds() {
  oscillators.forEach(oscillator => {
    oscillator.stop();
    oscillator.disconnect();
  });
  oscillators = [];
}

// Event listener for 'Play Sound' button
document.getElementById('startButton').addEventListener('click', function() {
  playSound(440);
});

// Event listener for 'Stop Sound' button
document.getElementById('stopButton').addEventListener('click', stopAllSounds);