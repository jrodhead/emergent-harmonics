import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { presetToNotes } from '../../js/config/presetToScale.js';
import { presetIds, presetFamily } from '../../js/presets/registry.js';

/** The scales a family would be loaded into, one per preset it reaches. */
const scalesFor = (presetId) => new Map(
  presetFamily(presetId).map((member, index) => [member, `scale-${index + 1}`]),
);

/** A family loaded into a single scale, as an added scale is. */
const oneScale = (presetId, scaleId = 'scale-1') => new Map([[presetId, scaleId]]);

describe('presetToNotes', () => {
  it('produces editable notes for every preset', () => {
    presetIds.forEach((presetId) => {
      const notes = presetToNotes(presetId, scalesFor(presetId));

      assert.ok(notes.length > 0, `${presetId} produces notes`);

      notes.forEach((note) => {
        assert.ok(note.degree, `${presetId} note has a degree`);
        assert.ok(note.intervalName, `${presetId} note has a name`);
        assert.ok(note.rootScaleId, `${presetId} note has a root scale`);
      });
    });
  });

  it('folds every preset into a single period', () => {
    presetIds.forEach((presetId) => {
      presetToNotes(presetId, scalesFor(presetId)).forEach((note) => {
        assert.ok(
          note.ratioToRoot >= 1 && note.ratioToRoot < 2,
          `${presetId}: ratio ${note.ratioToRoot} is outside the period`,
        );
      });
    });
  });

  it('orders notes from the root upward', () => {
    presetIds.forEach((presetId) => {
      const ratios = presetToNotes(presetId, scalesFor(presetId)).map((note) => note.ratioToRoot);

      assert.deepEqual(ratios, [...ratios].sort((a, b) => a - b), `${presetId} is ordered`);
    });
  });

  it('drops notes that fold onto a pitch already in the scale', () => {
    // hd110067 repeats 3/2 and doubles several of its ratios.
    const ratios = presetToNotes('hd110067', oneScale('hd110067')).map((note) => note.ratioToRoot);

    assert.equal(new Set(ratios).size, ratios.length);
  });

  it('points every note at a scale of the family, never at a preset', () => {
    presetIds.forEach((presetId) => {
      const scales = scalesFor(presetId);
      const ids = [...scales.values()];

      presetToNotes(presetId, scales).forEach((note) => {
        assert.ok(ids.includes(note.rootScaleId), `${presetId}: ${note.rootScaleId} is not one of its scales`);
      });
    });
  });

  it('keeps the per-degree relationships of the major scale, as scales', () => {
    const scales = scalesFor('major');

    assert.deepEqual(presetToNotes('major', scales).map((note) => note.rootScaleId), [
      scales.get('major'),
      scales.get('naturalMinor'),
      scales.get('naturalMinor'),
      scales.get('major'),
      scales.get('major'),
      scales.get('naturalMinor'),
      scales.get('diminished'),
    ]);
  });

  it('points a preset at its own scale when it names itself', () => {
    presetToNotes('hd110067', oneScale('hd110067', 'scale-3')).forEach((note) => {
      assert.equal(note.rootScaleId, 'scale-3');
    });
  });

  it('points a preset with no root scale at its own scale', () => {
    // The pythagorean preset carries no rootScaleId at all.
    presetToNotes('pythagorean', oneScale('pythagorean', 'scale-7')).forEach((note) => {
      assert.equal(note.rootScaleId, 'scale-7');
    });
  });

  it('falls back to its own scale for a family member it was given no scale for', () => {
    // How an added scale is built: one scale, so the degrees that would build
    // another scale build this one instead.
    presetToNotes('major', oneScale('major', 'scale-9')).forEach((note) => {
      assert.equal(note.rootScaleId, 'scale-9');
    });
  });

  it('names intervals in cents when the preset does not name them', () => {
    const [firstNote] = presetToNotes('exploratory', oneScale('exploratory'));

    assert.match(firstNote.intervalName, /cents$/);
  });
});
