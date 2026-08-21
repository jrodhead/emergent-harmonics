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
  DEFAULT_DRONE_PAIR,
  DEFAULT_DRONE_SPREAD_RATIO,
  DEFAULT_DRONE_SPREAD_HZ,
  DEFAULT_DRONE_PAN,
  MIN_DRONE_PAN,
  MAX_DRONE_PAN,
  getDronePair,
  setDronePair,
  getDroneSpreadRatio,
  setDroneSpreadRatio,
  getDroneSpreadHz,
  setDroneSpreadHz,
  getDroneLowerPan,
  setDroneLowerPan,
  getDroneUpperPan,
  setDroneUpperPan,
} from '../../js/config/playSettings.js';
import { MAX_SPREAD_HZ, MAX_SPREAD_RATIO } from '../../js/system/dronePair.js';

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

describe('the drone pair', () => {
  it('sounds as one voice until it is asked to be two', () => {
    assert.equal(getDronePair(), DEFAULT_DRONE_PAIR);
    assert.equal(DEFAULT_DRONE_PAIR, false);
  });

  it('is switched on and off, and takes nothing but a yes or a no', () => {
    setDronePair(true);
    assert.equal(getDronePair(), true);

    setDronePair(false);
    assert.equal(getDronePair(), false);
  });

  it('opens at the pitch that was already sounding', () => {
    assert.equal(getDroneSpreadRatio(), DEFAULT_DRONE_SPREAD_RATIO);
    assert.equal(getDroneSpreadHz(), DEFAULT_DRONE_SPREAD_HZ);
    assert.equal(DEFAULT_DRONE_SPREAD_RATIO, 1);
    assert.equal(DEFAULT_DRONE_SPREAD_HZ, 0);
  });

  it('opens with both voices centred', () => {
    assert.equal(getDroneLowerPan(), DEFAULT_DRONE_PAN);
    assert.equal(getDroneUpperPan(), DEFAULT_DRONE_PAN);
    assert.equal(DEFAULT_DRONE_PAN, 0);
  });

  it('takes a ratio spread, inverting one written the other way up', () => {
    setDroneSpreadRatio(1.5);
    assert.equal(getDroneSpreadRatio(), 1.5);

    setDroneSpreadRatio(2 / 3);
    assert.equal(getDroneSpreadRatio(), 1.5);
  });

  it('holds the ratio spread inside a period', () => {
    setDroneSpreadRatio(MAX_SPREAD_RATIO + 2);

    assert.equal(getDroneSpreadRatio(), MAX_SPREAD_RATIO);
  });

  it('ignores a ratio spread that is not a ratio', () => {
    setDroneSpreadRatio(Number.NaN);
    assert.equal(getDroneSpreadRatio(), DEFAULT_DRONE_SPREAD_RATIO);

    setDroneSpreadRatio(0);
    assert.equal(getDroneSpreadRatio(), DEFAULT_DRONE_SPREAD_RATIO);
  });

  it('takes a hertz spread and holds it inside its range', () => {
    setDroneSpreadHz(6);
    assert.equal(getDroneSpreadHz(), 6);

    setDroneSpreadHz(-4);
    assert.equal(getDroneSpreadHz(), 0);

    setDroneSpreadHz(MAX_SPREAD_HZ + 10);
    assert.equal(getDroneSpreadHz(), MAX_SPREAD_HZ);
  });

  it('takes each voice anywhere in the field, including hard left and right', () => {
    setDroneLowerPan(MIN_DRONE_PAN);
    setDroneUpperPan(MAX_DRONE_PAN);

    assert.equal(getDroneLowerPan(), -1);
    assert.equal(getDroneUpperPan(), 1);
  });

  it('holds each voice inside the field, and moves only the one it was given', () => {
    setDroneLowerPan(-4);
    assert.equal(getDroneLowerPan(), MIN_DRONE_PAN);
    assert.equal(getDroneUpperPan(), DEFAULT_DRONE_PAN);

    setDroneUpperPan(4);
    assert.equal(getDroneUpperPan(), MAX_DRONE_PAN);
    assert.equal(getDroneLowerPan(), MIN_DRONE_PAN);
  });

  it('ignores a position that is not a number', () => {
    setDroneLowerPan(Number.NaN);

    assert.equal(getDroneLowerPan(), DEFAULT_DRONE_PAN);
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

  it('saves the pair and its four settings as soon as they change', () => {
    setDronePair(true);
    setDroneSpreadRatio(1.5);
    setDroneSpreadHz(6);
    setDroneLowerPan(-1);
    setDroneUpperPan(1);

    const stored = storedSettings();

    assert.equal(stored.dronePair, true);
    assert.equal(stored.droneSpreadRatio, 1.5);
    assert.equal(stored.droneSpreadHz, 6);
    assert.equal(stored.droneLowerPan, -1);
    assert.equal(stored.droneUpperPan, 1);
  });

  it('restores them, holding each inside its range on the way in', () => {
    writeStoredValue(STORAGE_KEY, JSON.stringify({
      dronePair: true,
      droneSpreadRatio: 2 / 3,
      droneSpreadHz: MAX_SPREAD_HZ + 10,
      droneLowerPan: -4,
      droneUpperPan: 0.5,
    }));

    loadStoredPlaySettings();

    assert.equal(getDronePair(), true);
    assert.equal(getDroneSpreadRatio(), 1.5);
    assert.equal(getDroneSpreadHz(), MAX_SPREAD_HZ);
    assert.equal(getDroneLowerPan(), MIN_DRONE_PAN);
    assert.equal(getDroneUpperPan(), 0.5);
  });

  it('restores the other nine from a settings blob written before the pair existed', () => {
    writeStoredValue(STORAGE_KEY, JSON.stringify({ glideMs: 200, droneVolume: 0.8 }));

    loadStoredPlaySettings();

    assert.equal(getGlideMs(), 200);
    assert.equal(getDroneVolume(), 0.8);
    assert.equal(getDronePair(), DEFAULT_DRONE_PAIR);
    assert.equal(getDroneSpreadRatio(), DEFAULT_DRONE_SPREAD_RATIO);
    assert.equal(getDroneLowerPan(), DEFAULT_DRONE_PAN);
  });

  it('ignores a stored pair flag that is not a yes or a no', () => {
    writeStoredValue(STORAGE_KEY, JSON.stringify({ dronePair: 'yes please' }));

    loadStoredPlaySettings();

    assert.equal(getDronePair(), DEFAULT_DRONE_PAIR);
  });
});
