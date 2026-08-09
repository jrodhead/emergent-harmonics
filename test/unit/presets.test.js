import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { presetNames, presetToNotes, foldRatioIntoDiapason, degreeForIndex } from '../../js/config/presets.js';
import { isPreset } from '../../js/presets/registry.js';

describe('foldRatioIntoDiapason', () => {
  it('leaves a ratio that already sits in the diapason alone', () => {
    assert.equal(foldRatioIntoDiapason(1), 1);
    assert.equal(foldRatioIntoDiapason(1.5), 1.5);
  });

  it('folds a ratio above the octave down', () => {
    assert.equal(foldRatioIntoDiapason(3), 1.5);
    assert.equal(foldRatioIntoDiapason(4), 1);
  });

  it('folds a ratio below the root up', () => {
    assert.equal(foldRatioIntoDiapason(0.75), 1.5);
    assert.equal(foldRatioIntoDiapason(0.5), 1);
  });

  it('falls back to the root for values that are not usable ratios', () => {
    [0, -3, Number.NaN, Number.POSITIVE_INFINITY, undefined].forEach((value) => {
      assert.equal(foldRatioIntoDiapason(value), 1);
    });
  });
});

describe('degreeForIndex', () => {
  it('numbers degrees in roman numerals', () => {
    assert.equal(degreeForIndex(0), 'I');
    assert.equal(degreeForIndex(6), 'VII');
  });

  it('keeps numbering past the notes a conventional scale holds', () => {
    // A diapason can hold a note per key, which is well past VII.
    assert.equal(degreeForIndex(13), 'XIV');
    assert.equal(degreeForIndex(29), 'XXX');
    assert.equal(degreeForIndex(99), 'C');
  });
});

describe('presetToNotes', () => {
  it('produces editable notes for every calculator', () => {
    presetNames.forEach((name) => {
      const notes = presetToNotes(name, 'diapason-1');

      assert.ok(notes.length > 0, `${name} produces notes`);

      notes.forEach((note) => {
        assert.ok(note.degree, `${name} note has a degree`);
        assert.ok(note.relationshipToRootName, `${name} note has a name`);
        assert.ok(note.triadType, `${name} note has a triad type`);
      });
    });
  });

  it('folds every calculator into a single diapason', () => {
    presetNames.forEach((name) => {
      presetToNotes(name, 'diapason-1').forEach((note) => {
        assert.ok(
          note.ratioToRoot >= 1 && note.ratioToRoot < 2,
          `${name}: ratio ${note.ratioToRoot} is outside the diapason`,
        );
      });
    });
  });

  it('orders notes from the root upward', () => {
    presetNames.forEach((name) => {
      const ratios = presetToNotes(name, 'diapason-1').map((note) => note.ratioToRoot);

      assert.deepEqual(ratios, [...ratios].sort((a, b) => a - b), `${name} is ordered`);
    });
  });

  it('drops notes that fold onto a pitch already in the diapason', () => {
    // hd110067 repeats 3/2 and doubles several of its ratios.
    const ratios = presetToNotes('hd110067NotesInOneDiapason', 'diapason-1')
      .map((note) => note.ratioToRoot);

    assert.equal(new Set(ratios).size, ratios.length);
  });

  it('gives every note a triad type that can actually be resolved', () => {
    presetNames.forEach((name) => {
      presetToNotes(name, 'diapason-1').forEach((note) => {
        assert.ok(
          note.triadType === 'diapason-1' || isPreset(note.triadType),
          `${name}: ${note.triadType} resolves to nothing`,
        );
      });
    });
  });

  it('keeps the per-degree triad relationships of the major scale', () => {
    const triadTypes = presetToNotes('majorScaleNotes', 'diapason-1').map((note) => note.triadType);

    assert.deepEqual(triadTypes, [
      'majorScaleNotes',
      'naturalMinorScaleNotes',
      'naturalMinorScaleNotes',
      'majorScaleNotes',
      'majorScaleNotes',
      'naturalMinorScaleNotes',
      'diminishedScaleNotes',
    ]);
  });

  it('canonicalises triad types so they match a calculator by name', () => {
    presetToNotes('majorScaleNotes', 'diapason-1').forEach((note) => {
      assert.ok(presetNames.includes(note.triadType), `${note.triadType} is a listed calculator`);
    });
  });

  it('points a calculator with no triad type at its own diapason', () => {
    // pythagoreanNotes carries no triadType at all.
    presetToNotes('pythagoreanNotes', 'diapason-7').forEach((note) => {
      assert.equal(note.triadType, 'diapason-7');
    });
  });

  it('keeps a triad type that names the calculator itself', () => {
    presetToNotes('hd110067NotesInOneDiapason', 'diapason-3').forEach((note) => {
      assert.equal(note.triadType, 'hd110067NotesInOneDiapason');
    });
  });

  it('names intervals in cents when the calculator does not name them', () => {
    const [firstNote] = presetToNotes('exploratoryNotes', 'diapason-1');

    assert.match(firstNote.relationshipToRootName, /cents$/);
  });
});
