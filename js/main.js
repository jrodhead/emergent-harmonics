function createSystem(diapasonsInSystem, notesInDiapason, rootNote) {
  let system = [];

  for (let diapason = 0; diapason < diapasonsInSystem; diapason++) {
    system[diapason] = [];
    for (let note = 0; note < notesInDiapason; note++) {
      const frequency = calculateEqualTemperamentNoteFrequency(note, diapason, notesInDiapason, rootNote);
      system[diapason][note] = {
        noteName: `note${note}-diapason${diapason}`,
        frequency: frequency//.toFixed(4), // Adjust decimal places as needed
      };
    }
  }

  console.log('createSystem result: ', system);
  return system;
}

// Frequency calculation for equal-tempered scale
function calculateEqualTemperamentNoteFrequency(note, diapason, notesInDiapason, rootNote) {
  const notePower = Math.pow(2, 1 / notesInDiapason);
  const frequency = rootNote * Math.pow(notePower, note) * Math.pow(2, diapason);

  console.log('calculated frequency: ', frequency)
  return frequency;
}

function renderSystemTable(musicalSystem) {
  let gridHTML = '<div class="grid-container">';

  for (let diapason = 0; diapason < musicalSystem.length; diapason++) {
    gridHTML += `<div class="diapason">`;
    for (let note = 0; note < musicalSystem[diapason].length; note++) {
      const { noteName, frequency } = musicalSystem[diapason][note];
      gridHTML += `<div class="note">
                    <div class="note-name">${noteName}</div>
                    <div class="note-frequency">${frequency}</div>
                  </div>`;
    }
    gridHTML += '</div>';
  }
  gridHTML += '</div>';

  document.getElementById('systemTable').innerHTML = gridHTML;
}
// Event listener for form submission
document.getElementById('systemConfigForm').addEventListener('submit', function(event) {
  event.preventDefault();

  const diapasonsInSystem = parseInt(document.getElementById('diapasons').value);
  const notesInDiapason = parseInt(document.getElementById('notes').value);
  const rootNote = parseInt(document.getElementById('rootNote').value);

  const musicalSystem = createSystem(diapasonsInSystem, notesInDiapason, rootNote);
  renderSystemTable(musicalSystem);
});

// Event listener for 'Stop All Sounds' button
document.getElementById('stopButton').addEventListener('click', stopAllSounds);

// Usage:
const diapasonsInSystem = 1;
const notesInDiapason = 1;
const rootNote = 440;

const musicalSystem = createSystem(diapasonsInSystem, notesInDiapason, rootNote);

document.getElementById('notes').value = notesInDiapason;
document.getElementById('rootNote').value = rootNote;
document.getElementById('diapasons').value = diapasonsInSystem;

renderSystemTable(musicalSystem);

/////////////////// OSCILLATORS

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
    return; // Exit the function if frequency is not a finite number
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
