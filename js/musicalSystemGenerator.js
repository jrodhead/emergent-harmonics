function createSystem(diapasonsInSystem, notesInDiapason, rootNote) {
  let system = [];

  for (let diapason = 0; diapason < diapasonsInSystem; diapason++) {
    system[diapason] = [];
    for (let note = 0; note < notesInDiapason; note++) {
      const frequency = calcFreq(note, diapason, notesInDiapason, rootNote);
      system[diapason][note] = {
        noteName: `note${note}-diapason${diapason}`,
        frequency: frequency.toFixed(8), // Adjust decimal places as needed
      };
    }
  }

  return system;
}

// Example frequency calculation (for equal-tempered scale)
function calcFreq(note, diapason, notesInDiapason, rootNote) {
  const notePower = Math.pow(2, 1 / notesInDiapason);
  return (
    rootNote *
    Math.pow(notePower, note) *
    Math.pow(2, diapason)
  );
}

// Usage:
const diapasonsInSystem = 3;
const notesInDiapason = 3;
const rootNote = 440;

const musicalSystem = createSystem(diapasonsInSystem, notesInDiapason, rootNote);
console.log(musicalSystem); // View the generated musical system object

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
