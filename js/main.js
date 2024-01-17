import { generateRootNotes, systemCalculators } from "./systemCalculators/musicalSystemGenerator.js";
import * as ratioGenerators from "./systemCalculators/ratioGenerators.js";
import * as alphaKeyMapper from "./keys/alphaKeyMap.js";
import { createNumericKeyMap, renderNumericKeyMapTable } from "./keys/numericKeyMap.js";

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
      ratios = ratioGenerators.hd110067RatiosInOneDiapason;
    } else {
      alert("Please select a System Calculator.");
      return;
    }

    let rootNotes = generateRootNotes(primaryRootFrequency, ratios, calculatorType);

    let musicalSystem = systemCalculators(rootNotes, ratios, numberOfDiapasons, calculatorType);
    musicalSystemGlobal = musicalSystem;
    const alphaKeyMap = alphaKeyMapper.createAlphaKeyMap(musicalSystemGlobal);

    // Render the key map tables
    alphaKeyMapGlobal = alphaKeyMap;
    alphaKeyMapper.renderAlphaKeyMapTable(alphaKeyMapGlobal);
    let numericKeyMap = createNumericKeyMap(musicalSystemGlobal);
    renderNumericKeyMapTable(numericKeyMap);

    keysUI.style.display = 'grid';
    systemConfigUI.style.display = 'none';
  }
});
