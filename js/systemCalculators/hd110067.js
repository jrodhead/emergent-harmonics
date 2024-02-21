export const hd110067Notes = [
  { ratioToRoot: 1/1 },
  { ratioToRoot: 3/2 },
  { ratioToRoot: 3/2 },
  { ratioToRoot: 3/2 },
  { ratioToRoot: 4/3 },
  { ratioToRoot: 4/3 },
  { ratioToRoot: 4/3 }
];

export const hd110067NotesInOneDiapason = [
  { ratioToRoot: 1 },
  { ratioToRoot: 1.5 },
  { ratioToRoot: 1.125 },
  { ratioToRoot: 1.6875 },
  { ratioToRoot: 1.125 * 2 },
  { ratioToRoot: 1.5 * 2 },
  { ratioToRoot: 1 * 2 }
];

export function generateFrequenciesRelativeToPreviousNote() {
  let frequency = rootNote.frequency;
  for (let noteName = 0; noteName < notes.length; noteName++) {
    frequency *= notes[noteName % notes.length] * Math.pow(2, diapason);
    notes.push({ noteName, frequency, relationshipToRoot: notesToGenerate[noteName] });
  }
}