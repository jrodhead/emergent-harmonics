import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  getNotesForSystem,
  isBuiltInSystem,
  canonicalSystemName,
  noteGenerators,
} from '../../js/scaleCalculators/noteGenerators.js';

describe('getNotesForSystem', () => {
  it('returns notes for every name offered in the calculator list', () => {
    Object.keys(noteGenerators).forEach((name) => {
      const notes = getNotesForSystem(name);

      assert.ok(Array.isArray(notes), `${name} returns an array`);
      assert.ok(notes.length > 0, `${name} is not empty`);
    });
  });

  it('accepts the short aliases used inside the scale files', () => {
    assert.equal(getNotesForSystem('major'), getNotesForSystem('majorScaleNotes'));
    assert.equal(getNotesForSystem('minor'), getNotesForSystem('naturalMinorScaleNotes'));
    assert.equal(getNotesForSystem('diminished'), getNotesForSystem('diminishedScaleNotes'));
  });

  it('generates an equal temperament of the requested size', () => {
    assert.equal(getNotesForSystem('equalTemperamentNoteGenerator', 19).length, 19);
  });

  it('throws on a name it does not know', () => {
    assert.throws(() => getNotesForSystem('nonsense'), /Invalid System Calculator: nonsense/);
  });

  it('does not mistake inherited object properties for systems', () => {
    assert.throws(() => getNotesForSystem('constructor'), /Invalid System Calculator/);
    assert.throws(() => getNotesForSystem('toString'), /Invalid System Calculator/);
  });
});

describe('isBuiltInSystem', () => {
  it('recognises canonical names, aliases, and the generator', () => {
    assert.equal(isBuiltInSystem('majorScaleNotes'), true);
    assert.equal(isBuiltInSystem('minor'), true);
    assert.equal(isBuiltInSystem('equalTemperamentNoteGenerator'), true);
  });

  it('rejects anything else, including a diapason id', () => {
    assert.equal(isBuiltInSystem('diapason-1'), false);
    assert.equal(isBuiltInSystem(undefined), false);
    assert.equal(isBuiltInSystem('constructor'), false);
  });
});

describe('canonicalSystemName', () => {
  it('resolves an alias to the name the configuration screen lists', () => {
    assert.equal(canonicalSystemName('major'), 'majorScaleNotes');
    assert.equal(canonicalSystemName('minor'), 'naturalMinorScaleNotes');
    assert.equal(canonicalSystemName('diminished'), 'diminishedScaleNotes');
  });

  it('leaves a name that is already canonical alone', () => {
    assert.equal(canonicalSystemName('bluesScaleNotes'), 'bluesScaleNotes');
    assert.equal(canonicalSystemName('diapason-1'), 'diapason-1');
  });

  it('resolves every alias to a name in the calculator list', () => {
    ['major', 'minor', 'diminished'].forEach((alias) => {
      assert.ok(canonicalSystemName(alias) in noteGenerators);
    });
  });
});
