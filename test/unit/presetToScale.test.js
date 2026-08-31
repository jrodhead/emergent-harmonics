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

  it('keeps the Earth modes inharmonic, near the just intervals but never on them', () => {
    // The modes of a sphere go as the square root of n(n+1) rather than as
    // whole multiples, and the near-misses are the whole character of the
    // scale. Rounding any of these onto the interval it sits beside would
    // leave a scale that is no longer the Earth's, so the distances are held
    // here: a fifth 16 cents sharp, an octave three quarters of a tone sharp.
    const cents = (ratio, just) => Math.round(1200 * Math.log2(ratio / just));
    const byName = new Map(presetToNotes('earthModes', oneScale('earthModes'))
      .map((note) => [note.intervalName.split(' ')[0], note.ratioToRoot]));

    assert.equal(cents(byName.get('0T2'), 6 / 5), 28);
    assert.equal(cents(byName.get('0S3'), 3 / 2), 16);
    // 0S4 and 0S0 have folded down a period, so they are measured against the
    // intervals they land beside rather than the ones they started from.
    assert.equal(cents(byName.get('0S4'), 1), 75);
    assert.equal(cents(byName.get('0S0'), 4 / 3), -24);
  });

  it('takes the Schumann resonances as measured, not as the ideal cavity', () => {
    // A lossless sphere would space these as the square root of n(n+1). The
    // real cavity leaks, and every mode above the first sits well sharp of
    // where the formula puts it — 92 cents by the second, 188 by the fifth.
    // Swapping the measured values for the tidy ones would be a different
    // scale entirely, so the gap is held here.
    const cents = (ratio, other) => Math.round(1200 * Math.log2(ratio / other));
    const ideal = (n) => Math.sqrt(n * (n + 1)) / Math.sqrt(2);
    const byName = new Map(presetToNotes('schumann', oneScale('schumann'))
      .map((note) => [note.intervalName.split(' ')[0], note.ratioToRoot]));

    // Folded into the period, so the ideal is folded the same way to compare.
    assert.equal(cents(byName.get('SR2'), ideal(2)), 92);
    assert.equal(cents(byName.get('SR3'), ideal(3) / 2), 140);
    assert.equal(cents(byName.get('SR5'), ideal(5) / 4), 188);
    // And the two that land close enough to common intervals to sound meant.
    assert.equal(cents(byName.get('SR3'), 4 / 3), -7);
    assert.equal(cents(byName.get('SR4'), 7 / 4), -7);
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
