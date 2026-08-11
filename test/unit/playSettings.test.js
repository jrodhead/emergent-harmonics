import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { readStoredValue, writeStoredValue, clearStoredValue } from '../../js/storage.js';
import {
  STORAGE_KEY,
  DEFAULT_GLIDE_MS,
  MAX_GLIDE_MS,
  getGlideMs,
  setGlideMs,
  glideTimeConstant,
  loadStoredPlaySettings,
} from '../../js/config/playSettings.js';

const storedSettings = () => JSON.parse(readStoredValue(STORAGE_KEY));

beforeEach(() => {
  clearStoredValue(STORAGE_KEY);
  loadStoredPlaySettings();
});

describe('glide time', () => {
  it('starts at a glide that can be heard', () => {
    assert.equal(getGlideMs(), DEFAULT_GLIDE_MS);
    assert.ok(DEFAULT_GLIDE_MS > 0);
  });

  it('takes a new glide', () => {
    setGlideMs(200);

    assert.equal(getGlideMs(), 200);
  });

  it('allows no glide at all, for a player who does not want to slide', () => {
    setGlideMs(0);

    assert.equal(getGlideMs(), 0);
    assert.equal(glideTimeConstant(), 0);
  });

  it('holds the glide inside its range', () => {
    setGlideMs(-50);
    assert.equal(getGlideMs(), 0);

    setGlideMs(MAX_GLIDE_MS + 1000);
    assert.equal(getGlideMs(), MAX_GLIDE_MS);
  });

  it('ignores a glide that is not a number', () => {
    setGlideMs(Number.NaN);
    assert.equal(getGlideMs(), DEFAULT_GLIDE_MS);

    setGlideMs(undefined);
    assert.equal(getGlideMs(), DEFAULT_GLIDE_MS);
  });

  it('reports the glide in the seconds the oscillator wants', () => {
    setGlideMs(300);

    // Three time constants is where the note has arrived, so the control can
    // be labelled in the time the player actually hears.
    assert.equal(glideTimeConstant(), 0.1);
  });
});

describe('persistence', () => {
  it('saves the glide as soon as it changes', () => {
    setGlideMs(250);

    assert.equal(storedSettings().glideMs, 250);
  });

  it('restores what was stored', () => {
    writeStoredValue(STORAGE_KEY, JSON.stringify({ glideMs: 120 }));

    loadStoredPlaySettings();

    assert.equal(getGlideMs(), 120);
  });

  it('keeps the default when nothing has been stored', () => {
    setGlideMs(250);
    clearStoredValue(STORAGE_KEY);

    loadStoredPlaySettings();

    assert.equal(getGlideMs(), DEFAULT_GLIDE_MS);
  });

  it('holds a hand-edited glide inside its range', () => {
    writeStoredValue(STORAGE_KEY, JSON.stringify({ glideMs: 99999 }));

    loadStoredPlaySettings();

    assert.equal(getGlideMs(), MAX_GLIDE_MS);
  });

  it('starts fresh when what was stored cannot be used', (t) => {
    t.mock.method(console, 'error', () => {});
    writeStoredValue(STORAGE_KEY, '{ not json');

    loadStoredPlaySettings();

    assert.equal(getGlideMs(), DEFAULT_GLIDE_MS);
  });

  it('starts fresh when what was stored is valid JSON but not a setting', () => {
    writeStoredValue(STORAGE_KEY, JSON.stringify({ glideMs: 'quickly' }));

    loadStoredPlaySettings();

    assert.equal(getGlideMs(), DEFAULT_GLIDE_MS);
  });
});
