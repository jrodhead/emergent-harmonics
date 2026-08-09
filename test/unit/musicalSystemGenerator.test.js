import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  generateRootNotes,
  generateScaleNotes,
  homeDiapasonIndex,
  MAX_ROOT_NOTES,
  MIN_AUDIBLE_FREQUENCY,
  MAX_AUDIBLE_FREQUENCY,
} from '../../js/system/musicalSystemGenerator.js';
import { presetNotes } from '../../js/presets/registry.js';

const majorScale = presetNotes('majorScaleNotes');
const singleNote = [{ ratioToRoot: 1 }];

describe('generateScaleNotes', () => {
  it('fills the audible range in both directions from the root', () => {
    const scale = generateScaleNotes(400, majorScale);
    const shifts = scale.map((diapason) => diapason.octaveShift);

    assert.ok(shifts.includes(0), 'the root diapason is present');
    assert.ok(Math.min(...shifts) < 0, 'diapasons are generated below the root');
    assert.ok(Math.max(...shifts) > 0, 'diapasons are generated above the root');
  });

  it('keeps every note inside the audible range', () => {
    const frequencies = generateScaleNotes(400, majorScale)
      .flatMap((diapason) => diapason.notes.map((note) => note.frequency));

    assert.ok(Math.min(...frequencies) >= MIN_AUDIBLE_FREQUENCY);
    assert.ok(Math.max(...frequencies) <= MAX_AUDIBLE_FREQUENCY);
  });

  it('orders diapasons low to high with no gaps', () => {
    const shifts = generateScaleNotes(400, majorScale).map((diapason) => diapason.octaveShift);

    shifts.forEach((shift, index) => {
      if (index > 0) assert.equal(shift, shifts[index - 1] + 1);
    });
  });

  it('generates octaves of a single-note diapason', () => {
    const frequencies = generateScaleNotes(400, singleNote)
      .map((diapason) => diapason.notes[0].frequency);

    assert.deepEqual(frequencies, [25, 50, 100, 200, 400, 800, 1600, 3200, 6400, 12800]);
  });

  it('does not descend below the root when there is no room', () => {
    const shifts = generateScaleNotes(27, majorScale).map((diapason) => diapason.octaveShift);

    assert.equal(Math.min(...shifts), 0);
  });

  it('drops a diapason whose top note would clear the audible range', () => {
    const scale = generateScaleNotes(15000, [{ ratioToRoot: 1 }, { ratioToRoot: 1.5 }]);

    scale.forEach((diapason) => {
      diapason.notes.forEach((note) => assert.ok(note.frequency <= MAX_AUDIBLE_FREQUENCY));
    });
  });

  it('shifts down to fit when the root diapason overshoots the top', () => {
    // 19999 x 1.9 clears 20000, so the root's own diapason cannot be kept.
    const scale = generateScaleNotes(19999, [{ ratioToRoot: 1 }, { ratioToRoot: 1.9 }]);

    assert.ok(scale.length > 0);
    assert.ok(scale.every((diapason) => diapason.octaveShift < 0));
  });

  it('still returns the root diapason when no shift of it fits', () => {
    // A diapason spanning more than the audible range fits nowhere.
    const scale = generateScaleNotes(400, [{ ratioToRoot: 1 }, { ratioToRoot: 5000 }]);

    assert.equal(scale.length, 1);
    assert.equal(scale[0].octaveShift, 0);
  });

  it('returns nothing for an empty note list rather than throwing', () => {
    assert.deepEqual(generateScaleNotes(400, []), []);
    assert.deepEqual(generateScaleNotes(400, undefined), []);
  });

  it('returns nothing rather than notes that could never sound', () => {
    // The fallback must not hand a NaN frequency to the keyboard.
    assert.deepEqual(generateScaleNotes(400, [{ ratioToRoot: Number.NaN }]), []);
    assert.deepEqual(generateScaleNotes(Number.NaN, [{ ratioToRoot: 1 }]), []);
    assert.deepEqual(generateScaleNotes(400, [{ ratioToRoot: 'nope' }]), []);
  });

  it('tags each note with its index and the note it came from', () => {
    const [firstDiapason] = generateScaleNotes(400, majorScale);

    firstDiapason.notes.forEach((note, index) => {
      assert.equal(note.noteIndex, index);
      assert.equal(note.relationshipToRoot, majorScale[index]);
    });
  });
});

describe('homeDiapasonIndex', () => {
  it('points at the diapason that starts on the root itself', () => {
    const scale = generateScaleNotes(400, majorScale);

    assert.equal(scale[homeDiapasonIndex(scale)].octaveShift, 0);
    assert.equal(scale[homeDiapasonIndex(scale)].notes[0].frequency, 400);
  });

  it('falls back to the lowest diapason when there is no unshifted one', () => {
    assert.equal(homeDiapasonIndex([{ octaveShift: 3, notes: [] }]), 0);
  });
});

describe('generateRootNotes', () => {
  it('multiplies the root frequency by each ratio', () => {
    const rootNotes = generateRootNotes(400, [{ ratioToRoot: 1 }, { ratioToRoot: 1.5 }]);

    assert.deepEqual(rootNotes.slice(0, 2).map((note) => note.frequency), [400, 600]);
    assert.deepEqual(rootNotes.slice(0, 2).map((note) => note.octaveShift), [0, 0]);
  });

  it('repeats a short diapason up the octaves to fill the numeric keys', () => {
    const rootNotes = generateRootNotes(400, [{ ratioToRoot: 1 }, { ratioToRoot: 1.5 }]);

    assert.equal(rootNotes.length, MAX_ROOT_NOTES);
    assert.deepEqual(rootNotes.slice(2, 4).map((note) => note.frequency), [800, 1200]);
    assert.deepEqual(rootNotes.map((note) => note.octaveShift), [0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });

  it('leaves a repeat mid-cycle rather than a key without a root', () => {
    const threeNotes = [{ ratioToRoot: 1 }, { ratioToRoot: 1.25 }, { ratioToRoot: 1.5 }];
    const rootNotes = generateRootNotes(100, threeNotes);

    assert.equal(rootNotes.length, MAX_ROOT_NOTES);
    // The tenth key is the root again, three octaves up, with its cycle cut short.
    assert.deepEqual(rootNotes[9], { frequency: 800, octaveShift: 3, relationshipToRoot: threeNotes[0] });
  });

  it('stops repeating once the roots climb out of the audible range', () => {
    const rootNotes = generateRootNotes(4000, [{ ratioToRoot: 1 }, { ratioToRoot: 1.5 }]);

    // 4000, 6000, 8000, 12000, 16000, then 24000 is past hearing.
    assert.deepEqual(rootNotes.map((note) => note.frequency), [4000, 6000, 8000, 12000, 16000]);
  });

  it('has no roots to put on the keys without notes to build from', () => {
    assert.deepEqual(generateRootNotes(400, []), []);
    assert.deepEqual(generateRootNotes(400, undefined), []);
  });

  it('caps at the ten numeric keys that can address a root', () => {
    const twelveNotes = presetNotes('equalTemperamentNoteGenerator', 12);

    assert.equal(twelveNotes.length, 12);
    assert.equal(generateRootNotes(100, twelveNotes).length, MAX_ROOT_NOTES);
  });

  it('carries the source note through as relationshipToRoot', () => {
    const [rootNote] = generateRootNotes(400, majorScale);

    assert.equal(rootNote.relationshipToRoot, majorScale[0]);
  });
});
