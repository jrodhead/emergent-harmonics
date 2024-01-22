/**
 * Generates a musical system based on provided parameters and a specified calculator function.
 * @param {number} diapasonsInSystem - The number of diapasons in the system.
 * @param {number} notesInDiapason - The number of notes in each diapason.
 * @param {number} rootNote - The root note for frequency calculation.
 * @returns {Array} - A two-dimensional array representing the generated musical system.
 */
export function generateRootNotes(primaryRootFrequency, generatedNotes, calculatorType) {
  let rootNotes = [];

  if (calculatorType === null) {
    console.log("Please select a System Calculator.");
  } else {
    for (let note of generatedNotes) {
      rootNotes.push(primaryRootFrequency * note.ratioToRoot);
    }
  }

  console.log('rootNotes: ', rootNotes);
  return rootNotes;
}

export function systemCalculators(rootNotes, generatedNotes, calculatorType) {
  let musicalSystem = [];

  for (let rootNote of rootNotes) {
    let diapasons = [];
    for (let diapason = 0; diapason < 10; diapason++) {
      let notes = [];

      if (calculatorType === 'equalTemperamentNotes') {
        const notePower = Math.pow(2, 1 / notes.length);
        for (let noteName = 0; noteName < notes.length; noteName++) {
          let frequency = rootNote * Math.pow(notePower, noteName) * Math.pow(2, diapason);
          notesInSystem.push({ noteName, frequency });
        }
      } else if (calculatorType === 'HD110067') {
        let frequency = rootNote;
        for (let noteName = 0; noteName < notes.length; noteName++) {
          frequency *= notes[noteName % notes.length] * Math.pow(2, diapason);
          notes.push({ noteName, frequency });
        }
      } else {
        for (let noteName = 0; noteName < generatedNotes.length; noteName++) {
          let frequency = rootNote * generatedNotes[noteName].ratioToRoot * Math.pow(2, diapason);
          notes.push({ noteName, frequency, relationshipToRoot: generatedNotes[noteName] });
        }
      }

      diapasons.push({ notes });
    }
    musicalSystem.push({ rootNote, diapasons });
  }

  console.log('musicalSystem: ', musicalSystem);
  return musicalSystem;
}
