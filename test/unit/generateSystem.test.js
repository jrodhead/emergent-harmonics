import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  generateRootNotes,
  buildRegisters,
  homeRegisterIndex,
  MAX_ROOT_NOTES,
  MIN_AUDIBLE_FREQUENCY,
  MAX_AUDIBLE_FREQUENCY,
} from '../../js/system/generateSystem.js';
import { presetNotes } from '../../js/presets/registry.js';

const majorScale = presetNotes('majorScaleNotes');
const singleNote = [{ ratioToRoot: 1 }];

describe('buildRegisters', () => {
  it('fills the audible range in both directions from the root', () => {
    const scale = buildRegisters(400, majorScale);
    const shifts = scale.map((register) => register.octaveShift);

    assert.ok(shifts.includes(0), 'the root register is present');
    assert.ok(Math.min(...shifts) < 0, 'registers are generated below the root');
    assert.ok(Math.max(...shifts) > 0, 'registers are generated above the root');
  });

  it('keeps every note inside the audible range', () => {
    const frequencies = buildRegisters(400, majorScale)
      .flatMap((register) => register.notes.map((note) => note.frequency));

    assert.ok(Math.min(...frequencies) >= MIN_AUDIBLE_FREQUENCY);
    assert.ok(Math.max(...frequencies) <= MAX_AUDIBLE_FREQUENCY);
  });

  it('orders registers low to high with no gaps', () => {
    const shifts = buildRegisters(400, majorScale).map((register) => register.octaveShift);

    shifts.forEach((shift, index) => {
      if (index > 0) assert.equal(shift, shifts[index - 1] + 1);
    });
  });

  it('generates octaves of a single-note register', () => {
    const frequencies = buildRegisters(400, singleNote)
      .map((register) => register.notes[0].frequency);

    assert.deepEqual(frequencies, [25, 50, 100, 200, 400, 800, 1600, 3200, 6400, 12800]);
  });

  it('does not descend below the root when there is no room', () => {
    const shifts = buildRegisters(27, majorScale).map((register) => register.octaveShift);

    assert.equal(Math.min(...shifts), 0);
  });

  it('drops a register whose top note would clear the audible range', () => {
    const scale = buildRegisters(15000, [{ ratioToRoot: 1 }, { ratioToRoot: 1.5 }]);

    scale.forEach((register) => {
      register.notes.forEach((note) => assert.ok(note.frequency <= MAX_AUDIBLE_FREQUENCY));
    });
  });

  it('shifts down to fit when the root register overshoots the top', () => {
    // 19999 x 1.9 clears 20000, so the root's own register cannot be kept.
    const scale = buildRegisters(19999, [{ ratioToRoot: 1 }, { ratioToRoot: 1.9 }]);

    assert.ok(scale.length > 0);
    assert.ok(scale.every((register) => register.octaveShift < 0));
  });

  it('still returns the root register when no shift of it fits', () => {
    // A register spanning more than the audible range fits nowhere.
    const scale = buildRegisters(400, [{ ratioToRoot: 1 }, { ratioToRoot: 5000 }]);

    assert.equal(scale.length, 1);
    assert.equal(scale[0].octaveShift, 0);
  });

  it('returns nothing for an empty note list rather than throwing', () => {
    assert.deepEqual(buildRegisters(400, []), []);
    assert.deepEqual(buildRegisters(400, undefined), []);
  });

  it('returns nothing rather than notes that could never sound', () => {
    // The fallback must not hand a NaN frequency to the keyboard.
    assert.deepEqual(buildRegisters(400, [{ ratioToRoot: Number.NaN }]), []);
    assert.deepEqual(buildRegisters(Number.NaN, [{ ratioToRoot: 1 }]), []);
    assert.deepEqual(buildRegisters(400, [{ ratioToRoot: 'nope' }]), []);
  });

  it('tags each note with its index and the note it came from', () => {
    const [firstRegister] = buildRegisters(400, majorScale);

    firstRegister.notes.forEach((note, index) => {
      assert.equal(note.noteIndex, index);
      assert.equal(note.definition, majorScale[index]);
    });
  });
});

describe('homeRegisterIndex', () => {
  it('points at the register that starts on the root itself', () => {
    const scale = buildRegisters(400, majorScale);

    assert.equal(scale[homeRegisterIndex(scale)].octaveShift, 0);
    assert.equal(scale[homeRegisterIndex(scale)].notes[0].frequency, 400);
  });

  it('falls back to the lowest register when there is no unshifted one', () => {
    assert.equal(homeRegisterIndex([{ octaveShift: 3, notes: [] }]), 0);
  });
});

describe('generateRootNotes', () => {
  it('multiplies the root frequency by each ratio', () => {
    const rootNotes = generateRootNotes(400, [{ ratioToRoot: 1 }, { ratioToRoot: 1.5 }]);

    assert.deepEqual(rootNotes.slice(0, 2).map((note) => note.frequency), [400, 600]);
    assert.deepEqual(rootNotes.slice(0, 2).map((note) => note.octaveShift), [0, 0]);
  });

  it('repeats a short register up the octaves to fill the root keys', () => {
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
    assert.deepEqual(rootNotes[9], { frequency: 800, octaveShift: 3, definition: threeNotes[0] });
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

  it('caps at the ten root keys that can address a root', () => {
    const twelveNotes = presetNotes('equalTemperamentNoteGenerator', 12);

    assert.equal(twelveNotes.length, 12);
    assert.equal(generateRootNotes(100, twelveNotes).length, MAX_ROOT_NOTES);
  });

  it('carries the source note through as definition', () => {
    const [rootNote] = generateRootNotes(400, majorScale);

    assert.equal(rootNote.definition, majorScale[0]);
  });
});
