import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { resolveNoteSet } from '../../js/config/resolveNoteSet.js';
import {
  getConfig,
  getPrimaryDiapason,
  addDiapason,
  clearStoredConfig,
  replaceConfig,
} from '../../js/config/systemConfigState.js';
import { getNotesForSystem } from '../../js/scaleCalculators/noteGenerators.js';

beforeEach(() => {
  clearStoredConfig();
});

describe('resolveNoteSet', () => {
  it('resolves a configured diapason by its id', () => {
    const second = addDiapason();

    assert.equal(resolveNoteSet(second), getConfig().diapasons[1].notes);
  });

  it('resolves a built-in calculator by name', () => {
    assert.equal(resolveNoteSet('bluesScaleNotes'), getNotesForSystem('bluesScaleNotes'));
  });

  it('resolves a built-in calculator given by its alias', () => {
    assert.equal(resolveNoteSet('minor'), getNotesForSystem('naturalMinorScaleNotes'));
  });

  it('prefers a configured diapason over a calculator with the same name', () => {
    replaceConfig({
      primaryDiapasonId: 'majorScaleNotes',
      diapasons: [{ id: 'majorScaleNotes', name: 'Mine', notes: [{ ratioToRoot: 1.25 }] }],
    });

    assert.equal(resolveNoteSet('majorScaleNotes').length, 1);
  });

  it('falls back to the primary diapason for a name it cannot resolve', (t) => {
    t.mock.method(console, 'warn', () => {});

    assert.equal(resolveNoteSet('ghost'), getPrimaryDiapason().notes);
    assert.equal(resolveNoteSet(undefined), getPrimaryDiapason().notes);
  });

  it('warns when it has to fall back, rather than failing silently', (t) => {
    const warn = t.mock.method(console, 'warn', () => {});

    resolveNoteSet('ghost');

    assert.equal(warn.mock.callCount(), 1);
  });

  it('always resolves every triad type in the default configuration', () => {
    getConfig().diapasons.forEach((diapason) => {
      diapason.notes.forEach((note) => {
        const notes = resolveNoteSet(note.triadType);

        assert.ok(Array.isArray(notes) && notes.length > 0, `${note.triadType} resolves`);
      });
    });
  });
});
