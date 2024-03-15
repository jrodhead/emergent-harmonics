export const hd110067Notes = [
  { ratioToRoot: 1/1, triadType: "hd11067Notes" },
  { ratioToRoot: 3/2, triadType: "hd11067Notes" },
  { ratioToRoot: 3/2, triadType: "hd11067Notes" },
  { ratioToRoot: 3/2, triadType: "hd11067Notes" },
  { ratioToRoot: 4/3, triadType: "hd11067Notes" },
  { ratioToRoot: 4/3, triadType: "hd11067Notes" },
  { ratioToRoot: 4/3, triadType: "hd11067Notes" }
];

export const hd110067NotesInOneDiapason = [
  { ratioToRoot: 1, triadType: "hd110067NotesInOneDiapason" },
  { ratioToRoot: 1.5, triadType: "hd110067NotesInOneDiapason" },
  { ratioToRoot: 1.125, triadType: "hd110067NotesInOneDiapason" },
  { ratioToRoot: 1.6875, triadType: "hd110067NotesInOneDiapason" },
  { ratioToRoot: 1.125 * 2, triadType: "hd110067NotesInOneDiapason" },
  { ratioToRoot: 1.5 * 2, triadType: "hd110067NotesInOneDiapason" },
  { ratioToRoot: 1 * 2, triadType: "hd110067NotesInOneDiapason" }
];

export function generateFrequenciesRelativeToPreviousNote() {
  let frequency = rootNote.frequency;
  for (let noteName = 0; noteName < notes.length; noteName++) {
    frequency *= notes[noteName % notes.length] * Math.pow(2, diapason);
    notes.push({ noteName, frequency, relationshipToRoot: notesToGenerate[noteName] });
  }
}