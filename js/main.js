import { generateRootNotes, systemCalculators } from "./systemCalculators/musicalSystemGenerator.js";
import * as noteGenerators from "./systemCalculators/noteGenerators.js";
import { createAlphaKeyMap } from "./keys/alphaKeyMap.js";
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

// document.getElementById('menu-icon').addEventListener('click', function() {
//   var systemConfig = document.getElementById('system-config');
//   if (systemConfig.style.display === 'none') {
//     systemConfig.style.display = 'grid';
//   } else {
//     systemConfig.style.display = 'none';
//   }
// });

var systemConfigUI = document.getElementById('system-config');
var keysUI = document.getElementById('keys');

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


document.getElementById('display-settings').addEventListener('click', function() {
  if (systemConfigUI.style.display === 'none') {
    systemConfigUI.style.display = 'grid';
    keysUI.style.display = 'none';
  } else {
    systemConfigUI.style.display = 'none';
    keysUI.style.display = 'grid';
  }
});

document.getElementById('display-keys').addEventListener('click', function() {
  if (keysUI.style.display === 'none') {
    keysUI.style.display = 'grid';
    systemConfigUI.style.display = 'none';
  } else {
    keysUI.style.display = 'none';
    systemConfigUI.style.display = 'grid';
  }
});

// Event listener for system-config submit
document.getElementById('system-config').addEventListener('submit', function(event) {
  event.preventDefault();

  // Extracting values from the form
  let primaryRootFrequency = parseInt(document.getElementById('primaryRootFrequency').value);
  let notesInDiapason = parseInt(document.getElementById('notes').value);
  let calculatorType = document.getElementById('calculator').value;

  // Input validation
  if (isNaN(notesInDiapason) || isNaN(primaryRootFrequency)) {
    alert("Please enter valid numbers for Root Note Frequency and Number of Notes in Diapason");
    return;
  } else {
    let notesToGenerate = noteGenerators.getNotesForSystem(calculatorType, notesInDiapason);

    let rootNotes = generateRootNotes(primaryRootFrequency, notesToGenerate);

    let musicalSystem = systemCalculators(rootNotes, notesToGenerate);
    musicalSystemGlobal = musicalSystem;

    createAlphaKeyMap(musicalSystemGlobal);
    createNumericKeyMap(musicalSystemGlobal);

    keysUI.style.display = 'grid';
    systemConfigUI.style.display = 'none';
  }
});
