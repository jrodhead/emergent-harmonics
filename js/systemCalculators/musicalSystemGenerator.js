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

  // Loop through each diapason
  for (let diapason = 0; diapason < diapasonsInSystem; diapason++) {
    system[diapason] = [];

    // Loop through each note in the diapason
    for (let note = 0; note < notesInDiapason; note++) {
      // Calculate the frequency using the provided systemCalculator function
      const frequency = systemCalculator(note, diapason, notesInDiapason, rootNote);

      // Check if frequency calculation was successful
      if (frequency !== null) {
        // Store the note's details in the system array
        system[diapason][note] = {
          noteName: note,
          frequency: frequency,
        };
      } else {
        // Log an error if frequency calculation failed
        console.error('Unable to calculate frequency for note:', note);
      }
    }
  }

  console.log('createSystem result:', system);
  return system;
}
