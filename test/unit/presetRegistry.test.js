import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  presetIds,
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
