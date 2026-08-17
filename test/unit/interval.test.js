import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  beatRate,
  centsBetween,
  describeInterval,
  nearestSimpleRatio,
} from '../../js/system/interval.js';

/** Frequencies and cents are irrational more often than not, so nothing here is exact. */
const close = (actual, expected, epsilon = 0.001) => assert.ok(
  Math.abs(actual - expected) < epsilon,
  `expected ${actual} to be within ${epsilon} of ${expected}`,
);

// A fifth as equal temperament builds it: two cents narrow of 3/2, and the
// reason criterion 2 exists.
const TEMPERED_FIFTH = 440 * Math.pow(2, 7 / 12);

describe('centsBetween', () => {
  it('measures an interval without rounding it away', () => {
    close(centsBetween(440, 660), 701.955);
    close(centsBetween(440, 880), 1200);
    close(centsBetween(440, TEMPERED_FIFTH), 700);
  });

  it('is zero for a unison and negative downward', () => {
    assert.equal(centsBetween(440, 440), 0);
    close(centsBetween(660, 440), -701.955);
  });

  it('marks a pair that is not two frequencies', () => {
    assert.equal(centsBetween(0, 440), null);
    assert.equal(centsBetween(-440, 660), null);
    assert.equal(centsBetween(Number.NaN, 440), null);
    assert.equal(centsBetween(440, Number.POSITIVE_INFINITY), null);
  });
});

describe('nearestSimpleRatio', () => {
  it('names a just interval exactly', () => {
    const fifth = nearestSimpleRatio(1.5);

    assert.equal(fifth.numerator, 3);
    assert.equal(fifth.denominator, 2);
    close(fifth.deviationCents, 0);
  });

  it('names a tempered fifth a fifth, and says how far off it is', () => {
    const fifth = nearestSimpleRatio(Math.pow(2, 7 / 12));

    assert.equal(fifth.numerator, 3);
    assert.equal(fifth.denominator, 2);
    close(fifth.deviationCents, -1.955);
  });

  it('takes the simplest ratio within tolerance, not the closest one it can find', () => {
    // 1.0125 is exactly 81/80, a syntonic comma. The right answer is a unison
    // 21 cents wide: a denominator of 80 is a restatement, not a name.
    const comma = nearestSimpleRatio(1.0125);

    assert.equal(comma.numerator, 1);
    assert.equal(comma.denominator, 1);
    close(comma.deviationCents, 21.506);
  });

  it('names a septimal tritone, which is what the tolerance buys and costs', () => {
    const tritone = nearestSimpleRatio(Math.SQRT2);

    assert.equal(tritone.numerator, 7);
    assert.equal(tritone.denominator, 5);
    close(tritone.deviationCents, 17.488);
  });

  it('does not fold an interval into a period: a tenth is 5/2, not 5/4', () => {
    const tenth = nearestSimpleRatio(2.5);

    assert.equal(tenth.numerator, 5);
    assert.equal(tenth.denominator, 2);
    close(tenth.deviationCents, 0);
  });

  it('refuses to name an interval that is near nothing simple', () => {
    // A quartertone. Nothing under a denominator of 16 is within 25 cents.
    assert.equal(nearestSimpleRatio(Math.pow(2, 50 / 1200)), null);
  });

  it('names up to the tolerance and stops past it', () => {
    // Either side of the 25-cent limit rather than exactly on it: a boundary
    // that lands on 25.000000000000004 is a fact about floating point, not
    // about what should be named.
    const justInside = nearestSimpleRatio(Math.pow(2, 24 / 1200));

    assert.equal(justInside.numerator, 1);
    assert.equal(justInside.denominator, 1);
    close(justInside.deviationCents, 24);

    assert.equal(nearestSimpleRatio(Math.pow(2, 26 / 1200)), null);
  });

  it('takes its two limits as options, since neither is a fact', () => {
    // A quartertone becomes nameable once the tolerance is wide enough to hold it.
    assert.equal(nearestSimpleRatio(Math.pow(2, 50 / 1200), { toleranceCents: 60 }).numerator, 1);

    // 7/5 is out of reach once the denominator limit is below 5.
    assert.equal(nearestSimpleRatio(Math.SQRT2, { maxDenominator: 4 }), null);
  });

  it('marks a value that is not an interval, or that arrived upside down', () => {
    assert.equal(nearestSimpleRatio(Number.NaN), null);
    assert.equal(nearestSimpleRatio(0), null);
    assert.equal(nearestSimpleRatio(0.75), null);
  });
});

