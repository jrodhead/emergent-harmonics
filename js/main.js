import { createSystem } from "./musicalSystemGenerator.js";
import { createKeyMap, renderKeyMapTable } from "./keys/keyMap.js";
import { calculateMajorScaleFrequency } from "./systemCalculators/majorScale.js";
import { calculateEqualTemperamentNoteFrequency } from "./systemCalculators/equalTemperament.js";

let keyMapGlobal = [];

// Event listener for systemConfigForm submit
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

  const musicalSystem = createSystem(diapasonsInSystem, notesInDiapason, rootNote, systemCalculator);
  const keyMap = createKeyMap(musicalSystem[0]);
  renderKeyMapTable(keyMap);

  keyMapGlobal = keyMap;
});

export { keyMapGlobal };
