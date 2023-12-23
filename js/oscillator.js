let audioContext = null;
let oscillators = [];
const maxSimultaneousNotes = 6;

function playSound(frequency) {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
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

function handleNoteEvent(event) {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (event.target.classList.contains('note')) {
    const frequency = parseFloat(event.target.querySelector('.note-frequency').textContent);

    if (oscillators.length < maxSimultaneousNotes) {
      playSound(frequency);
    }
  }
}

document.getElementById('systemTable').addEventListener('touchstart', handleNoteEvent);
document.getElementById('systemTable').addEventListener('touchend', stopAllSounds);
document.getElementById('systemTable').addEventListener('click', handleNoteEvent);
