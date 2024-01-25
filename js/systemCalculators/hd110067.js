export const hd110067Notes = [
  {
    "degree": "I",
    "ratioToRoot": 1/1,
    "relationshipToRootName": "Root",
    "triadType": "major"
  },
  {
    "degree": "II",
    "ratioToRoot": 3/2,
    "relationshipToRootName": "Perfect 5th",
    "triadType": "major"
  },
  {
    "degree": "III",
    "ratioToRoot": 3/2,
    "relationshipToRootName": "Perfect 5th",
    "triadType": "major"
  },
  {
    "degree": "IV",
    "ratioToRoot": 3/2,
    "relationshipToRootName": "Perfect 5th",
    "triadType": "major"
  },
  {
    "degree": "V",
    "ratioToRoot": 4/3,
    "relationshipToRootName": "Perfect 4th",
    "triadType": "major"
  },
  {
    "degree": "VI",
    "ratioToRoot": 4/3,
    "relationshipToRootName": "Perfect 4th",
    "triadType": "major"
  },
  {
    "degree": "VII",
    "ratioToRoot": 4/3,
    "relationshipToRootName": "Perfect 4th",
    "triadType": "major"
  }
];

export const hd110067NotesInOneDiapason = [
  {
    "degree": "I",
    "ratioToRoot": 1/1,
    "relationshipToRootName": "Root",
    "triadType": "major"
  },
  {
    "degree": "II",
    "ratioToRoot": 1.5,
    "relationshipToRootName": "Perfect 5th",
    "triadType": "major"
  },
  {
    "degree": "III",
    "ratioToRoot": 1.125,
    "relationshipToRootName": "Perfect 5th",
    "triadType": "major"
  },
  {
    "degree": "IV",
    "ratioToRoot": 1.6875,
    "relationshipToRootName": "Perfect 5th",
    "triadType": "major"
  },
  {
    "degree": "V",
    "ratioToRoot": 1.125 * 2,
    "relationshipToRootName": "Perfect 4th",
    "triadType": "major"
  },
  {
    "degree": "VI",
    "ratioToRoot": 1.5 * 2,
    "relationshipToRootName": "Perfect 4th",
    "triadType": "major"
  },
  {
    "degree": "VII",
    "ratioToRoot": 1 * 2,
    "relationshipToRootName": "Perfect 4th",
    "triadType": "major"
  }
];

export function generateFrequenciesRelativeToPreviousNote() {
  let frequency = rootNote.frequency;
  for (let noteName = 0; noteName < notes.length; noteName++) {
    frequency *= notes[noteName % notes.length] * Math.pow(2, diapason);
    notes.push({ noteName, frequency, relationshipToRoot: notesToGenerate[noteName] });
  }
}