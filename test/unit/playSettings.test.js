import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { readStoredValue, writeStoredValue, clearStoredValue } from '../../js/storage.js';
import {
  STORAGE_KEY,
  DEFAULT_GLIDE_MS,
  MAX_GLIDE_MS,
  DEFAULT_ATTACK_MS,
  DEFAULT_RELEASE_MS,
  MAX_ENVELOPE_MS,
  getGlideMs,
  setGlideMs,
  glideTimeConstant,
  getAttackMs,
  setAttackMs,
  attackTime,
  getReleaseMs,
  setReleaseMs,
  releaseTime,
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

describe('the envelope', () => {
  it('starts with edges the ear does not hear as clicks', () => {
    assert.equal(getAttackMs(), DEFAULT_ATTACK_MS);
    assert.equal(getReleaseMs(), DEFAULT_RELEASE_MS);
    assert.ok(DEFAULT_ATTACK_MS > 0);
    assert.ok(DEFAULT_RELEASE_MS > 0);
  });

  it('takes a new attack and release', () => {
    setAttackMs(400);
    setReleaseMs(900);

    assert.equal(getAttackMs(), 400);
    assert.equal(getReleaseMs(), 900);
  });

  it('allows no envelope at all, for a player who wants the note to switch', () => {
    setAttackMs(0);
    setReleaseMs(0);

    assert.equal(attackTime(), 0);
    assert.equal(releaseTime(), 0);
  });

  it('holds both inside their range', () => {
    setAttackMs(-50);
    setReleaseMs(-50);
    assert.equal(getAttackMs(), 0);
    assert.equal(getReleaseMs(), 0);

    setAttackMs(MAX_ENVELOPE_MS + 1000);
    setReleaseMs(MAX_ENVELOPE_MS + 1000);
    assert.equal(getAttackMs(), MAX_ENVELOPE_MS);
    assert.equal(getReleaseMs(), MAX_ENVELOPE_MS);
  });

  it('ignores a value that is not a number', () => {
    setAttackMs(Number.NaN);
    setReleaseMs(undefined);

    assert.equal(getAttackMs(), DEFAULT_ATTACK_MS);
    assert.equal(getReleaseMs(), DEFAULT_RELEASE_MS);
  });

  it('reports both in the seconds the audio layer schedules in', () => {
    setAttackMs(250);
    setReleaseMs(1500);

    assert.equal(attackTime(), 0.25);
    assert.equal(releaseTime(), 1.5);
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

  it('saves the envelope as soon as it changes', () => {
    setAttackMs(300);
    setReleaseMs(700);

    assert.equal(storedSettings().attackMs, 300);
    assert.equal(storedSettings().releaseMs, 700);
  });

  it('restores the envelope that was stored', () => {
    writeStoredValue(STORAGE_KEY, JSON.stringify({ attackMs: 40, releaseMs: 600 }));

    loadStoredPlaySettings();

    assert.equal(getAttackMs(), 40);
    assert.equal(getReleaseMs(), 600);
  });

  it('holds a hand-edited envelope inside its range', () => {
    writeStoredValue(STORAGE_KEY, JSON.stringify({ attackMs: 99999, releaseMs: -1 }));

    loadStoredPlaySettings();

    assert.equal(getAttackMs(), MAX_ENVELOPE_MS);
    assert.equal(getReleaseMs(), 0);
  });

  it('restores settings written before the envelope existed', () => {
    writeStoredValue(STORAGE_KEY, JSON.stringify({ glideMs: 200 }));

    loadStoredPlaySettings();

    assert.equal(getGlideMs(), 200);
    assert.equal(getAttackMs(), DEFAULT_ATTACK_MS);
    assert.equal(getReleaseMs(), DEFAULT_RELEASE_MS);
  });
});
