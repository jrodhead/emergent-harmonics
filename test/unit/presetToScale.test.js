import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { presetToNotes } from '../../js/config/presetToScale.js';
import { presetIds } from '../../js/presets/registry.js';
import { isPreset } from '../../js/presets/registry.js';

describe('presetToNotes', () => {
  it('produces editable notes for every preset', () => {
    presetIds.forEach((name) => {
      const notes = presetToNotes(name, 'scale-1');

      assert.ok(notes.length > 0, `${name} produces notes`);

      notes.forEach((note) => {
        assert.ok(note.degree, `${name} note has a degree`);
        assert.ok(note.intervalName, `${name} note has a name`);
        assert.ok(note.rootScaleId, `${name} note has a root scale`);
      });
    });
  });

  it('folds every preset into a single scale', () => {
    presetIds.forEach((name) => {
      presetToNotes(name, 'scale-1').forEach((note) => {
        assert.ok(
          note.ratioToRoot >= 1 && note.ratioToRoot < 2,
          `${name}: ratio ${note.ratioToRoot} is outside the scale`,
        );
      });
    });
  });

  it('orders notes from the root upward', () => {
    presetIds.forEach((name) => {
      const ratios = presetToNotes(name, 'scale-1').map((note) => note.ratioToRoot);

      assert.deepEqual(ratios, [...ratios].sort((a, b) => a - b), `${name} is ordered`);
    });
  });

  it('drops notes that fold onto a pitch already in the scale', () => {
    // hd110067 repeats 3/2 and doubles several of its ratios.
    const ratios = presetToNotes('hd110067', 'scale-1')
      .map((note) => note.ratioToRoot);

    assert.equal(new Set(ratios).size, ratios.length);
  });

  it('gives every note a root scale that can actually be resolved', () => {
    presetIds.forEach((name) => {
      presetToNotes(name, 'scale-1').forEach((note) => {
        assert.ok(
          note.rootScaleId === 'scale-1' || isPreset(note.rootScaleId),
          `${name}: ${note.rootScaleId} resolves to nothing`,
        );
      });
    });
  });

  it('keeps the per-degree root scale relationships of the major scale', () => {
    const rootScaleIds = presetToNotes('major', 'scale-1').map((note) => note.rootScaleId);

    assert.deepEqual(rootScaleIds, [
      'major',
      'naturalMinor',
      'naturalMinor',
      'major',
      'major',
      'naturalMinor',
      'diminished',
    ]);
  });

  it('gives every root scale an id the screen can offer', () => {
    presetToNotes('major', 'scale-1').forEach((note) => {
      assert.ok(presetIds.includes(note.rootScaleId), `${note.rootScaleId} is a listed preset`);
    });
  });

  it('points a preset with no root scale at its own scale', () => {
    // The pythagorean preset carries no rootScaleId at all.
    presetToNotes('pythagorean', 'scale-7').forEach((note) => {
      assert.equal(note.rootScaleId, 'scale-7');
    });
  });

  it('keeps a root scale that names the preset itself', () => {
    presetToNotes('hd110067', 'scale-3').forEach((note) => {
      assert.equal(note.rootScaleId, 'hd110067');
    });
  });

  it('names intervals in cents when the preset does not name them', () => {
    const [firstNote] = presetToNotes('exploratory', 'scale-1');

    assert.match(firstNote.intervalName, /cents$/);
  });
});
