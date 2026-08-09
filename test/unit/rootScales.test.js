import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { resolveScaleNotes, rootScaleLabel } from '../../js/config/rootScales.js';
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

  it('resolves a built-in preset by its id', () => {
    assert.equal(resolveScaleNotes('blues'), presetNotes('blues'));
  });

  it('prefers a configured scale over a preset with the same id', () => {
    replaceConfig({
      primaryScaleId: 'major',
      scales: [{ id: 'major', name: 'Mine', notes: [{ ratioToRoot: 1.25, rootScaleId: 'major' }] }],
    });

    assert.equal(resolveScaleNotes('major').length, 1);
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

  it('always resolves every root scale in the default configuration', () => {
    getConfig().scales.forEach((scale) => {
      scale.notes.forEach((note) => {
        const notes = resolveScaleNotes(note.rootScaleId);

        assert.ok(Array.isArray(notes) && notes.length > 0, `${note.rootScaleId} resolves`);
      });
    });
  });
});

describe('rootScaleLabel', () => {
  it('names a configured scale by the name it was given', () => {
    const second = addScale();

    assert.equal(rootScaleLabel(second), getConfig().scales[1].name);
  });

  it('names a built-in preset the way the screen offers it', () => {
    assert.equal(rootScaleLabel('naturalMinor'), 'Natural minor');
    assert.equal(rootScaleLabel('hd110067'), 'HD 110067');
  });

  it('falls back to the primary scale for an id it cannot place', () => {
    assert.equal(rootScaleLabel('ghost'), getPrimaryScale().name);
  });
});
