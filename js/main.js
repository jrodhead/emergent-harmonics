import { createSystem, renderSystemTable } from "./musicalSystemGenerator.js";

// Set form defaults
const diapasonsInSystem = 1;
const notesInDiapason = 1;
const rootNote = 440;

document.getElementById('notes').value = notesInDiapason;
document.getElementById('rootNote').value = rootNote;
document.getElementById('diapasons').value = diapasonsInSystem;

// Generate and display system

const musicalSystem = createSystem(diapasonsInSystem, notesInDiapason, rootNote);

renderSystemTable(musicalSystem);

// Event listener for form submission
document.getElementById('systemConfigForm').addEventListener('submit', function(event) {
  event.preventDefault();

  const diapasonsInSystem = parseInt(document.getElementById('diapasons').value);
  const notesInDiapason = parseInt(document.getElementById('notes').value);
  const rootNote = parseInt(document.getElementById('rootNote').value);

  const musicalSystem = createSystem(diapasonsInSystem, notesInDiapason, rootNote);
  renderSystemTable(musicalSystem);
});
