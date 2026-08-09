import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  presetNotes,
  isPreset,
  canonicalPresetName,
  presetNames,
} from '../../js/presets/registry.js';

describe('presetNotes', () => {
  it('returns notes for every name it offers', () => {
    presetNames.forEach((name) => {
      const notes = presetNotes(name);

      assert.ok(Array.isArray(notes), `${name} returns an array`);
      assert.ok(notes.length > 0, `${name} is not empty`);
    });
  });

  it('accepts the short aliases used inside the scale files', () => {
    assert.equal(presetNotes('major'), presetNotes('majorScaleNotes'));
    assert.equal(presetNotes('minor'), presetNotes('naturalMinorScaleNotes'));
    assert.equal(presetNotes('diminished'), presetNotes('diminishedScaleNotes'));
  });

  it('generates an equal temperament of the requested size', () => {
    assert.equal(presetNotes('equalTemperamentNoteGenerator', 19).length, 19);
  });

  it('throws on a name it does not know', () => {
    assert.throws(() => presetNotes('nonsense'), /Unknown preset: nonsense/);
  });

  it('does not mistake inherited object properties for presets', () => {
    assert.throws(() => presetNotes('constructor'), /Unknown preset/);
    assert.throws(() => presetNotes('toString'), /Unknown preset/);
  });
});

describe('isPreset', () => {
  it('recognises canonical names, aliases, and the computed preset', () => {
    assert.equal(isPreset('majorScaleNotes'), true);
    assert.equal(isPreset('minor'), true);
    assert.equal(isPreset('equalTemperamentNoteGenerator'), true);
  });

  it('rejects anything else, including a diapason id', () => {
    assert.equal(isPreset('diapason-1'), false);
    assert.equal(isPreset(undefined), false);
    assert.equal(isPreset('constructor'), false);
  });
});

describe('canonicalPresetName', () => {
  it('resolves an alias to the name the configuration screen lists', () => {
    assert.equal(canonicalPresetName('major'), 'majorScaleNotes');
    assert.equal(canonicalPresetName('minor'), 'naturalMinorScaleNotes');
    assert.equal(canonicalPresetName('diminished'), 'diminishedScaleNotes');
  });

  it('leaves a name that is already canonical alone', () => {
    assert.equal(canonicalPresetName('bluesScaleNotes'), 'bluesScaleNotes');
    assert.equal(canonicalPresetName('diapason-1'), 'diapason-1');
  });

  it('resolves every alias to a name it offers', () => {
    ['major', 'minor', 'diminished'].forEach((alias) => {
      assert.ok(presetNames.includes(canonicalPresetName(alias)));
    });
  });
});
