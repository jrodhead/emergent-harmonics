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
  DEFAULT_DRONE_PERIOD_SHIFT,
  MIN_DRONE_PERIOD_SHIFT,
  MAX_DRONE_PERIOD_SHIFT,
  DEFAULT_DRONE_VOLUME,
  MAX_DRONE_VOLUME,
  getDronePeriodShift,
  setDronePeriodShift,
  getDroneVolume,
  setDroneVolume,
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

describe('the drone', () => {
  it('starts under the hands rather than in among them', () => {
    assert.equal(getDronePeriodShift(), DEFAULT_DRONE_PERIOD_SHIFT);
    assert.ok(DEFAULT_DRONE_PERIOD_SHIFT < 0);
  });

  it('takes a new register, above the root as well as below it', () => {
    setDronePeriodShift(-2);
    assert.equal(getDronePeriodShift(), -2);

    setDronePeriodShift(1);
    assert.equal(getDronePeriodShift(), 1);
  });

  it('holds the register inside its range, in both directions', () => {
    setDronePeriodShift(MIN_DRONE_PERIOD_SHIFT - 5);
    assert.equal(getDronePeriodShift(), MIN_DRONE_PERIOD_SHIFT);

    setDronePeriodShift(MAX_DRONE_PERIOD_SHIFT + 5);
    assert.equal(getDronePeriodShift(), MAX_DRONE_PERIOD_SHIFT);
  });

  it('rounds the register, being the one whole-numbered control here', () => {
    setDronePeriodShift(-1.4);

    assert.equal(getDronePeriodShift(), -1);
  });

  it('ignores a register that is not a number', () => {
    setDronePeriodShift(Number.NaN);
    assert.equal(getDronePeriodShift(), DEFAULT_DRONE_PERIOD_SHIFT);

    setDronePeriodShift(undefined);
    assert.equal(getDronePeriodShift(), DEFAULT_DRONE_PERIOD_SHIFT);
  });

  it('starts below the level the note keys default to', () => {
    assert.equal(getDroneVolume(), DEFAULT_DRONE_VOLUME);
    assert.ok(DEFAULT_DRONE_VOLUME > 0 && DEFAULT_DRONE_VOLUME < 0.5);
  });

  it('takes a new level, and is not rounded off to nothing', () => {
    setDroneVolume(0.42);

    assert.equal(getDroneVolume(), 0.42);
  });

  it('holds the level inside its range', () => {
    setDroneVolume(-1);
    assert.equal(getDroneVolume(), 0);

    setDroneVolume(MAX_DRONE_VOLUME + 1);
    assert.equal(getDroneVolume(), MAX_DRONE_VOLUME);
  });

  it('ignores a level that is not a number', () => {
    setDroneVolume(Number.NaN);

    assert.equal(getDroneVolume(), DEFAULT_DRONE_VOLUME);
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

  it('saves the drone settings as soon as they change', () => {
    setDronePeriodShift(-3);
    setDroneVolume(0.6);

    assert.equal(storedSettings().dronePeriodShift, -3);
    assert.equal(storedSettings().droneVolume, 0.6);
  });

  it('restores the drone settings that were stored', () => {
    writeStoredValue(STORAGE_KEY, JSON.stringify({ dronePeriodShift: 1, droneVolume: 0.15 }));

    loadStoredPlaySettings();

    assert.equal(getDronePeriodShift(), 1);
    assert.equal(getDroneVolume(), 0.15);
  });

  it('holds hand-edited drone settings inside their ranges', () => {
    writeStoredValue(STORAGE_KEY, JSON.stringify({ dronePeriodShift: -99, droneVolume: 99 }));

    loadStoredPlaySettings();

    assert.equal(getDronePeriodShift(), MIN_DRONE_PERIOD_SHIFT);
    assert.equal(getDroneVolume(), MAX_DRONE_VOLUME);
  });

  it('restores settings written before the drone existed', () => {
    writeStoredValue(STORAGE_KEY, JSON.stringify({ glideMs: 200, attackMs: 40, releaseMs: 600 }));

    loadStoredPlaySettings();

    assert.equal(getGlideMs(), 200);
    assert.equal(getAttackMs(), 40);
    assert.equal(getReleaseMs(), 600);
    assert.equal(getDronePeriodShift(), DEFAULT_DRONE_PERIOD_SHIFT);
    assert.equal(getDroneVolume(), DEFAULT_DRONE_VOLUME);
  });

  it('restores the other four when only the drone level was stored', () => {
    writeStoredValue(STORAGE_KEY, JSON.stringify({ droneVolume: 0.8 }));

    loadStoredPlaySettings();

    assert.equal(getDroneVolume(), 0.8);
    assert.equal(getGlideMs(), DEFAULT_GLIDE_MS);
    assert.equal(getDronePeriodShift(), DEFAULT_DRONE_PERIOD_SHIFT);
  });
});
