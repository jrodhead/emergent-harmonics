export function generateRootNotes(primaryRootFrequency, notesToGenerate) {
  let rootNotes = [];

  for (let noteName of notesToGenerate) {
    let frequency = primaryRootFrequency * noteName.ratioToRoot;

    rootNotes.push({frequency, relationshipToRoot: noteName});
  }

  return rootNotes;
}

export function generateScaleNotes(rootNoteFrequency, notesToGenerate) {
  let scaleNotesPerDiapason = [];
  for (let diapason = 0; diapason < 10; diapason++) {
    let notes = [];

    for (let noteName = 0; noteName < notesToGenerate.length; noteName++) {
      let frequency = rootNoteFrequency * notesToGenerate[noteName].ratioToRoot * Math.pow(2, diapason);
      notes.push({ noteName, frequency, relationshipToRoot: notesToGenerate[noteName] });
    }

    scaleNotesPerDiapason.push({ notes });
  }

  console.log('scaleNotesPerDiapason: ', scaleNotesPerDiapason);
  return scaleNotesPerDiapason;
}
