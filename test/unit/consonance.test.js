import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_PARTIALS,
  REFERENCE_ROUGHNESS,
  consonanceOf,
  roughnessOf,
} from '../../js/system/consonance.js';

const JUST_FIFTH = [440, 660];
const TEMPERED_FIFTH = [440, 440 * Math.pow(2, 7 / 12)];

const saw = { waveShape: 'sawtooth' };
const sine = { waveShape: 'sine' };

const SEMITONE = [440, 440 * Math.pow(2, 1 / 12)];
const JUST_TRIAD = [440, 550, 660];
const TEMPERED_TRIAD = [440, 440 * Math.pow(2, 4 / 12), 440 * Math.pow(2, 7 / 12)];

describe('roughnessOf', () => {
  it('hears a just fifth as far smoother than a semitone, though not as silence', () => {
    // A sawtooth fifth is not perfectly smooth even when it is exactly 3/2:
    // the partials that do not coincide are still a fifth apart, and at 440 Hz
    // that is inside the range where they interact a little.
    assert.ok(roughnessOf(JUST_FIFTH, saw) < roughnessOf(SEMITONE, saw) / 5);
    assert.ok(roughnessOf(JUST_FIFTH, saw) > 0);
  });

  it('hears a tempered fifth as rougher than a just one', () => {
    // Only about a fifth rougher, not an order of magnitude: a fifth two cents
    // narrow beats at 1.5 Hz, and a 1.5 Hz beat is a slow undulation rather
    // than a roughness. That is the honest reading, and it is why the interval
    // readout beside this meter is not made redundant by it.
    assert.ok(roughnessOf(TEMPERED_FIFTH, saw) > roughnessOf(JUST_FIFTH, saw));
  });

  it('hears a tempered triad as rougher than a just one, more clearly than a dyad', () => {
    // Three intervals disagreeing rather than one, which is what makes a chord
    // the case this meter is actually useful for.
    assert.ok(roughnessOf(TEMPERED_TRIAD, saw) > roughnessOf(JUST_TRIAD, saw));
  });

  it('hears a semitone as rougher than either fifth', () => {
    assert.ok(roughnessOf(SEMITONE, saw) > roughnessOf(TEMPERED_FIFTH, saw));
  });

  it('finds next to nothing between two sine tones a fifth apart', () => {
    // A sine has nothing above its fundamental, and two fundamentals that far
    // apart barely interact. The same lesson the interval readout teaches, and
    // the curve's exponential tail is why this is "next to" and not "nothing".
    assert.ok(roughnessOf(TEMPERED_FIFTH, sine) < 0.01);

    // And on a sine it cannot tell the two fifths apart at all, there being no
    // partials for the tempering to disagree in.
    assert.ok(
      Math.abs(roughnessOf(TEMPERED_FIFTH, sine) - roughnessOf(JUST_FIFTH, sine)) < 0.001,
    );
  });

  it('still hears two sines beating when they are close enough to', () => {
    assert.ok(roughnessOf([440, 448], sine) > 0.1);
  });

  it('hears a low sawtooth as rough on its own, its harmonics being crowded', () => {
    assert.ok(roughnessOf([55], saw) > 0.1);
  });

  it('hears a high sawtooth as smooth on its own, the same harmonics being spread', () => {
    assert.ok(roughnessOf([880], saw) < 0.01);
  });

  it('is silent about a single sine, which has nothing to beat against', () => {
    assert.equal(roughnessOf([440], sine), 0);
  });

  it('is silent about nothing at all', () => {
    assert.equal(roughnessOf([], saw), 0);
  });

  it('ignores frequencies that are not frequencies', () => {
    assert.equal(
      roughnessOf([440, Number.NaN, 0, -100, 660], saw),
      roughnessOf(JUST_FIFTH, saw),
    );
  });

  it('treats an unknown wave shape as one with partials, rather than as silence', () => {
    assert.equal(
      roughnessOf(TEMPERED_FIFTH, { waveShape: 'moog' }),
      roughnessOf(TEMPERED_FIFTH, saw),
    );
  });

  it('takes fewer partials when asked, and hears less with them', () => {
    assert.ok(
      roughnessOf(TEMPERED_FIFTH, { ...saw, maxPartials: 2 })
      < roughnessOf(TEMPERED_FIFTH, { ...saw, maxPartials: MAX_PARTIALS }),
    );
  });

  it('collapses two voices at one pitch, which sum rather than beat', () => {
    assert.equal(roughnessOf([440, 440], saw), roughnessOf([440], saw));
  });
});

describe('consonanceOf', () => {
  it('reports a just fifth as nearly locked', () => {
    assert.ok(consonanceOf(JUST_FIFTH, saw).smoothness > 0.85);
  });

  it('reports a tempered fifth as measurably less so', () => {
    const tempered = consonanceOf(TEMPERED_FIFTH, saw);

    assert.ok(tempered.smoothness < consonanceOf(JUST_FIFTH, saw).smoothness);
    assert.ok(tempered.smoothness > 0.5, 'a fifth is still a fifth, not a cluster');
  });

  it('measures per pair of voices, so a chord is comparable to a dyad', () => {
    // Without the mean, a just triad would read rougher than a tempered fifth
    // purely for having three intervals in it. It should read smoother.
    assert.ok(
      consonanceOf(JUST_TRIAD, saw).smoothness > consonanceOf(TEMPERED_TRIAD, saw).smoothness,
    );
    assert.ok(
      consonanceOf(JUST_TRIAD, saw).smoothness > 0.7,
      'a well-tuned triad should read as mostly locked',
    );
  });

  it('puts a semitone dyad at the bottom of the scale, being the reference', () => {
    const reference = consonanceOf([220, 220 * Math.pow(2, 1 / 12)], saw);

    assert.ok(Math.abs(reference.scaled - 1) < 1e-9);
    assert.equal(reference.smoothness, 0);
  });

  it('clamps a sonority rougher than the reference without hiding it', () => {
    // A minor third at the bottom of the bass, where a critical band is wide
    // enough to swallow it whole.
    const grinding = consonanceOf([110, 116], saw);

    assert.equal(grinding.smoothness, 0);
    assert.ok(grinding.scaled > 1, 'the raw reading should still say how far past');
  });

  it('says nothing when nothing is sounding', () => {
    assert.equal(consonanceOf([], saw), null);
    assert.equal(consonanceOf([Number.NaN, 0], saw), null);
  });

  it('counts the voices it actually weighed', () => {
    assert.equal(consonanceOf(JUST_FIFTH, saw).voiceCount, 2);
    assert.equal(consonanceOf([440, 440, 660, Number.NaN], saw).voiceCount, 2);
  });

  it('has a reference that is a real reading, not a placeholder', () => {
    assert.ok(REFERENCE_ROUGHNESS > 0);
    assert.ok(Number.isFinite(REFERENCE_ROUGHNESS));
  });
});
