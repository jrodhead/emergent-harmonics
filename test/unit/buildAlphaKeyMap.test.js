import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildAlphaKeyMap, KEY_ROWS } from '../../js/keys/buildAlphaKeyMap.js';

const ROW_LENGTH = KEY_ROWS[0].length;

/** A system of diapasons whose frequencies make the octave obvious. */
const systemOf = (notesPerDiapason, diapasonCount) => Array.from(
  { length: diapasonCount },
  (unusedDiapason, diapasonIndex) => ({
    octaveShift: diapasonIndex,
    notes: Array.from({ length: notesPerDiapason }, (unusedNote, noteIndex) => ({
      noteName: noteIndex,
      frequency: (noteIndex + 1) * Math.pow(2, diapasonIndex),
      relationshipToRoot: { degree: `${noteIndex}`, ratioToRoot: noteIndex + 1 },
    })),
  }),
);

describe('buildAlphaKeyMap', () => {
  it('climbs one diapason per keyboard row', () => {
    const keyMap = buildAlphaKeyMap(systemOf(ROW_LENGTH, 5), 0);

    assert.equal(keyMap.length, ROW_LENGTH * KEY_ROWS.length);
    assert.equal(keyMap.find((entry) => entry.key === 'q').octaveShift, 0);
    assert.equal(keyMap.find((entry) => entry.key === 'a').octaveShift, 1);
    assert.equal(keyMap.find((entry) => entry.key === 'z').octaveShift, 2);
  });

  it('starts on the diapason it is given', () => {
    const keyMap = buildAlphaKeyMap(systemOf(ROW_LENGTH, 5), 2);

    assert.equal(keyMap.find((entry) => entry.key === 'q').octaveShift, 2);
    assert.equal(keyMap.find((entry) => entry.key === 'a').octaveShift, 3);
  });

  it('assigns the keys of a row in order', () => {
    const keyMap = buildAlphaKeyMap(systemOf(ROW_LENGTH, 3), 0);

    assert.deepEqual(keyMap.slice(0, ROW_LENGTH).map((entry) => entry.key), [...KEY_ROWS[0]]);
  });

  it('fills a row that outruns its diapason from the next one up', () => {
    const keyMap = buildAlphaKeyMap(systemOf(7, 4), 0);
    const firstRow = keyMap.slice(0, ROW_LENGTH);

    assert.equal(firstRow.length, ROW_LENGTH);
    // Seven notes of the starting diapason, then the first three of the next.
    assert.deepEqual(firstRow.map((entry) => entry.octaveShift), [0, 0, 0, 0, 0, 0, 0, 1, 1, 1]);
    assert.deepEqual(firstRow.slice(7).map((entry) => entry.frequency), [2, 4, 6]);
  });

  it('carries the note details onto each key', () => {
    const system = systemOf(3, 3);
    const [firstKey] = buildAlphaKeyMap(system, 0);

    assert.equal(firstKey.key, 'q');
    assert.equal(firstKey.frequency, system[0].notes[0].frequency);
    assert.equal(firstKey.relationshipToRoot, system[0].notes[0].relationshipToRoot);
  });

  it('stops at the top of the system instead of wrapping back to the bottom', () => {
    const keyMap = buildAlphaKeyMap(systemOf(ROW_LENGTH, 2), 0);

    // Two diapasons fill two rows; the third row has nothing above it to show.
    assert.equal(keyMap.length, ROW_LENGTH * 2);
    assert.ok(keyMap.every((entry) => entry.octaveShift <= 1));
  });

  it('lays out a single-note diapason without inventing keys', () => {
    const keyMap = buildAlphaKeyMap(systemOf(1, 4), 0);

    // One note per row, plus one borrowed from the next diapason.
    assert.deepEqual(keyMap.map((entry) => entry.key), ['q', 'w', 'a', 's', 'z', 'x']);
  });

  it('returns nothing for a system that cannot be played', () => {
    assert.deepEqual(buildAlphaKeyMap([], 0), []);
    assert.deepEqual(buildAlphaKeyMap(undefined, 0), []);
  });

  it('returns nothing when the starting diapason is out of range', () => {
    assert.deepEqual(buildAlphaKeyMap(systemOf(3, 2), 9), []);
  });

  it('stops at a diapason whose notes are missing', () => {
    const system = [...systemOf(ROW_LENGTH, 1), { octaveShift: 1, notes: null }];

    assert.equal(buildAlphaKeyMap(system, 0).length, ROW_LENGTH);
  });
});
