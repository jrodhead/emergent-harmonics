import { createSystem, renderSystemTable } from "./musicalSystemGenerator.js";
import { calculateMajorScaleFrequency } from "./systemCalculators/majorScale.js";
import { calculateEqualTemperamentNoteFrequency } from "./systemCalculators/equalTemperament.js";

// Set form defaults
const rootNote = 440;
const notesInDiapason = 7;
const diapasonsInSystem = 1;
const systemCalculator =
  calculateMajorScaleFrequency;
  // calculateEqualTemperamentNoteFrequency;

document.getElementById('rootNote').value = rootNote;
document.getElementById('notes').value = notesInDiapason;
document.getElementById('diapasons').value = diapasonsInSystem;

// Generate and display system

const musicalSystem = createSystem(diapasonsInSystem, notesInDiapason, rootNote, systemCalculator);

renderSystemTable(musicalSystem);

// Event listener for form submission
document.getElementById('systemConfigForm').addEventListener('submit', function(event) {
  event.preventDefault();

  const diapasonsInSystem = parseInt(document.getElementById('diapasons').value);
  const notesInDiapason = parseInt(document.getElementById('notes').value);
  const rootNote = parseInt(document.getElementById('rootNote').value);
  const selectedCalculator = document.getElementById('calculator').value;

  let systemCalculator;
  if (selectedCalculator === 'equalTemperament') {
    systemCalculator = calculateEqualTemperamentNoteFrequency;
  } else if (selectedCalculator === 'majorScale') {
    systemCalculator = calculateMajorScaleFrequency;
  }
  // Add more conditions for other calculators as needed

  const musicalSystem = createSystem(diapasonsInSystem, notesInDiapason, rootNote, systemCalculator);

  renderSystemTable(musicalSystem);
});
