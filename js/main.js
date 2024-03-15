import { generateRootNotes } from "./scaleCalculators/musicalSystemGenerator.js";
import { getNotesForSystem, noteGenerators } from "./scaleCalculators/noteGenerators.js";
import { renderNumericKeyTable } from "./keys/renderNumericKeyTable.js";
import { createDiapasonRowKeyMap } from "./keys/createDiapasonRowKeyMap.js";
import { currentDiapasonIndex, updateCurrentDiapasonIndex } from "./keys/arrowKeyHandler.js";
import { activeScaleNotesGlobal, updateActiveScaleNotesGlobal, displayActiveRootNote, currentRootIndex, updateCurrentRootIndex } from "./keys/numericKeyHandler.js";

const calculatorSelector = document.getElementById('calculator');

// Iterate over the noteGenerators object
for (const system in noteGenerators) {
  // Create an option element
  const option = document.createElement('option');
  // Set the value of the option to the system name
  option.value = system;
  // Set the text content of the option to the system name
  option.textContent = system;
  // Append the option to the select element
  calculatorSelector.appendChild(option);
}

export let rootNotesGlobal = [];

// Event listener for system-config submit
document.getElementById('system-config').addEventListener('submit', function(event) {
  event.preventDefault();

  // Extracting values from the form
  let primaryRootFrequency = parseInt(document.getElementById('primaryRootFrequency').value);
  let primaryCalculatorType = document.getElementById('calculator').value;

  // Input validation
  if (isNaN(primaryRootFrequency)) {
    alert("Please enter a valid number for Root Note Frequency");
    return;
  } else {
    let rootNotesToGenerate = getNotesForSystem(primaryCalculatorType);
    rootNotesGlobal = generateRootNotes(primaryRootFrequency, rootNotesToGenerate);
    renderNumericKeyTable(rootNotesGlobal);
    updateCurrentRootIndex(0);
    updateCurrentDiapasonIndex('reset');
    updateActiveScaleNotesGlobal(rootNotesGlobal[currentRootIndex].frequency, getNotesForSystem(primaryCalculatorType));
    displayActiveRootNote(currentRootIndex);
    createDiapasonRowKeyMap(activeScaleNotesGlobal);
  }
});
