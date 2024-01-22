/**
 * Generates the Notes for a major scale.
 * @type {number[]}
 */
const majorScaleNotes = [
  {
    "degree": "I",
    "ratioToRoot": 1/1,
    "relationshipToRootName": "root",
    "triadType": "major",
  },
  {
    "degree": "II",
    "ratioToRoot": 9/8,
    "relationshipToRootName": "majorSecond",
    "triadType": "minor",
  },
  {
    "degree": "III",
    "ratioToRoot": 5/4,
    "relationshipToRootName": "majorThird",
    "triadtype": "minor",
  },
  {
    "degree": "IV",
    "ratioToRoot": 4/3,
    "relationshipToRootName": "perfectFourth",
    "triadType": "major",
  },
  {
    "degree": "V",
    "ratioToRoot": 3/2,
    "relationshipToRootName": "perfectFifth",
    "triadType": "major",
  },
  {
    "degree": "VI",
    "ratioToRoot": 5/3,
    "relationshipToRootName": "majorSixth",
    "triadType": "minor",
  },
  {
    "degree": "VII",
    "ratioToRoot": 15/8,
    "relationshipToRootName": "majorSeventh",
    "triadType": "diminished",
  }
];

/**
 * Generates the Notes for a minor scale.
 * @type {number[]}
 */
const minorScaleNotes = [
   1,      // root
  16 / 15, // minorSecond
   6 / 5,  // minorThird
   4 / 3,  // perfectFourth
  45 / 32, // diminishedFifth
   8 / 5,  // minorSixth
   9 / 5   // minorSeventh
];


const pentatonicScaleNotes = [
  1,
  9 / 8,
  5 / 4,
  3 / 2,
  5 / 3
];

const bluesScaleNotes = [
  1,
  6/5,
  4/3,
  7/5,
  3/2,
  7/4
];

/**
 * Generates the Notes for the HD110067 system.
 * @type {number[]}
 */
const hd110067Notes = [
  1,
  3 / 2,
  3 / 2,
  3 / 2,
  4 / 3,
  4 / 3,
  4 / 3
];

/**
 * Generates the Notes for the HD110067 system in one diapason.
 * @type {number[]}
 */
const hd110067NotesInOneDiapason = [
  1,
  1.5,
  1.125,
  1.6875,
  1.125 * 2,
  1.5 * 2,
  1 * 2,
];

/**
 * Generates the Notes for an equal temperament system with the specified number of notes in a diapason.
 * @param {number} notesInDiapason - The number of notes in a diapason.
 * @returns {number[]} The generated Notes.
 */
function equalTemperamentNoteGenerator(notesInDiapason) {
  const notePower = Math.pow(2, 1 / notesInDiapason);
  let Notes = [];
  for (let note = 0; note < notesInDiapason; note++) {
    Notes.push(Math.pow(notePower, note));
  }
  return Notes;
}

export function getNotesForSystem(system) {
  if (system === 'majorScaleNotes') {
    return majorScaleNotes;
  } else if (system === 'minorScaleNotes') {
    return minorScaleNotes;
  } else if (system === 'pentatonicScaleNotes') {
    return pentatonicScaleNotes;
  } else if (system === 'bluesScaleNotes') {
    return bluesScaleNotes;
  } else if (system === 'equalTemperamentNotes') {
    return equalTemperamentNoteGenerator(notesInDiapason);
  } else if (system === 'HD110067Notes') {
    return hd110067NotesInOneDiapason;
  } else {
    throw new Error('Invalid System Calculator');
  }
};

export const noteGenerators = {
  majorScaleNotes,
  minorScaleNotes,
  pentatonicScaleNotes,
  bluesScaleNotes,
  hd110067Notes,
  // hd110067NotesInOneDiapason,
  equalTemperamentNoteGenerator
};