describe('beatRate', () => {
  it('is silent on a just interval, however wide', () => {
    assert.equal(beatRate(440, 660, 3, 2), 0);
    assert.equal(beatRate(440, 880, 2, 1), 0);
  });

  it('is the difference between the fundamentals for a near unison', () => {
    assert.equal(beatRate(440, 444, 1, 1), 4);
  });

  it('is a multiple of the offset for anything wider — the piano tuner rule', () => {
    // A fifth widened by one hertz beats at two, because the beat is between
    // the lower tone's third harmonic and the upper tone's second.
    assert.equal(beatRate(440, 661, 3, 2), 2);
    assert.equal(beatRate(440, 662, 3, 2), 4);
  });

  it('marks a value that is not a number', () => {
    assert.equal(beatRate(440, Number.NaN, 3, 2), null);
  });
});

describe('describeInterval', () => {
  it('describes a just fifth as ringing', () => {
    const fifth = describeInterval(440, 660);

    close(fifth.ratio, 1.5);
    close(fifth.cents, 701.955);
    assert.equal(fifth.simple.numerator, 3);
    assert.equal(fifth.simple.denominator, 2);
    assert.equal(fifth.beatHz, 0);
    assert.deepEqual(fifth.partials, { lower: 3, upper: 2 });
  });

  it('describes a tempered fifth as a fifth that beats, which is the whole story', () => {
    const fifth = describeInterval(440, TEMPERED_FIFTH);

    close(fifth.cents, 700);
    assert.equal(fifth.simple.numerator, 3);
    assert.equal(fifth.simple.denominator, 2);
    close(fifth.simple.deviationCents, -1.955);
    close(fifth.beatHz, 1.49, 0.01);
    assert.equal(fifth.audible.beat, true);
  });

  it('reports the interval and its size when it has no simple name', () => {
    const quartertone = describeInterval(440, 440 * Math.pow(2, 50 / 1200));

    assert.equal(quartertone.simple, null);
    assert.equal(quartertone.beatHz, null);
    assert.equal(quartertone.partials, null);
    close(quartertone.cents, 50);
    assert.equal(quartertone.audible.beat, false);
  });

  it('knows a sine has no partials to beat with, except at a unison', () => {
    assert.equal(describeInterval(440, 660, { waveShape: 'sine' }).audible.beat, false);
    assert.equal(describeInterval(440, 660, { waveShape: 'sawtooth' }).audible.beat, true);
    assert.equal(describeInterval(440, 444, { waveShape: 'sine' }).audible.beat, true);
  });

  it('knows a beat between partials too high to hear is arithmetic, not sound', () => {
    // 16/15: the coinciding partials are the 16th and the 15th, which are far
    // too quiet to hear beating whatever the wave shape.
    const semitone = describeInterval(60, 64, { waveShape: 'sawtooth' });

    assert.deepEqual(semitone.partials, { lower: 16, upper: 15 });
    assert.equal(semitone.beatHz, 0);
    assert.equal(semitone.audible.beat, false);
  });

  it('catches the roughness the partial arithmetic misses', () => {
    // The same pair: a just 16/15 whose partials do not beat at all, and whose
    // fundamentals are four hertz apart and audibly rough.
    const semitone = describeInterval(60, 64);

    assert.equal(semitone.fundamentalsHz, 4);
    assert.equal(semitone.audible.roughness, true);
  });

  it('does not report roughness twice when it is the same number as the beat', () => {
    const unison = describeInterval(440, 444);

    assert.equal(unison.beatHz, 4);
    assert.equal(unison.fundamentalsHz, 4);
    assert.equal(unison.audible.roughness, false);
  });

  it('leaves roughness alone when the fundamentals are far apart', () => {
    assert.equal(describeInterval(440, 660).audible.roughness, false);
  });

  it('renders a unison rather than dividing by anything', () => {
    const unison = describeInterval(440, 440);

    assert.equal(unison.ratio, 1);
    assert.equal(unison.cents, 0);
    assert.equal(unison.beatHz, 0);
    assert.deepEqual(unison.partials, { lower: 1, upper: 1 });
  });

  it('refuses a pair that is not two audible frequencies', (t) => {
    t.mock.method(console, 'error', () => {});

    assert.equal(describeInterval(0, 440), null);
    assert.equal(describeInterval(-440, 660), null);
    assert.equal(describeInterval(Number.NaN, 440), null);
    assert.equal(describeInterval(440, Number.POSITIVE_INFINITY), null);
  });

  it('refuses a pair that arrived high before low, rather than flipping it', (t) => {
    const errors = t.mock.method(console, 'error', () => {});

    assert.equal(describeInterval(660, 440), null);
    assert.equal(errors.mock.callCount(), 1);
  });
});
