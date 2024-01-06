import { createSystem } from "./systemCalculators/musicalSystemGenerator.js";
import { createKeyMap, renderAlphaKeyMapTable } from "./keys/keyMap.js";
import { calculateMajorScaleFrequency } from "./systemCalculators/majorScale.js";
import { calculateEqualTemperamentNoteFrequency } from "./systemCalculators/equalTemperament.js";

let musicalSystemGlobal = [];
let keyMapGlobal = [];

const updateKeyMapGlobal = (newKeyMap) => {
  keyMapGlobal = newKeyMap;
};

export {
  musicalSystemGlobal,
  keyMapGlobal,
  updateKeyMapGlobal
};

// Event listener for systemConfigForm submit
document.getElementById('systemConfigForm').addEventListener('submit', function(event) {
  event.preventDefault();

  // Extracting values from the form
  const diapasonsInSystem = parseInt(document.getElementById('diapasons').value);
  const notesInDiapason = parseInt(document.getElementById('notes').value);
  const rootNote = parseInt(document.getElementById('rootNote').value);
  const selectedCalculator = document.getElementById('calculator').value;

  // Input validation
  if (isNaN(diapasonsInSystem) || isNaN(notesInDiapason) || isNaN(rootNote)) {
    alert("Please enter valid numbers for diapasons, notes, and root note.");
    return;
  } else {
    let systemCalculator;
    if (selectedCalculator === 'equalTemperament') {
      systemCalculator = calculateEqualTemperamentNoteFrequency;
    } else if (selectedCalculator === 'majorScale') {
      systemCalculator = calculateMajorScaleFrequency;
    } else {
      alert("Please select a System Calculator.");
      return;
    }

    // Generate the musical system and key map
    const musicalSystem = createSystem(diapasonsInSystem, notesInDiapason, rootNote, systemCalculator);
    musicalSystemGlobal = musicalSystem; //update global variable
    const keyMap = createKeyMap(musicalSystemGlobal);

    // Render the key map table
    keyMapGlobal = keyMap;
    renderAlphaKeyMapTable(keyMapGlobal);
  }
});
