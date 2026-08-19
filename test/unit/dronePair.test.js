import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_SPREAD_RATIO,
  normaliseSpreadRatio,
  pairFrequencies,
  pairVoiceVolume,
  parseRatio,
} from '../../js/system/dronePair.js';
import { MIN_AUDIBLE_FREQUENCY } from '../../js/system/generateSystem.js';

const centsBetween = (lower, upper) => 1200 * Math.log2(upper / lower);

describe('pairFrequencies', () => {
  it('opens where the drone already was, with no spread set', () => {
    assert.deepEqual(pairFrequencies(216), { lower: 216, upper: 216 });
  });

  it('puts exactly the hertz spread between the voices, symmetrically', () => {
    const { lower, upper } = pairFrequencies(216, { spreadHz: 6 });

    assert.equal(lower, 213);
    assert.equal(upper, 219);
    assert.equal(upper - lower, 6);
  });

  it('puts exactly the ratio between the voices, symmetrically in cents', () => {
    const { lower, upper } = pairFrequencies(216, { spreadRatio: 1.5 });

    assert.ok(Math.abs(upper / lower - 1.5) < 1e-12);

    // Symmetric about the drone pitch means the pitch is their geometric mean,
    // and each voice sits half the interval away from it.
    assert.ok(Math.abs(Math.sqrt(lower * upper) - 216) < 1e-12);
    assert.ok(Math.abs(centsBetween(lower, 216) - centsBetween(216, upper)) < 1e-9);
    assert.ok(Math.abs(centsBetween(216, upper) - 350.98) < 0.01);
  });

  it('applies the ratio first and the hertz offset second', () => {
    const { lower, upper } = pairFrequencies(216, { spreadRatio: 1.5, spreadHz: 6 });
    const half = Math.sqrt(1.5);

    assert.equal(lower, 216 / half - 3);
    assert.equal(upper, 216 * half + 3);
  });

  it('inverts a ratio below a unison, since a spread has no direction', () => {
    assert.deepEqual(
      pairFrequencies(216, { spreadRatio: 2 / 3 }),
      pairFrequencies(216, { spreadRatio: 3 / 2 }),
    );
  });

  it('clamps a ratio wider than a period', () => {
    assert.deepEqual(
      pairFrequencies(216, { spreadRatio: 6 }),
      pairFrequencies(216, { spreadRatio: MAX_SPREAD_RATIO }),
    );
  });

  it('takes a negative hertz spread as the same spread', () => {
    assert.deepEqual(
      pairFrequencies(216, { spreadHz: -6 }),
      pairFrequencies(216, { spreadHz: 6 }),
    );
  });

  it('refuses a spread that would put a voice under hearing, rather than clamping one side', () => {
    // Clamping the lower voice up to the floor would leave the pair asymmetric
    // and quietly change the beat rate, which is the number this exists to set.
    assert.equal(pairFrequencies(MIN_AUDIBLE_FREQUENCY + 2, { spreadHz: 10 }), null);
  });

  it('refuses a spread that would push a voice above hearing', () => {
    assert.equal(pairFrequencies(19999, { spreadHz: 10 }), null);
  });

  it('gives up on a pitch that is not one', () => {
    assert.equal(pairFrequencies(Number.NaN), null);
    assert.equal(pairFrequencies(0), null);
    assert.equal(pairFrequencies(-216), null);
    assert.equal(pairFrequencies(undefined), null);
  });

  it('treats a spread that is not a number as no spread', () => {
    assert.deepEqual(
      pairFrequencies(216, { spreadRatio: Number.NaN, spreadHz: undefined }),
      { lower: 216, upper: 216 },
    );
  });
});

describe('normaliseSpreadRatio', () => {
  it('leaves a ratio between a unison and a period alone', () => {
    assert.equal(normaliseSpreadRatio(1.5), 1.5);
    assert.equal(normaliseSpreadRatio(1), 1);
  });

  it('inverts below a unison and clamps above a period', () => {
    assert.equal(normaliseSpreadRatio(0.5), 2);
    assert.equal(normaliseSpreadRatio(3), MAX_SPREAD_RATIO);
  });

  it('falls back to a unison for anything that is not a ratio', () => {
    assert.equal(normaliseSpreadRatio(Number.NaN), 1);
    assert.equal(normaliseSpreadRatio(0), 1);
    assert.equal(normaliseSpreadRatio(-2), 1);
  });
});

describe('pairVoiceVolume', () => {
  it('is the level the pair needs to arrive at the level the single drone had', () => {
    const droneLevel = 0.3;
    const each = pairVoiceVolume(droneLevel);

    // Two coincident voices sum in amplitude, and a centred panner puts 1/√2 of
    // each of them into each channel. That product is the whole argument.
    const perChannel = 2 * (each / Math.SQRT2);

    assert.ok(Math.abs(perChannel - droneLevel) < 1e-12);
  });

  it('is 3 dB down per ear when the pair is panned hard apart', () => {
    // Each ear hears one voice at its full level, which is deliberately not
    // made up for: doing so would put the beat peak above the drone's level.
    assert.ok(Math.abs(pairVoiceVolume(0.3) - 0.3 / Math.SQRT2) < 1e-12);
  });

  it('is silent for a level that is not one', () => {
    assert.equal(pairVoiceVolume(Number.NaN), 0);
  });
});

describe('parseRatio', () => {
  it('reads a fraction and the decimal it comes to alike', () => {
    assert.equal(parseRatio('3/2'), 1.5);
    assert.equal(parseRatio('1.5'), 1.5);
    assert.equal(parseRatio(' 3 / 2 '), 1.5);
    assert.equal(parseRatio('1'), 1);
  });

  it('inverts a fraction written the other way up', () => {
    assert.equal(parseRatio('2/3'), 1.5);
  });

  it('clamps a fraction wider than a period', () => {
    assert.equal(parseRatio('4/1'), MAX_SPREAD_RATIO);
  });

  it('refuses anything that is not a ratio', () => {
    assert.equal(parseRatio('3/0'), null);
    assert.equal(parseRatio('x'), null);
    assert.equal(parseRatio(''), null);
    assert.equal(parseRatio('  '), null);
    assert.equal(parseRatio('-2'), null);
    assert.equal(parseRatio('3/2/4'), null);
    assert.equal(parseRatio(null), null);
  });

  it('takes a number as itself', () => {
    assert.equal(parseRatio(1.5), 1.5);
    assert.equal(parseRatio(Number.NaN), null);
  });
});
