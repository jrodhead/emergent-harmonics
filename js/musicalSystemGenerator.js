export function createSystem(diapasonsInSystem, notesInDiapason, rootNote, systemCalculator) {
  let system = [];

  for (let diapason = 0; diapason < diapasonsInSystem; diapason++) {
    system[diapason] = [];
    for (let note = 0; note < notesInDiapason; note++) {
      const frequency = systemCalculator(note, diapason, notesInDiapason, rootNote);
      system[diapason][note] = {
        noteName: note,
        frequency: frequency,
      };
    }
  }

  console.log('createSystem result: ', system);
  return system;
}
