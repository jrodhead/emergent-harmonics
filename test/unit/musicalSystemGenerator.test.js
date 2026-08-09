import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  generateRootNotes,
  generateScaleNotes,
  homeDiapasonIndex,
  MAX_ROOT_NOTES,
  MIN_AUDIBLE_FREQUENCY,
  MAX_AUDIBLE_FREQUENCY,
} from '../../js/scaleCalculators/musicalSystemGenerator.js';
import { getNotesForSystem } from '../../js/scaleCalculators/noteGenerators.js';

const majorScale = getNotesForSystem('majorScaleNotes');
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
      assert.equal(note.noteName, index);
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

    assert.deepEqual(rootNotes.map((note) => note.frequency), [400, 600]);
  });

  it('caps at the ten numeric keys that can address a root', () => {
    const twelveNotes = getNotesForSystem('equalTemperamentNoteGenerator', 12);

    assert.equal(twelveNotes.length, 12);
    assert.equal(generateRootNotes(100, twelveNotes).length, MAX_ROOT_NOTES);
  });

  it('carries the source note through as relationshipToRoot', () => {
    const [rootNote] = generateRootNotes(400, majorScale);

    assert.equal(rootNote.relationshipToRoot, majorScale[0]);
  });
});
