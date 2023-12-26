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

// Assume your notes are represented as elements with the class 'note'
const notes = document.querySelectorAll('.note');

// Add event listeners to each note
notes.forEach(note => {
  note.addEventListener('click', function() {
    // Extract frequency from the note's data attribute or other source
    const frequency = parseFloat(this.dataset.frequency); // Adjust how you get the frequency

    // Call the playSound function with the extracted frequency
    playSound(frequency);
  });
});

// Stop all sounds on touchend at the document level
document.addEventListener('touchend', stopAllSounds);