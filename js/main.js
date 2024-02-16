import { generateRootNotes, systemCalculators } from "./systemCalculators/musicalSystemGenerator.js";
import * as noteGenerators from "./systemCalculators/noteGenerators.js";
import { createDiapasonRowKeyMap } from './keys/createDiapasonRowKeyMap.js';
import { createNumericKeyMap } from "./keys/numericKeyMap.js";

let musicalSystemGlobal = [];
let alphaKeyMapGlobal = [];

const updateAlphaKeyMapGlobal = (newAlphaKeyMap) => {
  alphaKeyMapGlobal = newAlphaKeyMap;
};

export {
  musicalSystemGlobal,
  alphaKeyMapGlobal,
  updateAlphaKeyMapGlobal
};

const calculatorSelector = document.getElementById('calculator');

// Iterate over the noteGenerators object
for (const system in noteGenerators.noteGenerators) {
  // Create an option element
  const option = document.createElement('option');
  // Set the value of the option to the system name
  option.value = system;
  // Set the text content of the option to the system name
  option.textContent = system;
  // Append the option to the select element
  calculatorSelector.appendChild(option);
}

// Event listener for system-config submit
document.getElementById('system-config').addEventListener('submit', function(event) {
  event.preventDefault();

  // Extracting values from the form
  let primaryRootFrequency = parseInt(document.getElementById('primaryRootFrequency').value);
  let calculatorType = document.getElementById('calculator').value;

  // Input validation
  if (isNaN(primaryRootFrequency)) {
    alert("Please enter a valid number for Root Note Frequency");
    return;
  } else {
    let notesToGenerate = noteGenerators.getNotesForSystem(calculatorType);

    let rootNotes = generateRootNotes(primaryRootFrequency, notesToGenerate);

    let musicalSystem = systemCalculators(rootNotes, notesToGenerate);
    musicalSystemGlobal = musicalSystem;

    createDiapasonRowKeyMap(musicalSystemGlobal);
    createNumericKeyMap(musicalSystemGlobal);
  }
});
