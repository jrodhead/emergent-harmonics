import { generateRootNotes, systemCalculators } from "./systemCalculators/musicalSystemGenerator.js";
import * as ratioGenerators from "./systemCalculators/ratioGenerators.js";
import * as keyMapper from "./keys/keyMap.js";

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
  let primaryRootFrequency = parseInt(document.getElementById('primaryRootFrequency').value);
  let notesInDiapason = parseInt(document.getElementById('notes').value);
  let numberOfDiapasons = parseInt(document.getElementById('diapasons').value);
  let calculatorType = document.getElementById('calculator').value;

  // Input validation
  if (isNaN(numberOfDiapasons) || isNaN(notesInDiapason) || isNaN(primaryRootFrequency)) {
    alert("Please enter valid numbers for diapasons, notes, and root note.");
    return;
  } else {
    let ratios = [];
    if (calculatorType === 'majorScale') {
      ratios = ratioGenerators.majorScaleRatios;
    } else if (calculatorType === 'minorScale') {
      ratios = ratioGenerators.minorScaleRatios;
    } else if (calculatorType === 'equalTemperament') {
      ratios = ratioGenerators.equalTemperamentRatioGenerator(notesInDiapason);
    } else if (calculatorType === 'HD110067') {
      ratios = ratioGenerators.hd110067Ratios;
    } else {
      alert("Please select a System Calculator.");
      return;
    }

    let rootNotes = generateRootNotes(primaryRootFrequency, ratios, calculatorType);

    let musicalSystem = systemCalculators(rootNotes, ratios, numberOfDiapasons, calculatorType);
    musicalSystemGlobal = musicalSystem;
    const keyMap = keyMapper.createKeyMap(musicalSystemGlobal);

    // Render the key map table
    keyMapGlobal = keyMap;
    keyMapper.renderAlphaKeyMapTable(keyMapGlobal);
  }
});
