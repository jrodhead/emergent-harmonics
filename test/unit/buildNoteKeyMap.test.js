import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildNoteKeyMap, KEY_ROWS } from '../../js/keys/buildNoteKeyMap.js';

const ROW_LENGTH = KEY_ROWS[0].length;

/** A system of diapasons whose frequencies make the octave obvious. */
const systemOf = (notesPerDiapason, diapasonCount) => Array.from(
  { length: diapasonCount },
  (unusedDiapason, diapasonIndex) => ({
    octaveShift: diapasonIndex,
    notes: Array.from({ length: notesPerDiapason }, (unusedNote, noteIndex) => ({
      noteIndex,
      frequency: (noteIndex + 1) * Math.pow(2, diapasonIndex),
      relationshipToRoot: { degree: `${noteIndex}`, ratioToRoot: noteIndex + 1 },
    })),
  }),
);

describe('buildNoteKeyMap', () => {
  it('climbs one diapason per keyboard row', () => {
    const keyMap = buildNoteKeyMap(systemOf(ROW_LENGTH, 5), 0);

    assert.equal(keyMap.length, ROW_LENGTH * KEY_ROWS.length);
    assert.equal(keyMap.find((entry) => entry.key === 'q').octaveShift, 0);
    assert.equal(keyMap.find((entry) => entry.key === 'a').octaveShift, 1);
    assert.equal(keyMap.find((entry) => entry.key === 'z').octaveShift, 2);
  });

  it('starts on the diapason it is given', () => {
    const keyMap = buildNoteKeyMap(systemOf(ROW_LENGTH, 5), 2);

    assert.equal(keyMap.find((entry) => entry.key === 'q').octaveShift, 2);
    assert.equal(keyMap.find((entry) => entry.key === 'a').octaveShift, 3);
  });

  it('assigns the keys of a row in order', () => {
    const keyMap = buildNoteKeyMap(systemOf(ROW_LENGTH, 3), 0);

    assert.deepEqual(keyMap.slice(0, ROW_LENGTH).map((entry) => entry.key), [...KEY_ROWS[0]]);
  });

  it('fills a row that outruns its diapason from the next one up', () => {
    const keyMap = buildNoteKeyMap(systemOf(7, 4), 0);
    const firstRow = keyMap.slice(0, ROW_LENGTH);

    assert.equal(firstRow.length, ROW_LENGTH);
    // Seven notes of the starting diapason, then the first three of the next.
    assert.deepEqual(firstRow.map((entry) => entry.octaveShift), [0, 0, 0, 0, 0, 0, 0, 1, 1, 1]);
    assert.deepEqual(firstRow.slice(7).map((entry) => entry.frequency), [2, 4, 6]);
  });

  it('carries the note details onto each key', () => {
    const system = systemOf(3, 3);
    const [firstKey] = buildNoteKeyMap(system, 0);

    assert.equal(firstKey.key, 'q');
    assert.equal(firstKey.frequency, system[0].notes[0].frequency);
    assert.equal(firstKey.relationshipToRoot, system[0].notes[0].relationshipToRoot);
  });

  it('stops at the top of the system instead of wrapping back to the bottom', () => {
    const keyMap = buildNoteKeyMap(systemOf(ROW_LENGTH, 2), 0);

    // Two diapasons fill two rows; the third row has nothing above it to show.
    assert.equal(keyMap.length, ROW_LENGTH * 2);
    assert.ok(keyMap.every((entry) => entry.octaveShift <= 1));
  });

  it('keeps climbing diapasons until the row is full', () => {
    const firstRow = buildNoteKeyMap(systemOf(3, 6), 0).slice(0, ROW_LENGTH);

    // Three notes each from three diapasons, then the first of a fourth.
    assert.equal(firstRow.length, ROW_LENGTH);
    assert.deepEqual(firstRow.map((entry) => entry.octaveShift), [0, 0, 0, 1, 1, 1, 2, 2, 2, 3]);
  });

  it('lays out a single-note diapason without inventing keys', () => {
    const keyMap = buildNoteKeyMap(systemOf(1, 4), 0);

    // Each row climbs as far as the system reaches, and no further.
    assert.deepEqual(keyMap.map((entry) => entry.key), ['q', 'w', 'e', 'r', 'a', 's', 'd', 'z', 'x']);
  });

  it('spills a diapason too long for one row onto the next row', () => {
    const keyMap = buildNoteKeyMap(systemOf(14, 4), 0);
    const firstRow = keyMap.slice(0, ROW_LENGTH);
    const secondRow = keyMap.slice(ROW_LENGTH, ROW_LENGTH * 2);

    assert.deepEqual(firstRow.map((entry) => entry.relationshipToRoot.degree),
      ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
    // The four notes left over, then the opening of the diapason above.
    assert.deepEqual(secondRow.map((entry) => entry.relationshipToRoot.degree),
      ['10', '11', '12', '13', '0', '1', '2', '3', '4', '5']);
    assert.deepEqual(secondRow.map((entry) => entry.octaveShift), [0, 0, 0, 0, 1, 1, 1, 1, 1, 1]);
  });

  it('resumes the climb from the diapason above the one the row started on', () => {
    const thirdRow = buildNoteKeyMap(systemOf(14, 4), 0).slice(ROW_LENGTH * 2);

    // The second row finished the first diapason and borrowed from the second,
    // so the third row starts that second diapason over from its first note.
    assert.deepEqual(thirdRow.map((entry) => entry.relationshipToRoot.degree),
      ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.ok(thirdRow.every((entry) => entry.octaveShift === 1));
  });

  it('spills a diapason across every row it needs', () => {
    const keyMap = buildNoteKeyMap(systemOf(25, 3), 0);
    const degrees = keyMap.map((entry) => entry.relationshipToRoot.degree);

    // All 25 notes are reachable before the diapason above gets a key.
    assert.deepEqual(degrees.slice(0, 25), Array.from({ length: 25 }, (unused, index) => `${index}`));
    assert.deepEqual(degrees.slice(25), ['0', '1', '2', '3', '4']);
    assert.ok(keyMap.slice(25).every((entry) => entry.octaveShift === 1));
  });

  it('returns nothing for a system that cannot be played', () => {
    assert.deepEqual(buildNoteKeyMap([], 0), []);
    assert.deepEqual(buildNoteKeyMap(undefined, 0), []);
  });

  it('returns nothing when the starting diapason is out of range', () => {
    assert.deepEqual(buildNoteKeyMap(systemOf(3, 2), 9), []);
  });

  it('stops at a diapason whose notes are missing', () => {
    const system = [...systemOf(ROW_LENGTH, 1), { octaveShift: 1, notes: null }];

    assert.equal(buildNoteKeyMap(system, 0).length, ROW_LENGTH);
  });
});
