/**
 * Generates a musical system based on provided parameters and a specified calculator function.
 * @param {number} diapasonsInSystem - The number of diapasons in the system.
 * @param {number} notesInDiapason - The number of notes in each diapason.
 * @param {number} rootNote - The root note for frequency calculation.
 * @returns {Array} - A two-dimensional array representing the generated musical system.
 */
export function generateRootNotes(primaryRootFrequency, ratios, calculatorType) {
  let rootNotes = [];

  if (calculatorType === 'majorScale' || calculatorType === 'minorScale') {
    for (let ratio of ratios) {
      rootNotes.push(primaryRootFrequency * ratio);
    }
  } else if (calculatorType === 'equalTemperament' || calculatorType === 'HD110067') {
    rootNotes.push(primaryRootFrequency);
  } else {
    console.log("Please select a System Calculator.");
  }

  console.log('rootNotes: ', rootNotes);
  return rootNotes;
}

export function systemCalculators(rootNotes, ratios, numberOfDiapasons, calculatorType) {
  let musicalSystem = [];

  for (let rootNote of rootNotes) {
    let diapasons = [];
    for (let diapason = 0; diapason < numberOfDiapasons; diapason++) {
      let notes = [];

      if (calculatorType === 'majorScale' || calculatorType === 'minorScale') {
        for (let noteName = 0; noteName < ratios.length; noteName++) {
          let frequency = rootNote * ratios[noteName] * Math.pow(2, diapason);
          notes.push({ noteName, frequency });
        }
      } else if (calculatorType === 'equalTemperament') {
        const notePower = Math.pow(2, 1 / ratios.length);
        for (let noteName = 0; noteName < ratios.length; noteName++) {
          let frequency = rootNote * Math.pow(notePower, noteName) * Math.pow(2, diapason);
          notes.push({ noteName, frequency });
        }
      } else if (calculatorType === 'HD110067') {
        let frequency = rootNote;
        for (let noteName = 0; noteName < ratios.length; noteName++) {
          frequency *= ratios[noteName % ratios.length] * Math.pow(2, diapason);
          notes.push({ noteName, frequency });
        }
      } else {
        console.log("Please select a System Calculator.");
      }
      diapasons.push({ notes });
    }
    musicalSystem.push({ rootNote, diapasons });
  }

  console.log('musicalSystem: ', musicalSystem);
  return musicalSystem;
}
