import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  presetIds,
  presetFamily,
  presetOptions,
  presetLabel,
  presetNotes,
  isPreset,
} from '../../js/presets/registry.js';

describe('presetNotes', () => {
  it('returns notes for every preset it offers', () => {
    presetIds.forEach((id) => {
      const notes = presetNotes(id);

      assert.ok(Array.isArray(notes), `${id} returns an array`);
      assert.ok(notes.length > 0, `${id} is not empty`);
    });
  });

  it('generates an equal temperament of the requested size', () => {
    assert.equal(presetNotes('equalTemperament', 19).length, 19);
  });

  it('throws on an id it does not know', () => {
    assert.throws(() => presetNotes('nonsense'), /Unknown preset: nonsense/);
  });

  it('does not mistake inherited object properties for presets', () => {
    assert.throws(() => presetNotes('constructor'), /Unknown preset/);
    assert.throws(() => presetNotes('toString'), /Unknown preset/);
  });
});

describe('isPreset', () => {
  it('recognises every id it offers', () => {
    presetIds.forEach((id) => assert.equal(isPreset(id), true, `${id} is a preset`));
  });

  it('rejects anything else, including a scale id', () => {
    assert.equal(isPreset('scale-1'), false);
    assert.equal(isPreset(undefined), false);
    assert.equal(isPreset('constructor'), false);
  });
});

describe('presetOptions', () => {
  it('offers every preset as an id to store and a name to show', () => {
    const options = presetOptions();

    assert.equal(options.length, presetIds.length);
    options.forEach(({ value, label }) => {
      assert.ok(isPreset(value), `${value} is a preset`);
      assert.ok(label && label !== value, `${value} is shown as something friendlier`);
    });
  });

  it('names a preset the same way wherever it is asked', () => {
    presetOptions().forEach(({ value, label }) => assert.equal(presetLabel(value), label));
  });

  it('has no name for an id that is not a preset', () => {
    assert.equal(presetLabel('scale-1'), undefined);
  });
});

describe('presetFamily', () => {
  it('is just the preset itself when its degrees build nothing else', () => {
    assert.deepEqual(presetFamily('blues'), ['blues']);
    assert.deepEqual(presetFamily('pythagorean'), ['pythagorean']);
  });

  it('gathers the scales a preset builds, and the ones those build', () => {
    assert.deepEqual(presetFamily('major'), ['major', 'naturalMinor', 'diminished']);
    assert.deepEqual(presetFamily('majorPentatonic'), ['majorPentatonic', 'minorPentatonic']);
  });

  it('starts with the preset it was asked about', () => {
    presetIds.forEach((id) => assert.equal(presetFamily(id)[0], id));
  });

  it('holds each member once, though a family names itself in circles', () => {
    presetIds.forEach((id) => {
      const family = presetFamily(id);

      assert.equal(new Set(family).size, family.length, `${id} repeats a member`);
    });
  });

  it('is closed: nothing a member builds falls outside the family', () => {
    presetIds.forEach((id) => {
      const family = presetFamily(id);

      family.forEach((member) => {
        presetNotes(member).forEach(({ rootScaleId }) => {
          assert.ok(!isPreset(rootScaleId) || family.includes(rootScaleId),
            `${id}: ${member} builds ${rootScaleId}, which is outside the family`);
        });
      });
    });
  });
});
