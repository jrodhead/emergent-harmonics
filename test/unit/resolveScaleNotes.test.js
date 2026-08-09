import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { resolveScaleNotes } from '../../js/config/resolveScaleNotes.js';
import {
  getConfig,
  getPrimaryScale,
  addScale,
  clearStoredConfig,
  replaceConfig,
} from '../../js/config/systemConfigState.js';
import { presetNotes } from '../../js/presets/registry.js';

beforeEach(() => {
  clearStoredConfig();
});

describe('resolveScaleNotes', () => {
  it('resolves a configured scale by its id', () => {
    const second = addScale();

    assert.equal(resolveScaleNotes(second), getConfig().scales[1].notes);
  });

  it('resolves a built-in calculator by name', () => {
    assert.equal(resolveScaleNotes('bluesScaleNotes'), presetNotes('bluesScaleNotes'));
  });

  it('resolves a built-in calculator given by its alias', () => {
    assert.equal(resolveScaleNotes('minor'), presetNotes('naturalMinorScaleNotes'));
  });

  it('prefers a configured scale over a calculator with the same name', () => {
    replaceConfig({
      primaryScaleId: 'majorScaleNotes',
      scales: [{ id: 'majorScaleNotes', name: 'Mine', notes: [{ ratioToRoot: 1.25 }] }],
    });

    assert.equal(resolveScaleNotes('majorScaleNotes').length, 1);
  });

  it('falls back to the primary scale for a name it cannot resolve', (t) => {
    t.mock.method(console, 'warn', () => {});

    assert.equal(resolveScaleNotes('ghost'), getPrimaryScale().notes);
    assert.equal(resolveScaleNotes(undefined), getPrimaryScale().notes);
  });

  it('warns when it has to fall back, rather than failing silently', (t) => {
    const warn = t.mock.method(console, 'warn', () => {});

    resolveScaleNotes('ghost');

    assert.equal(warn.mock.callCount(), 1);
  });

  it('always resolves every triad type in the default configuration', () => {
    getConfig().scales.forEach((scale) => {
      scale.notes.forEach((note) => {
        const notes = resolveScaleNotes(note.triadType);

        assert.ok(Array.isArray(notes) && notes.length > 0, `${note.triadType} resolves`);
      });
    });
  });
});
