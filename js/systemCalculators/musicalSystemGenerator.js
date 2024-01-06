/**
 * Generates a musical system based on provided parameters and a specified calculator function.
 * @param {number} diapasonsInSystem - The number of diapasons in the system.
 * @param {number} notesInDiapason - The number of notes in each diapason.
 * @param {number} rootNote - The root note for frequency calculation.
 * @param {function} systemCalculator - The calculator function used for frequency calculation.
 * @returns {Array} - A two-dimensional array representing the generated musical system.
 */

export function createSystem(diapasonsInSystem, notesInDiapason, rootNote, systemCalculator) {
  let system = [];

  // Primary root - create diapasons and notes based on the primary root note
  let primaryRoot = generateRoot(rootNote, notesInDiapason, diapasonsInSystem, systemCalculator);
  system.push(primaryRoot);

  // Generate new roots from notes in the first diapason of the primary root
  const firstDiapasonNotes = primaryRoot.diapasons[0].notes;
  for (let i = 1; i < firstDiapasonNotes.length; i++) {
    let newRootNote = firstDiapasonNotes[i].frequency;
    let newRoot = generateRoot(newRootNote, notesInDiapason, diapasonsInSystem, systemCalculator);
    system.push(newRoot);
  }

  console.log('createSystem result: ', system);
  return system;
}

export function generateRoot(rootNote, notesInDiapason, diapasonsInSystem, systemCalculator) {
  let root = {
    rootNote: rootNote,
    diapasons: [],
  };

  for (let diapason = 0; diapason < diapasonsInSystem; diapason++) {
    let diapasonNotes = [];
    for (let note = 0; note < notesInDiapason; note++) {
      const frequency = systemCalculator(note, diapason, notesInDiapason, rootNote);
      if (frequency !== null) {
        diapasonNotes.push({
          noteName: note,
          frequency: frequency,
        });
      } else {
        console.error('Unable to calculate frequency');
      }
    }
    root.diapasons.push({ notes: diapasonNotes });
  }

  return root;
}
