export function createSystem(diapasonsInSystem, notesInDiapason, rootNote, systemCalculator) {
  let system = [];

  for (let diapason = 0; diapason < diapasonsInSystem; diapason++) {
    system[diapason] = [];
    for (let note = 0; note < notesInDiapason; note++) {
      const frequency = systemCalculator(note, diapason, notesInDiapason, rootNote);
      system[diapason][note] = {
        noteName: note,
        frequency: frequency,
      };
    }
  }

  console.log('createSystem result: ', system);
  return system;
}

export function renderSystemTable(musicalSystem) {
  let gridHTML = '<div class="grid-container">';

  for (let diapason = 0; diapason < musicalSystem.length; diapason++) {
    gridHTML += `<div class="diapason">`;
    for (let note = 0; note < musicalSystem[diapason].length; note++) {
      const { noteName, frequency } = musicalSystem[diapason][note];
      gridHTML += `<div class="note">
                    <div class="note-name">${note}</div> <!-- Display note number -->
                    <div class="note-frequency">${frequency}</div>
                  </div>`;
    }
    gridHTML += '</div>';
  }
  gridHTML += '</div>';

  document.getElementById('systemTable').innerHTML = gridHTML;
}
