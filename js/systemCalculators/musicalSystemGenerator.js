/**
 * Generates a musical system based on provided parameters and a specified calculator function.
 * @param {number} diapasonsInSystem - The number of diapasons in the system.
 * @param {number} notesInDiapason - The number of notes in each diapason.
 * @param {number} rootNote - The root note for frequency calculation.
 * @returns {Array} - A two-dimensional array representing the generated musical system.
 */
export function generateRootNotes(primaryRootFrequency, notesToGenerate) {
  let rootNotes = [];

  for (let noteName of notesToGenerate) {
    let frequency = primaryRootFrequency * noteName.ratioToRoot;

    rootNotes.push({frequency, relationshipToRoot: noteName});
  }

  console.log('rootNotes: ', rootNotes);
  return rootNotes;
}

export function systemCalculators(rootNotes, notesToGenerate) {
  let musicalSystem = [];

  for (let rootNote of rootNotes) {
    let diapasons = [];
    for (let diapason = 0; diapason < 10; diapason++) {
      let notes = [];

      for (let noteName = 0; noteName < notesToGenerate.length; noteName++) {
        let frequency = rootNote.frequency * notesToGenerate[noteName].ratioToRoot * Math.pow(2, diapason);
        notes.push({ noteName, frequency, relationshipToRoot: notesToGenerate[noteName] });
      }

      diapasons.push({ notes });
    }
    musicalSystem.push({ rootNote, diapasons });
  }

  console.log('musicalSystem: ', musicalSystem);
  return musicalSystem;
}
